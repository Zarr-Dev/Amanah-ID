"use strict";

/* =========================================================
   AMANAH ID v3.0 - SINGLE PAGE APPLICATION
   SEMUA KODE DIPERBAIKI UNTUK PASTIKAN TIDAK ADA ERROR
========================================================= */

// =========================================================
// CONFIGURATION
// =========================================================

const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/models";
const MODEL_URL_BACKUP = "https://unpkg.com/face-api.js@0.22.2/models";

const FACE_MATCH_THRESHOLD = 0.45;
const ATTENDANCE_INTERVAL = 400;
const ENROLLMENT_INTERVAL = 120;
const REQUIRED_MATCH_FRAMES = 2;
const REQUIRED_CAPTURE_FRAMES = 1;
const STABILITY_HISTORY = 3;

// =========================================================
// STATE
// =========================================================

let modelsReady = false;
let isAuthenticated = false;
let currentUser = null;
let modelLoadingStarted = false;
let modelLoadingComplete = false;
let modelLoadingRetryCount = 0;
const MAX_RETRY = 3;

let attendanceStream = null;
let enrollmentStream = null;
let attendanceTimer = null;
let enrollmentTimer = null;
let attendanceProcessing = false;
let enrollmentProcessing = false;

let currentEnrollmentDescriptor = null;
let currentEnrollmentImage = null;
let enrollmentProgress = 0;
let enrollmentReadyFrames = 0;
let stabilityHistory = [];

let attendanceMatchStudentId = null;
let attendanceMatchFrames = 0;
const attendanceCooldown = new Map();

let lastEnrollmentDetection = null;
let detectionCounter = 0;

// =========================================================
// DOM REFS - CACHE DENGAN SAFE GETTER
// =========================================================

const DOM = {};

function $(id) {
    const el = document.getElementById(id);
    if (!el) console.warn('[Amanah ID] Element not found:', id);
    return el;
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function cacheDomRefs() {
    DOM.authPage = $('authPage');
    DOM.mainApp = $('mainApp');
    DOM.loginForm = $('loginForm');
    DOM.signupForm = $('signupForm');
    DOM.loginEmail = $('loginEmail');
    DOM.loginPassword = $('loginPassword');
    DOM.signupName = $('signupName');
    DOM.signupEmail = $('signupEmail');
    DOM.signupPassword = $('signupPassword');
    DOM.signupConfirm = $('signupConfirm');
    DOM.signupAgree = $('signupAgree');
    DOM.signupButton = $('signupButton');
    DOM.termsLink = $('termsLink');
    DOM.termsModal = $('termsModal');
    DOM.termsModalClose = $('termsModalClose');
    DOM.termsModalAgree = $('termsModalAgree');
    DOM.logoutButton = $('logoutButton');
    DOM.modelLoading = $('modelLoading');
    DOM.toast = $('toast');
    
    DOM.navItems = $$(".nav-item");
    DOM.pages = $$(".page");
    
    DOM.attendanceVideo = $('attendanceVideo');
    DOM.attendanceOverlay = $('attendanceOverlay');
    DOM.attendanceStatus = $('attendanceStatus');
    DOM.attendanceError = $('attendanceError');
    DOM.attendanceCameraButton = $('attendanceCameraButton');
    DOM.fullscreenButton = $('fullscreenButton');
    DOM.welcomeMessage = $('welcomeMessage');
    
    DOM.totalStudents = $('totalStudents');
    DOM.totalPresent = $('totalPresent');
    DOM.attendancePercentage = $('attendancePercentage');
    DOM.totalHistory = $('totalHistory');
    DOM.attendanceTableBody = $('attendanceTableBody');
    DOM.emptyDatabase = $('emptyDatabase');
    
    DOM.nisnInput = $('nisn');
    DOM.studentNameInput = $('studentName');
    DOM.studentClassInput = $('studentClass');
    DOM.saveStudentButton = $('saveStudentButton');
    DOM.enrollmentVideo = $('enrollmentVideo');
    DOM.enrollmentImage = $('enrollmentImage');
    DOM.previewPlaceholder = $('previewPlaceholder');
    DOM.uploadButton = $('uploadButton');
    DOM.cameraEnrollmentButton = $('cameraEnrollmentButton');
    DOM.photoInput = $('photoInput');
    DOM.faceValidation = $('faceValidation');
    DOM.aiProgress = $('aiProgress');
    DOM.aiPercent = $('aiPercent');
    
    DOM.dbSearch = $('dbSearch');
    DOM.dbDateStart = $('dbDateStart');
    DOM.dbDateEnd = $('dbDateEnd');
    DOM.dbFilterBtn = $('dbFilterBtn');
    DOM.dbExportBtn = $('dbExportBtn');
    DOM.dbDeleteAllBtn = $('dbDeleteAllBtn');
}

// =========================================================
// AUTHENTICATION
// =========================================================

const USERS_KEY = "amanah_users_v3";

function getUsers() {
    try {
        const data = JSON.parse(localStorage.getItem(USERS_KEY));
        return Array.isArray(data) ? data : [];
    } catch { return []; }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function initDefaultAdmin() {
    const users = getUsers();
    const adminExists = users.some(u => u.email === "admin@amanahid.sch.id");
    if (!adminExists) {
        users.push({
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
            name: "Admin",
            email: "admin@amanahid.sch.id",
            password: "admin123",
            role: "admin",
            createdAt: new Date().toISOString()
        });
        saveUsers(users);
    }
}

function goToDashboard() {
    if (!DOM.authPage || !DOM.mainApp) return;
    DOM.authPage.style.display = 'none';
    DOM.mainApp.classList.add('active');
    DOM.mainApp.style.display = 'flex';
    renderDatabase();
    
    setTimeout(() => {
        if (!modelsReady && !modelLoadingStarted) {
            loadModelsBackground();
        }
    }, 500);
}

function handleAuth() {
    const savedUser = localStorage.getItem('amanah_session');

    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAuthenticated = true;
            goToDashboard();
        } catch {
            if (DOM.authPage) DOM.authPage.style.display = 'flex';
            if (DOM.mainApp) {
                DOM.mainApp.classList.remove('active');
                DOM.mainApp.style.display = 'none';
            }
        }
    } else {
        if (DOM.authPage) DOM.authPage.style.display = 'flex';
        if (DOM.mainApp) {
            DOM.mainApp.classList.remove('active');
            DOM.mainApp.style.display = 'none';
        }
    }
}

// =========================================================
// AUTH TABS - SAFE
// =========================================================

document.querySelectorAll('.auth-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(function(f) { f.classList.remove('active'); });
        var formId = this.dataset.tab === 'login' ? 'loginForm' : 'signupForm';
        var form = document.getElementById(formId);
        if (form) form.classList.add('active');
        if (this.dataset.tab === 'signup' && DOM.signupAgree) {
            DOM.signupAgree.checked = false;
            if (DOM.signupButton) DOM.signupButton.disabled = true;
        }
    });
});

// =========================================================
// CHECKBOX & TERMS - SAFE
// =========================================================

if (DOM.signupAgree) {
    DOM.signupAgree.addEventListener('change', function() {
        if (DOM.signupButton) DOM.signupButton.disabled = !this.checked;
    });
}

if (DOM.termsLink) {
    DOM.termsLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (DOM.termsModal) DOM.termsModal.style.display = 'flex';
    });
}

if (DOM.termsModalClose) {
    DOM.termsModalClose.addEventListener('click', function() {
        if (DOM.termsModal) DOM.termsModal.style.display = 'none';
    });
}

if (DOM.termsModalAgree) {
    DOM.termsModalAgree.addEventListener('click', function() {
        if (DOM.termsModal) DOM.termsModal.style.display = 'none';
        if (DOM.signupAgree) DOM.signupAgree.checked = true;
        if (DOM.signupButton) DOM.signupButton.disabled = false;
        showToast('Terima kasih telah menyetujui syarat & ketentuan.');
    });
}

if (DOM.termsModal) {
    DOM.termsModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
}

// =========================================================
// LOGIN - SAFE
// =========================================================

if (DOM.loginForm) {
    DOM.loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var email = DOM.loginEmail ? DOM.loginEmail.value.trim() : '';
        var password = DOM.loginPassword ? DOM.loginPassword.value.trim() : '';

        if (!email || !password) {
            showToast('Harap isi email dan password.');
            return;
        }

        var users = getUsers();
        var user = users.find(function(u) { return u.email === email && u.password === password; });

        if (!user) {
            showToast('Email atau password salah.');
            return;
        }

        try {
            localStorage.setItem('amanah_session', JSON.stringify(user));
            currentUser = user;
            isAuthenticated = true;
            showToast('Selamat datang, ' + user.name + '!');
            goToDashboard();
        } catch (err) {
            console.error('Login error:', err);
            showToast('Gagal login.');
        }
    });
}

// =========================================================
// SIGNUP - SAFE
// =========================================================

if (DOM.signupForm) {
    DOM.signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var name = DOM.signupName ? DOM.signupName.value.trim() : '';
        var email = DOM.signupEmail ? DOM.signupEmail.value.trim() : '';
        var password = DOM.signupPassword ? DOM.signupPassword.value.trim() : '';
        var confirm = DOM.signupConfirm ? DOM.signupConfirm.value.trim() : '';

        if (!name || !email || !password || !confirm) {
            showToast('Harap isi semua field.');
            return;
        }

        if (password.length < 6) {
            showToast('Password minimal 6 karakter.');
            return;
        }

        if (password !== confirm) {
            showToast('Password tidak cocok.');
            return;
        }

        if (DOM.signupAgree && !DOM.signupAgree.checked) {
            showToast('Harap setujui syarat & ketentuan.');
            return;
        }

        var users = getUsers();
        if (users.some(function(u) { return u.email === email; })) {
            showToast('Email sudah terdaftar.');
            return;
        }

        var newUser = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
            name: name,
            email: email,
            password: password,
            role: 'user',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);
        
        showToast('Akun berhasil dibuat! Silakan login.');
        
        if (DOM.signupName) DOM.signupName.value = '';
        if (DOM.signupEmail) DOM.signupEmail.value = '';
        if (DOM.signupPassword) DOM.signupPassword.value = '';
        if (DOM.signupConfirm) DOM.signupConfirm.value = '';
        if (DOM.signupAgree) DOM.signupAgree.checked = false;
        if (DOM.signupButton) DOM.signupButton.disabled = true;
        
        document.querySelector('.auth-tab[data-tab="login"]')?.click();
        if (DOM.loginEmail) DOM.loginEmail.value = email;
        if (DOM.loginPassword) DOM.loginPassword.value = '';
    });
}

// =========================================================
// LOGOUT - SAFE
// =========================================================

if (DOM.logoutButton) {
    DOM.logoutButton.addEventListener('click', function() {
        localStorage.removeItem('amanah_session');
        isAuthenticated = false;
        currentUser = null;
        if (DOM.mainApp) {
            DOM.mainApp.classList.remove('active');
            DOM.mainApp.style.display = 'none';
        }
        if (DOM.authPage) DOM.authPage.style.display = 'flex';
        stopAttendanceCamera();
        stopEnrollmentCamera();
        showToast('Berhasil keluar.');
    });
}

// =========================================================
// STORAGE
// =========================================================

var STUDENTS_KEY = "amanah_students_v3";
var ATTENDANCE_KEY = "amanah_attendance_v3";

function getStudents() {
    try {
        var data = JSON.parse(localStorage.getItem(STUDENTS_KEY));
        return Array.isArray(data) ? data : [];
    } catch { return []; }
}

function saveStudents(students) {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

function getAttendance() {
    try {
        var data = JSON.parse(localStorage.getItem(ATTENDANCE_KEY));
        return Array.isArray(data) ? data : [];
    } catch { return []; }
}

function saveAttendance(attendance) {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));
}

// =========================================================
// UTILITIES
// =========================================================

var toastTimer = null;

function showToast(message) {
    if (!DOM.toast) return;
    DOM.toast.textContent = message;
    DOM.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { 
        if (DOM.toast) DOM.toast.classList.remove("show"); 
    }, 2600);
}

function escapeHTML(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getLocalDate() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, "0") + '-' + String(now.getDate()).padStart(2, "0");
}

// =========================================================
// NAVIGATION - SAFE
// =========================================================

if (DOM.navItems) {
    DOM.navItems.forEach(function(button) {
        button.addEventListener("click", function() {
            if (button.id === 'logoutButton') return;
            var pageId = button.dataset.page;
            DOM.navItems.forEach(function(item) { item.classList.remove("active"); });
            button.classList.add("active");
            DOM.pages.forEach(function(page) { page.classList.remove("active"); });
            var targetPage = document.getElementById(pageId);
            if (targetPage) targetPage.classList.add("active");
            if (pageId !== "attendancePage") stopAttendanceCamera();
            if (pageId !== "formPage") stopEnrollmentCamera();
            if (pageId === "databasePage") renderDatabase();
        });
    });
}

// =========================================================
// LOAD MODELS
// =========================================================

function loadModelsBackground() {
    if (modelLoadingStarted || modelLoadingComplete) return;
    modelLoadingStarted = true;
    
    let loadingTimeout = setTimeout(() => {
        if (!modelsReady && !modelLoadingComplete && DOM.modelLoading) {
            DOM.modelLoading.style.display = 'flex';
        }
    }, 2000);
    
    if (typeof faceapi === 'undefined') {
        console.error("[Amanah ID] face-api.js not loaded");
        modelLoadingStarted = false;
        clearTimeout(loadingTimeout);
        setTimeout(() => {
            if (!modelsReady && !modelLoadingComplete) {
                loadModelsBackground();
            }
        }, 2000);
        return;
    }

    console.log("[Amanah ID] Loading models...");
    
    var loadTimeout = setTimeout(() => {
        console.log("[Amanah ID] Model loading timeout");
        modelLoadingStarted = false;
        clearTimeout(loadingTimeout);
        if (DOM.modelLoading) DOM.modelLoading.style.display = 'none';
        modelLoadingRetryCount++;
        if (modelLoadingRetryCount < MAX_RETRY) {
            setTimeout(() => {
                if (!modelsReady && !modelLoadingComplete) {
                    loadModelsBackground();
                }
            }, 3000);
        } else {
            showToast('AI gagal dimuat, gunakan fitur offline.');
        }
    }, 8000);

    loadModelsAsync(loadTimeout, loadingTimeout);
}

async function loadModelsAsync(loadTimeout, loadingTimeout) {
    try {
        await Promise.race([
            Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]),
            new Promise(function(_, reject) {
                setTimeout(function() { reject(new Error('Timeout')); }, 8000);
            })
        ]);
        
        modelsReady = true;
        modelLoadingComplete = true;
        clearTimeout(loadTimeout);
        clearTimeout(loadingTimeout);
        if (DOM.modelLoading) DOM.modelLoading.style.display = 'none';
        console.log("[Amanah ID] AI models ready!");
        updateSaveButton();
        showToast('AI siap digunakan!');
    } catch (error) {
        console.error("[Amanah ID] Model load error:", error);
        try {
            await Promise.race([
                Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL_BACKUP),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL_BACKUP),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL_BACKUP)
                ]),
                new Promise(function(_, reject) {
                    setTimeout(function() { reject(new Error('Timeout')); }, 8000);
                })
            ]);
            
            modelsReady = true;
            modelLoadingComplete = true;
            clearTimeout(loadTimeout);
            clearTimeout(loadingTimeout);
            if (DOM.modelLoading) DOM.modelLoading.style.display = 'none';
            console.log("[Amanah ID] AI models ready from backup!");
            updateSaveButton();
            showToast('AI siap digunakan!');
        } catch (backupError) {
            console.error("[Amanah ID] Backup also failed:", backupError);
            clearTimeout(loadTimeout);
            clearTimeout(loadingTimeout);
            if (DOM.modelLoading) DOM.modelLoading.style.display = 'none';
            modelLoadingStarted = false;
            modelLoadingRetryCount++;
            if (modelLoadingRetryCount < MAX_RETRY) {
                setTimeout(() => {
                    if (!modelsReady && !modelLoadingComplete) {
                        loadModelsBackground();
                    }
                }, 5000);
            }
        }
    }
}

// =========================================================
// CAMERA
// =========================================================

async function requestCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser tidak mendukung getUserMedia.");
    }
    return navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user",
            width: { ideal: 480 },
            height: { ideal: 360 },
            frameRate: { ideal: 24, max: 30 }
        },
        audio: false
    });
}

// =========================================================
// ATTENDANCE CAMERA
// =========================================================

async function startAttendanceCamera() {
    if (!modelsReady) {
        showToast("AI sedang disiapkan...");
        if (!modelLoadingStarted) {
            loadModelsBackground();
        }
        setTimeout(() => {
            if (modelsReady) {
                startAttendanceCamera();
            } else {
                showToast("AI masih disiapkan, coba lagi.");
            }
        }, 2000);
        return;
    }
    
    try {
        stopAttendanceCamera();
        if (DOM.attendanceError) DOM.attendanceError.classList.remove("show");
        if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = "Mengaktifkan kamera...";
        attendanceStream = await requestCamera();
        if (DOM.attendanceVideo) {
            DOM.attendanceVideo.srcObject = attendanceStream;
            await DOM.attendanceVideo.play();
        }
        if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = "Mencari wajah...";
        if (DOM.attendanceCameraButton) DOM.attendanceCameraButton.title = "Matikan kamera";
        startAttendanceLoop();
    } catch (error) {
        console.error("[Attendance Camera]", error);
        if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = "Kamera tidak tersedia";
        if (DOM.attendanceError) DOM.attendanceError.classList.add("show");
        showToast("Kamera gagal diakses.");
    }
}

function stopAttendanceCamera() {
    if (attendanceTimer) { clearInterval(attendanceTimer); attendanceTimer = null; }
    if (attendanceStream) {
        attendanceStream.getTracks().forEach(function(track) { track.stop(); });
        attendanceStream = null;
    }
    if (DOM.attendanceVideo) DOM.attendanceVideo.srcObject = null;
    if (DOM.attendanceOverlay) DOM.attendanceOverlay.innerHTML = "";
    if (DOM.welcomeMessage) DOM.welcomeMessage.classList.remove("show");
    if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = "Kamera belum aktif";
    if (DOM.attendanceCameraButton) DOM.attendanceCameraButton.title = "Aktifkan kamera";
    attendanceProcessing = false;
    attendanceMatchStudentId = null;
    attendanceMatchFrames = 0;
}

function startAttendanceLoop() {
    if (attendanceTimer) clearInterval(attendanceTimer);
    attendanceTimer = setInterval(processAttendanceFrame, ATTENDANCE_INTERVAL);
}

// =========================================================
// ATTENDANCE PROCESSING
// =========================================================

async function processAttendanceFrame() {
    if (attendanceProcessing || !modelsReady || !attendanceStream || !DOM.attendanceVideo || DOM.attendanceVideo.readyState < 2) return;
    attendanceProcessing = true;

    try {
        const detections = await faceapi.detectAllFaces(
            DOM.attendanceVideo,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.50 })
        ).withFaceLandmarks().withFaceDescriptors();

        if (DOM.attendanceOverlay) DOM.attendanceOverlay.innerHTML = "";

        if (detections.length === 0) {
            if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = "Mencari wajah...";
            if (DOM.welcomeMessage) DOM.welcomeMessage.classList.remove("show");
            attendanceMatchStudentId = null;
            attendanceMatchFrames = 0;
            return;
        }

        var students = getStudents();
        var faceResults = detections.map(function(detection) {
            var match = findBestMatch(detection.descriptor, students);
            return { detection: detection, match: match };
        });

        for (var i = 0; i < faceResults.length; i++) {
            var result = faceResults[i];
            var recognized = Boolean(result.match && result.match.distance <= FACE_MATCH_THRESHOLD);
            createFaceOutline(result.detection.detection.box, recognized);
        }

        var recognizedFaces = faceResults.filter(function(result) {
            return result.match && result.match.distance <= FACE_MATCH_THRESHOLD;
        });

        if (recognizedFaces.length === 0) {
            if (DOM.attendanceStatus) {
                DOM.attendanceStatus.textContent = detections.length === 1 ? "Wajah terdeteksi, belum cocok" : detections.length + " wajah, tidak ada identitas cocok";
            }
            if (DOM.welcomeMessage) DOM.welcomeMessage.classList.remove("show");
            attendanceMatchStudentId = null;
            attendanceMatchFrames = 0;
            return;
        }

        recognizedFaces.sort(function(a, b) { return a.match.distance - b.match.distance; });
        var best = recognizedFaces[0];
        var student = best.match.student;

        if (attendanceMatchStudentId === student.id) {
            attendanceMatchFrames += 1;
        } else {
            attendanceMatchStudentId = student.id;
            attendanceMatchFrames = 1;
        }

        if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = student.name + " terdeteksi";

        if (attendanceMatchFrames >= REQUIRED_MATCH_FRAMES) {
            if (DOM.welcomeMessage) {
                DOM.welcomeMessage.textContent = "Selamat datang, " + student.name + "!";
                DOM.welcomeMessage.classList.add("show");
            }
            registerAttendance(student, best.match.distance);
        } else {
            if (DOM.welcomeMessage) DOM.welcomeMessage.classList.remove("show");
        }
    } catch (error) {
        console.error("[Attendance Detection]", error);
    } finally {
        attendanceProcessing = false;
    }
}

// =========================================================
// FACE OUTLINE
// =========================================================

function createFaceOutline(box, recognized) {
    if (!DOM.attendanceVideo || !DOM.attendanceVideo.videoWidth || !DOM.attendanceVideo.videoHeight) return;
    if (!DOM.attendanceOverlay) return;
    var outline = document.createElement("div");
    outline.className = recognized ? "face-outline recognized" : "face-outline";
    var mapped = mapVideoBox(box, DOM.attendanceVideo, true);
    outline.style.cssText = 'left:' + mapped.x + 'px;top:' + mapped.y + 'px;width:' + mapped.width + 'px;height:' + mapped.height + 'px;';
    DOM.attendanceOverlay.appendChild(outline);
}

function mapVideoBox(box, video, mirrored) {
    var videoWidth = video.videoWidth;
    var videoHeight = video.videoHeight;
    var containerWidth = video.clientWidth;
    var containerHeight = video.clientHeight;
    var scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
    var renderedWidth = videoWidth * scale;
    var renderedHeight = videoHeight * scale;
    var offsetX = (containerWidth - renderedWidth) / 2;
    var offsetY = (containerHeight - renderedHeight) / 2;
    var x = offsetX + box.x * scale;
    if (mirrored) {
        x = containerWidth - (offsetX + (box.x + box.width) * scale);
    }
    return { x: x, y: offsetY + box.y * scale, width: box.width * scale, height: box.height * scale };
}

// =========================================================
// MATCHING
// =========================================================

function findBestMatch(descriptor, students) {
    var bestStudent = null;
    var bestDistance = Infinity;

    for (var i = 0; i < students.length; i++) {
        var student = students[i];
        if (!Array.isArray(student.descriptor) || student.descriptor.length !== descriptor.length) continue;
        var distance = faceapi.euclideanDistance(descriptor, new Float32Array(student.descriptor));
        if (distance < bestDistance) {
            bestDistance = distance;
            bestStudent = student;
        }
    }

    if (!bestStudent) return null;
    return { student: bestStudent, distance: bestDistance };
}

// =========================================================
// ATTENDANCE REGISTER
// =========================================================

function registerAttendance(student, distance) {
    var attendance = getAttendance();
    var today = getLocalDate();
    var existing = attendance.find(function(item) { return item.nisn === student.nisn && item.date === today; });
    if (existing) return;

    var currentTime = Date.now();
    var previous = attendanceCooldown.get(student.id);
    if (previous && currentTime - previous < 5000) return;
    attendanceCooldown.set(student.id, currentTime);

    var confidence = Math.max(0, Math.min(100, (1 - distance) * 100));
    var record = {
        id: createId(),
        nisn: student.nisn,
        name: student.name,
        className: student.className,
        status: "Hadir",
        date: today,
        timestamp: new Date().toISOString(),
        method: "Face Recognition",
        confidence: confidence
    };

    attendance.unshift(record);
    saveAttendance(attendance);
    renderDatabase();
    showToast(student.name + " berhasil presensi!");
}

// =========================================================
// ENROLLMENT CAMERA
// =========================================================

async function startEnrollmentCamera() {
    if (!modelsReady) {
        showToast("AI sedang disiapkan...");
        if (!modelLoadingStarted) {
            loadModelsBackground();
        }
        setTimeout(() => {
            if (modelsReady) {
                startEnrollmentCamera();
            } else {
                showToast("AI masih disiapkan, coba lagi.");
            }
        }, 2000);
        return;
    }
    
    try {
        stopEnrollmentCamera();
        resetEnrollmentState();
        clearEnrollmentImage();
        enrollmentStream = await requestCamera();
        if (DOM.enrollmentVideo) {
            DOM.enrollmentVideo.srcObject = enrollmentStream;
            DOM.enrollmentVideo.classList.add("active");
        }
        if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = "none";
        if (DOM.enrollmentVideo) await waitForVideoReady(DOM.enrollmentVideo);
        setValidation("Kamera aktif. Posisikan wajah di tengah.", true);
        startEnrollmentLoop();
    } catch (error) {
        console.error("[Enrollment Camera]", error);
        setValidation(getCameraErrorMessage(error), false);
        showToast("Kamera formulir gagal dibuka.");
    }
}

function stopEnrollmentCamera() {
    if (enrollmentTimer) { clearInterval(enrollmentTimer); enrollmentTimer = null; }
    if (enrollmentStream) {
        enrollmentStream.getTracks().forEach(function(track) { track.stop(); });
        enrollmentStream = null;
    }
    if (DOM.enrollmentVideo) {
        DOM.enrollmentVideo.pause();
        DOM.enrollmentVideo.srcObject = null;
        DOM.enrollmentVideo.classList.remove("active");
    }
    enrollmentProcessing = false;
    stabilityHistory = [];
    enrollmentReadyFrames = 0;
    lastEnrollmentDetection = null;
    detectionCounter = 0;
}

function clearEnrollmentImage() {
    currentEnrollmentDescriptor = null;
    currentEnrollmentImage = null;
    if (DOM.enrollmentImage) {
        DOM.enrollmentImage.src = "";
        DOM.enrollmentImage.classList.remove("active", "has-image");
    }
    var replaceBtn = document.getElementById('replaceImageBtn');
    if (replaceBtn) replaceBtn.remove();
    if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = "flex";
    resetEnrollmentState();
    updateSaveButton();
}

function waitForVideoReady(video) {
    return new Promise(function(resolve) {
        if (video.readyState >= 2) { resolve(); return; }
        var handler = function() {
            video.removeEventListener("loadedmetadata", handler);
            resolve();
        };
        video.addEventListener("loadedmetadata", handler);
    });
}

function startEnrollmentLoop() {
    if (enrollmentTimer) clearInterval(enrollmentTimer);
    enrollmentTimer = setInterval(processEnrollmentFrame, ENROLLMENT_INTERVAL);
}

// =========================================================
// ENROLLMENT PROCESSING
// =========================================================

async function processEnrollmentFrame() {
    if (enrollmentProcessing || !enrollmentStream || !DOM.enrollmentVideo || DOM.enrollmentVideo.readyState < 2) return;
    enrollmentProcessing = true;
    detectionCounter++;

    try {
        var detections = await faceapi.detectAllFaces(
            DOM.enrollmentVideo,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.45 })
        ).withFaceLandmarks().withFaceDescriptors();

        if (detections.length === 0) {
            enrollmentReadyFrames = 0;
            lastEnrollmentDetection = null;
            updateEnrollmentProgress(0);
            setValidation("Wajah belum terdeteksi.", false);
            return;
        }

        if (detections.length > 1) {
            enrollmentReadyFrames = 0;
            lastEnrollmentDetection = null;
            updateEnrollmentProgress(5);
            setValidation("Hanya satu wajah yang boleh berada di kamera.", false);
            return;
        }

        var detection = detections[0];
        var box = detection.detection.box;
        var width = DOM.enrollmentVideo.videoWidth;
        var height = DOM.enrollmentVideo.videoHeight;
        lastEnrollmentDetection = detection;

        var faceArea = (box.width * box.height) / (width * height);
        var sizeScore = 0;
        if (faceArea >= 0.05 && faceArea <= 0.50) {
            sizeScore = 90 + (1 - Math.abs(faceArea - 0.20) * 100);
        } else if (faceArea > 0.50 && faceArea <= 0.70) {
            sizeScore = 65 - (faceArea - 0.50) * 120;
        } else if (faceArea >= 0.025 && faceArea < 0.05) {
            sizeScore = 45 + (faceArea - 0.025) * 600;
        } else {
            sizeScore = Math.max(0, 100 - Math.abs(faceArea - 0.20) * 200);
        }
        sizeScore = clamp(sizeScore, 0, 100);

        var faceCenterX = box.x + box.width / 2;
        var faceCenterY = box.y + box.height / 2;
        var frameCenterX = width / 2;
        var frameCenterY = height / 2;
        var dist = Math.hypot((faceCenterX - frameCenterX) / width, (faceCenterY - frameCenterY) / height);
        var centerScore = clamp(100 - (dist * 250), 0, 100);

        var lightScore = 80;
        if (detectionCounter % 3 === 0) {
            var brightness = calculateBrightness(DOM.enrollmentVideo);
            lightScore = calculateLightScore(brightness);
        }

        stabilityHistory.push({ x: faceCenterX, y: faceCenterY, width: box.width, height: box.height });
        if (stabilityHistory.length > STABILITY_HISTORY) stabilityHistory.shift();

        var stabilityScore = 50;
        if (stabilityHistory.length >= STABILITY_HISTORY) {
            var first = stabilityHistory[0];
            var last = stabilityHistory[stabilityHistory.length - 1];
            var movement = Math.hypot(last.x - first.x, last.y - first.y);
            var sizeMovement = Math.abs(last.width - first.width);
            stabilityScore = clamp(100 - (movement * 0.5) - (sizeMovement * 0.4), 0, 100);
        }

        var finalScore = (sizeScore * 0.30 + centerScore * 0.30 + lightScore * 0.15 + stabilityScore * 0.25);

        if (finalScore > enrollmentProgress) {
            enrollmentProgress = enrollmentProgress * 0.30 + finalScore * 0.70;
        } else {
            enrollmentProgress = enrollmentProgress * 0.50 + finalScore * 0.50;
        }

        if (finalScore >= 80 && sizeScore >= 70 && centerScore >= 75) {
            enrollmentProgress = Math.min(100, enrollmentProgress + 20);
        }

        enrollmentProgress = clamp(enrollmentProgress, 0, 100);
        updateEnrollmentProgress(enrollmentProgress);

        var ready = finalScore >= 75 && faceArea >= 0.04 && faceArea <= 0.65 && centerScore >= 70 && stabilityScore >= 60;

        if (ready && enrollmentProgress >= 80) {
            enrollmentReadyFrames += 1;
        } else {
            enrollmentReadyFrames = 0;
        }

        if (enrollmentProgress < 25) setValidation("Mendeteksi wajah...", true);
        else if (enrollmentProgress < 50) setValidation("Analisis kualitas...", true);
        else if (enrollmentProgress < 75) setValidation("Pertahankan posisi...", true);
        else if (enrollmentProgress < 100) setValidation("Hampir selesai...", true);
        else setValidation("Siap!", true);

        if (enrollmentProgress >= 100 && enrollmentReadyFrames >= REQUIRED_CAPTURE_FRAMES) {
            await captureEnrollment(detection);
        }
    } catch (error) {
        console.error("[Enrollment Detection]", error);
    } finally {
        enrollmentProcessing = false;
    }
}

// =========================================================
// ENROLLMENT HELPERS
// =========================================================

function calculateBrightness(video) {
    var canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 6;
    var context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return 128;
    context.drawImage(video, 0, 0, 8, 6);
    var image = context.getImageData(0, 0, 8, 6);
    var sum = 0;
    for (var i = 0; i < image.data.length; i += 4) {
        sum += (0.299 * image.data[i]) + (0.587 * image.data[i + 1]) + (0.114 * image.data[i + 2]);
    }
    return sum / (image.data.length / 4);
}

function calculateLightScore(brightness) {
    if (brightness >= 50 && brightness <= 220) {
        return 100 - Math.abs(brightness - 130) * 0.3;
    } else if (brightness < 50) {
        return clamp(brightness / 50 * 100, 0, 100);
    } else {
        return clamp(100 - (brightness - 220) / 40 * 100, 0, 100);
    }
}

function updateEnrollmentProgress(value) {
    enrollmentProgress = clamp(value, 0, 100);
    var percentage = Math.round(enrollmentProgress);
    if (DOM.aiProgress) DOM.aiProgress.style.width = percentage + '%';
    if (DOM.aiPercent) DOM.aiPercent.textContent = percentage + '%';
}

function setValidation(message, success) {
    if (!DOM.faceValidation) return;
    DOM.faceValidation.textContent = message;
    DOM.faceValidation.className = "validation-message";
    if (message) {
        DOM.faceValidation.classList.add(success ? "success" : "error");
    }
}

function resetEnrollmentState() {
    enrollmentProgress = 0;
    enrollmentReadyFrames = 0;
    stabilityHistory = [];
    lastEnrollmentDetection = null;
    detectionCounter = 0;
    updateEnrollmentProgress(0);
    setValidation("", true);
}

// =========================================================
// CAPTURE ENROLLMENT
// =========================================================

async function captureEnrollment(detection) {
    stopEnrollmentCamera();
    var canvas = document.createElement("canvas");
    canvas.width = DOM.enrollmentVideo.videoWidth;
    canvas.height = DOM.enrollmentVideo.videoHeight;
    var context = canvas.getContext("2d");
    if (!context) { setValidation("Gagal memproses gambar.", false); return; }
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(DOM.enrollmentVideo, 0, 0, canvas.width, canvas.height);
    var imageData = canvas.toDataURL("image/jpeg", 0.90);

    currentEnrollmentDescriptor = Array.from(detection.descriptor);
    currentEnrollmentImage = imageData;

    if (DOM.enrollmentImage) {
        DOM.enrollmentImage.src = imageData;
        DOM.enrollmentImage.classList.add("active", "has-image");
    }
    if (DOM.enrollmentVideo) DOM.enrollmentVideo.classList.remove("active");
    if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = "none";
    addReplaceButton();

    updateEnrollmentProgress(100);
    setValidation("Foto wajah berhasil diverifikasi!", true);
    updateSaveButton();
    showToast("Wajah berhasil ditangkap!");
}

function addReplaceButton() {
    var oldBtn = document.getElementById('replaceImageBtn');
    if (oldBtn) oldBtn.remove();
    var replaceBtn = document.createElement('button');
    replaceBtn.id = 'replaceImageBtn';
    replaceBtn.className = 'replace-image-btn';
    replaceBtn.innerHTML = 'Ganti Foto';
    replaceBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        clearEnrollmentImage();
        showToast('Foto dihapus. Silakan ambil foto baru.');
    });
    var preview = document.getElementById('enrollmentPreview');
    if (preview) { preview.style.position = 'relative'; preview.appendChild(replaceBtn); }
}

// =========================================================
// UPLOAD IMAGE
// =========================================================

if (DOM.uploadButton) {
    DOM.uploadButton.addEventListener("click", function() { 
        if (DOM.photoInput) DOM.photoInput.click(); 
    });
}

if (DOM.photoInput) {
    DOM.photoInput.addEventListener("change", async function(event) {
        var file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setValidation("File bukan gambar.", false);
            return;
        }

        if (!modelsReady) {
            setValidation("AI sedang disiapkan, tunggu sebentar...", false);
            if (!modelLoadingStarted) {
                loadModelsBackground();
            }
            setTimeout(() => {
                if (modelsReady) {
                    showToast("AI siap, upload ulang foto.");
                }
            }, 3000);
            return;
        }

        try {
            stopEnrollmentCamera();
            resetEnrollmentState();
            var image = await faceapi.bufferToImage(file);
            if (DOM.enrollmentImage) {
                DOM.enrollmentImage.src = image.src;
                DOM.enrollmentImage.classList.add("active", "has-image");
            }
            if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = "none";

            var detections = await faceapi.detectAllFaces(
                image,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.45 })
            ).withFaceLandmarks().withFaceDescriptors();

            if (detections.length === 0) {
                setValidation("Foto ditolak: wajah tidak ditemukan.", false);
                clearEnrollmentImage();
                showToast("Wajah tidak terdeteksi di foto.");
                return;
            }

            if (detections.length > 1) {
                setValidation("Foto ditolak: lebih dari satu wajah.", false);
                clearEnrollmentImage();
                showToast("Deteksi lebih dari satu wajah.");
                return;
            }

            var detection = detections[0];
            var box = detection.detection.box;
            var areaRatio = (box.width * box.height) / (image.width * image.height);

            if (areaRatio < 0.025) {
                setValidation("Wajah terlalu kecil dalam foto.", false);
                clearEnrollmentImage();
                return;
            }

            currentEnrollmentDescriptor = Array.from(detection.descriptor);
            currentEnrollmentImage = image.src;
            updateEnrollmentProgress(100);
            setValidation("Foto diterima. Wajah berhasil dianalisis.", true);
            addReplaceButton();
            updateSaveButton();
        } catch (error) {
            console.error("[Upload Image]", error);
            setValidation("Foto gagal dianalisis.", false);
            clearEnrollmentImage();
        } finally {
            if (DOM.photoInput) DOM.photoInput.value = "";
        }
    });
}

// =========================================================
// FORM VALIDATION
// =========================================================

if (DOM.nisnInput && DOM.studentNameInput && DOM.studentClassInput) {
    [DOM.nisnInput, DOM.studentNameInput, DOM.studentClassInput].forEach(function(input) {
        input.addEventListener("input", updateSaveButton);
    });
}

function updateSaveButton() {
    if (!DOM.saveStudentButton) return;
    var nisn = DOM.nisnInput ? DOM.nisnInput.value.trim() : '';
    var name = DOM.studentNameInput ? DOM.studentNameInput.value.trim() : '';
    var className = DOM.studentClassInput ? DOM.studentClassInput.value.trim() : '';
    DOM.saveStudentButton.disabled = !(
        modelsReady &&
        /^\d+$/.test(nisn) &&
        nisn.length >= 4 &&
        name.length >= 2 &&
        className.length >= 1 &&
        Array.isArray(currentEnrollmentDescriptor) &&
        currentEnrollmentDescriptor.length > 0
    );
}

// =========================================================
// SAVE STUDENT
// =========================================================

if (DOM.saveStudentButton) {
    DOM.saveStudentButton.addEventListener("click", function() {
        var nisn = DOM.nisnInput ? DOM.nisnInput.value.trim() : '';
        var name = DOM.studentNameInput ? DOM.studentNameInput.value.trim() : '';
        var className = DOM.studentClassInput ? DOM.studentClassInput.value.trim() : '';

        if (!/^\d+$/.test(nisn)) { showToast("NISN hanya boleh berisi angka."); return; }
        if (name.length < 2) { showToast("Nama siswa belum valid."); return; }
        if (!className) { showToast("Kelas belum diisi."); return; }
        if (!currentEnrollmentDescriptor) { showToast("Wajah belum diverifikasi."); return; }

        var students = getStudents();
        if (students.find(function(s) { return s.nisn === nisn; })) {
            showToast("NISN tersebut sudah terdaftar.");
            return;
        }

        var student = {
            id: createId(),
            nisn: nisn,
            name: name,
            className: className,
            descriptor: currentEnrollmentDescriptor,
            registeredAt: new Date().toISOString()
        };

        students.push(student);
        saveStudents(students);

        if (DOM.nisnInput) DOM.nisnInput.value = "";
        if (DOM.studentNameInput) DOM.studentNameInput.value = "";
        if (DOM.studentClassInput) DOM.studentClassInput.value = "";
        currentEnrollmentDescriptor = null;
        currentEnrollmentImage = null;
        if (DOM.enrollmentImage) {
            DOM.enrollmentImage.src = "";
            DOM.enrollmentImage.classList.remove("active", "has-image");
        }
        var replaceBtn = document.getElementById('replaceImageBtn');
        if (replaceBtn) replaceBtn.remove();
        if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = "flex";
        resetEnrollmentState();
        updateSaveButton();
        renderDatabase();
        showToast(name + " berhasil didaftarkan!");
    });
}

// =========================================================
// DATABASE RENDER
// =========================================================

var filteredData = [];

function renderDatabase() {
    if (!DOM.totalStudents || !DOM.totalPresent || !DOM.attendancePercentage || !DOM.totalHistory) return;
    
    var students = getStudents();
    var attendance = getAttendance();
    var today = getLocalDate();
    var todayAttendance = attendance.filter(function(item) { return item.date === today; });

    DOM.totalStudents.textContent = students.length;
    DOM.totalPresent.textContent = todayAttendance.length;
    DOM.totalHistory.textContent = attendance.length;

    var percentage = students.length > 0 ? Math.round((todayAttendance.length / students.length) * 100) : 0;
    DOM.attendancePercentage.textContent = Math.min(percentage, 100) + '%';

    var searchTerm = DOM.dbSearch ? DOM.dbSearch.value.toLowerCase().trim() : '';
    var startDate = DOM.dbDateStart ? DOM.dbDateStart.value : '';
    var endDate = DOM.dbDateEnd ? DOM.dbDateEnd.value : '';

    filteredData = attendance.filter(function(item) {
        var match = true;
        if (searchTerm) {
            match = match && (
                item.nisn.toLowerCase().includes(searchTerm) ||
                item.name.toLowerCase().includes(searchTerm) ||
                item.className.toLowerCase().includes(searchTerm)
            );
        }
        if (startDate && endDate) {
            match = match && item.date >= startDate && item.date <= endDate;
        } else if (startDate) {
            match = match && item.date >= startDate;
        } else if (endDate) {
            match = match && item.date <= endDate;
        }
        return match;
    });

    if (DOM.attendanceTableBody) DOM.attendanceTableBody.innerHTML = "";

    if (filteredData.length === 0) {
        if (DOM.emptyDatabase) DOM.emptyDatabase.style.display = "block";
        return;
    }

    if (DOM.emptyDatabase) DOM.emptyDatabase.style.display = "none";

    filteredData.forEach(function(item, index) {
        var date = new Date(item.timestamp);
        var dateText = date.toLocaleDateString("id-ID");
        var timeText = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        var row = document.createElement("tr");
        row.innerHTML = 
            '<td>' + (index + 1) + '</td>' +
            '<td><strong>' + escapeHTML(item.nisn) + '</strong></td>' +
            '<td>' + escapeHTML(item.name) + '</td>' +
            '<td>' + escapeHTML(item.className) + '</td>' +
            '<td><span class="status-pill"><span class="status-dot"></span>' + escapeHTML(item.status) + '</span></td>' +
            '<td>' + dateText + '</td>' +
            '<td>' + timeText + '</td>' +
            '<td>' + escapeHTML(item.method) + '</td>' +
            '<td>' + Number(item.confidence).toFixed(1) + '%</td>' +
            '<td><div class="row-actions"><button class="row-action-btn" data-id="' + item.id + '" title="Hapus"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button></div></td>';
        if (DOM.attendanceTableBody) DOM.attendanceTableBody.appendChild(row);
    });

    document.querySelectorAll('.row-action-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.dataset.id;
            showDeleteConfirm(id);
        });
    });
}

// =========================================================
// DELETE FUNCTIONS
// =========================================================

function showDeleteConfirm(id) {
    var oldDialog = document.getElementById('deleteDialog');
    if (oldDialog) oldDialog.remove();

    var dialog = document.createElement('div');
    dialog.id = 'deleteDialog';
    dialog.className = 'delete-dialog-overlay';
    dialog.innerHTML = 
        '<div class="delete-dialog">' +
            '<div class="delete-dialog-icon">🗑️</div>' +
            '<h3>Hapus Data Presensi</h3>' +
            '<p>Apakah Anda yakin ingin menghapus data ini?</p>' +
            '<p class="delete-dialog-sub">Tindakan ini tidak dapat dibatalkan.</p>' +
            '<div class="delete-dialog-actions">' +
                '<button class="delete-cancel-btn">Batal</button>' +
                '<button class="delete-confirm-btn" data-id="' + id + '">Hapus</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(dialog);

    dialog.querySelector('.delete-cancel-btn').addEventListener('click', function() {
        dialog.remove();
    });

    dialog.querySelector('.delete-confirm-btn').addEventListener('click', function() {
        var id = this.dataset.id;
        deleteAttendanceRecord(id);
        dialog.remove();
    });

    dialog.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
}

function deleteAttendanceRecord(id) {
    var attendance = getAttendance();
    var record = attendance.find(function(item) { return item.id === id; });
    if (!record) {
        showToast('Data tidak ditemukan.');
        return;
    }
    
    attendance = attendance.filter(function(item) { return item.id !== id; });
    saveAttendance(attendance);
    renderDatabase();
    showToast('Data presensi ' + record.name + ' telah dihapus.');
}

function deleteAllAttendance() {
    var oldDialog = document.getElementById('deleteDialog');
    if (oldDialog) oldDialog.remove();

    var dialog = document.createElement('div');
    dialog.id = 'deleteDialog';
    dialog.className = 'delete-dialog-overlay';
    dialog.innerHTML = 
        '<div class="delete-dialog delete-all-dialog">' +
            '<div class="delete-dialog-icon">⚠️</div>' +
            '<h3>Hapus Semua Data?</h3>' +
            '<p>Anda akan menghapus <strong>SEMUA</strong> data presensi.</p>' +
            '<p class="delete-dialog-sub">Tindakan ini tidak dapat dibatalkan!</p>' +
            '<div class="delete-dialog-actions">' +
                '<button class="delete-cancel-btn">Batal</button>' +
                '<button class="delete-confirm-btn delete-all-btn">Hapus Semua</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(dialog);

    dialog.querySelector('.delete-cancel-btn').addEventListener('click', function() {
        dialog.remove();
    });

    dialog.querySelector('.delete-all-btn').addEventListener('click', function() {
        var attendance = getAttendance();
        if (attendance.length === 0) {
            showToast('Tidak ada data untuk dihapus.');
            dialog.remove();
            return;
        }
        saveAttendance([]);
        renderDatabase();
        showToast('Semua data presensi (' + attendance.length + ' data) telah dihapus.');
        dialog.remove();
    });

    dialog.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
}

// =========================================================
// DATABASE EVENTS
// =========================================================

if (DOM.dbFilterBtn) DOM.dbFilterBtn.addEventListener("click", renderDatabase);
if (DOM.dbSearch) DOM.dbSearch.addEventListener("input", renderDatabase);
if (DOM.dbDateStart) DOM.dbDateStart.addEventListener("change", renderDatabase);
if (DOM.dbDateEnd) DOM.dbDateEnd.addEventListener("change", renderDatabase);

if (DOM.dbDeleteAllBtn) {
    DOM.dbDeleteAllBtn.addEventListener("click", deleteAllAttendance);
}

// =========================================================
// EXPORT DATABASE - SEDERHANA
// =========================================================

if (DOM.dbExportBtn) {
    DOM.dbExportBtn.addEventListener("click", function() {
        var attendance = getAttendance();
        if (attendance.length === 0) {
            showToast('Tidak ada data untuk diekspor.');
            return;
        }
        exportToCSV(attendance);
    });
}

function exportToCSV(data) {
    try {
        var headers = ['No', 'NISN', 'Nama', 'Kelas', 'Status', 'Tanggal', 'Waktu', 'Metode', 'Confidence'];
        var csvRows = [headers.join(',')];
        
        data.forEach(function(item, index) {
            var date = new Date(item.timestamp);
            var dateText = date.toLocaleDateString("id-ID");
            var timeText = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            
            var row = [
                index + 1,
                item.nisn,
                '"' + item.name + '"',
                '"' + item.className + '"',
                item.status,
                item.date,
                timeText,
                item.method,
                Number(item.confidence).toFixed(1) + '%'
            ];
            csvRows.push(row.join(','));
        });
        
        var csvString = csvRows.join('\n');
        var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'presensi_' + getLocalDate() + '.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('Berhasil export ' + data.length + ' data.');
    } catch (error) {
        console.error('[Export CSV]', error);
        showToast('Gagal export ke CSV.');
    }
}

// =========================================================
// CAMERA ERROR MESSAGE
// =========================================================

function getCameraErrorMessage(error) {
    if (error && error.name === "NotAllowedError") return "Izin kamera ditolak. Izinkan akses kamera.";
    if (error && error.name === "NotFoundError") return "Tidak ada kamera yang ditemukan.";
    if (error && error.name === "NotReadableError") return "Kamera sedang digunakan aplikasi lain.";
    if (error && error.name === "SecurityError") return "Kamera membutuhkan HTTPS atau localhost.";
    return "Kamera tidak dapat digunakan pada perangkat ini.";
}

// =========================================================
// FULLSCREEN
// =========================================================

if (DOM.fullscreenButton) {
    DOM.fullscreenButton.addEventListener("click", async function() {
        var stage = document.querySelector(".attendance-stage");
        try {
            if (!document.fullscreenElement) {
                await stage.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error("[Fullscreen]", error);
            showToast("Fullscreen tidak tersedia.");
        }
    });
}

// =========================================================
// BUTTON EVENTS
// =========================================================

if (DOM.attendanceCameraButton) {
    DOM.attendanceCameraButton.addEventListener("click", function() {
        if (attendanceStream) {
            stopAttendanceCamera();
        } else {
            startAttendanceCamera();
        }
    });
}

if (DOM.cameraEnrollmentButton) {
    DOM.cameraEnrollmentButton.addEventListener("click", function() {
        if (enrollmentStream) {
            stopEnrollmentCamera();
            setValidation("Kamera dimatikan.", true);
        } else {
            startEnrollmentCamera();
        }
    });
}

// =========================================================
// VISIBILITY & UNLOAD
// =========================================================

document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
        stopAttendanceCamera();
        stopEnrollmentCamera();
    }
});

window.addEventListener("beforeunload", function() {
    stopAttendanceCamera();
    stopEnrollmentCamera();
});

// =========================================================
// INITIALIZATION - MAIN ENTRY POINT
// =========================================================

function initApp() {
    console.log('[Amanah ID] Initializing...');
    
    // Cache DOM references
    cacheDomRefs();
    
    // Setup default admin
    initDefaultAdmin();
    
    // Handle authentication
    handleAuth();
    
    // Set default dates for database filter
    if (DOM.dbDateStart) {
        var defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 7);
        DOM.dbDateStart.value = defaultStart.toISOString().split('T')[0];
    }
    if (DOM.dbDateEnd) {
        DOM.dbDateEnd.value = getLocalDate();
    }
    
    console.log('[Amanah ID] Initialized successfully!');
}

// START - SAFE INITIALIZATION
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already ready
    initApp();
}