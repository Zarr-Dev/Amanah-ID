"use strict";

/* =========================================================
   AMANAH ID v3.0 - OPTIMIZED VERSION
   FIX: Login berfungsi, checkbox syarat & ketentuan
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
// DOM REFS - CACHE
// =========================================================

const DOM = {};

function cacheDomRefs() {
    DOM.authPage = document.getElementById('authPage');
    DOM.mainApp = document.getElementById('mainApp');
    DOM.loginForm = document.getElementById('loginForm');
    DOM.signupForm = document.getElementById('signupForm');
    DOM.loginEmail = document.getElementById('loginEmail');
    DOM.loginPassword = document.getElementById('loginPassword');
    DOM.signupName = document.getElementById('signupName');
    DOM.signupEmail = document.getElementById('signupEmail');
    DOM.signupPassword = document.getElementById('signupPassword');
    DOM.signupConfirm = document.getElementById('signupConfirm');
    DOM.signupAgree = document.getElementById('signupAgree');
    DOM.signupButton = document.getElementById('signupButton');
    DOM.termsLink = document.getElementById('termsLink');
    DOM.termsModal = document.getElementById('termsModal');
    DOM.termsModalClose = document.getElementById('termsModalClose');
    DOM.termsModalAgree = document.getElementById('termsModalAgree');
    DOM.logoutButton = document.getElementById('logoutButton');
    DOM.modelLoading = document.getElementById('modelLoading');
    DOM.toast = document.getElementById('toast');
    
    DOM.navItems = document.querySelectorAll(".nav-item");
    DOM.pages = document.querySelectorAll(".page");
    
    DOM.attendanceVideo = document.getElementById("attendanceVideo");
    DOM.attendanceOverlay = document.getElementById("attendanceOverlay");
    DOM.attendanceStatus = document.getElementById("attendanceStatus");
    DOM.attendanceError = document.getElementById("attendanceError");
    DOM.attendanceCameraButton = document.getElementById("attendanceCameraButton");
    DOM.fullscreenButton = document.getElementById("fullscreenButton");
    DOM.welcomeMessage = document.getElementById("welcomeMessage");
    
    DOM.totalStudents = document.getElementById("totalStudents");
    DOM.totalPresent = document.getElementById("totalPresent");
    DOM.attendancePercentage = document.getElementById("attendancePercentage");
    DOM.totalHistory = document.getElementById("totalHistory");
    DOM.attendanceTableBody = document.getElementById("attendanceTableBody");
    DOM.emptyDatabase = document.getElementById("emptyDatabase");
    
    DOM.nisnInput = document.getElementById("nisn");
    DOM.studentNameInput = document.getElementById("studentName");
    DOM.studentClassInput = document.getElementById("studentClass");
    DOM.saveStudentButton = document.getElementById("saveStudentButton");
    DOM.enrollmentVideo = document.getElementById("enrollmentVideo");
    DOM.enrollmentImage = document.getElementById("enrollmentImage");
    DOM.previewPlaceholder = document.getElementById("previewPlaceholder");
    DOM.uploadButton = document.getElementById("uploadButton");
    DOM.cameraEnrollmentButton = document.getElementById("cameraEnrollmentButton");
    DOM.photoInput = document.getElementById("photoInput");
    DOM.faceValidation = document.getElementById("faceValidation");
    DOM.aiProgress = document.getElementById("aiProgress");
    DOM.aiPercent = document.getElementById("aiPercent");
    
    DOM.dbSearch = document.getElementById("dbSearch");
    DOM.dbDateStart = document.getElementById("dbDateStart");
    DOM.dbDateEnd = document.getElementById("dbDateEnd");
    DOM.dbFilterBtn = document.getElementById("dbFilterBtn");
    DOM.dbExportBtn = document.getElementById("dbExportBtn");
    DOM.dbDeleteAllBtn = document.getElementById("dbDeleteAllBtn");
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
    DOM.authPage.style.display = 'none';
    DOM.mainApp.style.display = 'flex';
    renderDatabase();
    
    // Load models di background setelah UI muncul
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
            DOM.authPage.style.display = 'flex';
            DOM.mainApp.style.display = 'none';
        }
    } else {
        DOM.authPage.style.display = 'flex';
        DOM.mainApp.style.display = 'none';
    }
}

// Auth Tabs
document.querySelectorAll('.auth-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(function(f) { f.classList.remove('active'); });
        var formId = this.dataset.tab === 'login' ? 'loginForm' : 'signupForm';
        document.getElementById(formId).classList.add('active');
        // Reset checkbox saat pindah tab
        if (this.dataset.tab === 'signup') {
            DOM.signupAgree.checked = false;
            DOM.signupButton.disabled = true;
        }
    });
});

// =========================================================
// CHECKBOX SYARAT & KETENTUAN
// =========================================================

// Toggle button signup berdasarkan checkbox
DOM.signupAgree.addEventListener('change', function() {
    DOM.signupButton.disabled = !this.checked;
});

// Buka modal terms
DOM.termsLink.addEventListener('click', function(e) {
    e.preventDefault();
    DOM.termsModal.style.display = 'flex';
});

// Tutup modal terms
DOM.termsModalClose.addEventListener('click', function() {
    DOM.termsModal.style.display = 'none';
});

DOM.termsModalAgree.addEventListener('click', function() {
    DOM.termsModal.style.display = 'none';
    DOM.signupAgree.checked = true;
    DOM.signupButton.disabled = false;
    showToast('Terima kasih telah menyetujui syarat & ketentuan.');
});

// Tutup modal dengan klik di luar
DOM.termsModal.addEventListener('click', function(e) {
    if (e.target === this) {
        this.style.display = 'none';
    }
});

// =========================================================
// LOGIN - FIXED
// =========================================================

DOM.loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    var email = DOM.loginEmail.value.trim();
    var password = DOM.loginPassword.value.trim();

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

    // Login berhasil
    currentUser = user;
    isAuthenticated = true;
    localStorage.setItem('amanah_session', JSON.stringify(user));
    
    showToast('Selamat datang, ' + user.name + '!');
    goToDashboard();
});

// =========================================================
// SIGNUP - FIXED
// =========================================================

DOM.signupForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    var name = DOM.signupName.value.trim();
    var email = DOM.signupEmail.value.trim();
    var password = DOM.signupPassword.value.trim();
    var confirm = DOM.signupConfirm.value.trim();

    // Validasi
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

    if (!DOM.signupAgree.checked) {
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
    
    // Reset form
    DOM.signupName.value = '';
    DOM.signupEmail.value = '';
    DOM.signupPassword.value = '';
    DOM.signupConfirm.value = '';
    DOM.signupAgree.checked = false;
    DOM.signupButton.disabled = true;
    
    // Pindah ke tab login
    document.querySelector('.auth-tab[data-tab="login"]').click();
    DOM.loginEmail.value = email;
    DOM.loginPassword.value = '';
});

// =========================================================
// LOGOUT
// =========================================================

DOM.logoutButton.addEventListener('click', function() {
    localStorage.removeItem('amanah_session');
    isAuthenticated = false;
    currentUser = null;
    DOM.mainApp.style.display = 'none';
    DOM.authPage.style.display = 'flex';
    stopAttendanceCamera();
    stopEnrollmentCamera();
    showToast('Berhasil keluar.');
});

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
    DOM.toast.textContent = message;
    DOM.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { DOM.toast.classList.remove("show"); }, 2600);
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
// NAVIGATION
// =========================================================

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

// =========================================================
// LOAD MODELS - CEPAT DAN TIDAK MENGHALANGI UI
// =========================================================

function loadModelsBackground() {
    if (modelLoadingStarted || modelLoadingComplete) return;
    modelLoadingStarted = true;
    
    // Tampilkan loading jika belum selesai dalam 2 detik
    let loadingTimeout = setTimeout(() => {
        if (!modelsReady && !modelLoadingComplete) {
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
    
    // Timeout 8 detik
    var loadTimeout = setTimeout(() => {
        console.log("[Amanah ID] Model loading timeout");
        modelLoadingStarted = false;
        clearTimeout(loadingTimeout);
        DOM.modelLoading.style.display = 'none';
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

    // Jalankan loading
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
        DOM.modelLoading.style.display = 'none';
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
            DOM.modelLoading.style.display = 'none';
            console.log("[Amanah ID] AI models ready from backup!");
            updateSaveButton();
            showToast('AI siap digunakan!');
        } catch (backupError) {
            console.error("[Amanah ID] Backup also failed:", backupError);
            clearTimeout(loadTimeout);
            clearTimeout(loadingTimeout);
            DOM.modelLoading.style.display = 'none';
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
        DOM.attendanceError.classList.remove("show");
        DOM.attendanceStatus.textContent = "Mengaktifkan kamera...";
        attendanceStream = await requestCamera();
        DOM.attendanceVideo.srcObject = attendanceStream;
        await DOM.attendanceVideo.play();
        DOM.attendanceStatus.textContent = "Mencari wajah...";
        DOM.attendanceCameraButton.title = "Matikan kamera";
        startAttendanceLoop();
    } catch (error) {
        console.error("[Attendance Camera]", error);
        DOM.attendanceStatus.textContent = "Kamera tidak tersedia";
        DOM.attendanceError.classList.add("show");
        showToast("Kamera gagal diakses.");
    }
}

function stopAttendanceCamera() {
    if (attendanceTimer) { clearInterval(attendanceTimer); attendanceTimer = null; }
    if (attendanceStream) {
        attendanceStream.getTracks().forEach(function(track) { track.stop(); });
        attendanceStream = null;
    }
    DOM.attendanceVideo.srcObject = null;
    DOM.attendanceOverlay.innerHTML = "";
    DOM.welcomeMessage.classList.remove("show");
    DOM.attendanceStatus.textContent = "Kamera belum aktif";
    DOM.attendanceCameraButton.title = "Aktifkan kamera";
    attendanceProcessing = false;
    attendanceMatchStudentId = null;
    attendanceMatchFrames = 0;
}

function startAttendanceLoop() {
    if (attendanceTimer) clearInterval(attendanceTimer);
    attendanceTimer = setInterval(processAttendanceFrame, ATTENDANCE_INTERVAL);
}

// =========================================================
// ATTENDANCE PROCESSING - OPTIMIZED
// =========================================================

async function processAttendanceFrame() {
    if (attendanceProcessing || !modelsReady || !attendanceStream || DOM.attendanceVideo.readyState < 2) return;
    attendanceProcessing = true;

    try {
        const detections = await faceapi.detectAllFaces(
            DOM.attendanceVideo,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.50 })
        ).withFaceLandmarks().withFaceDescriptors();

        DOM.attendanceOverlay.innerHTML = "";

        if (detections.length === 0) {
            DOM.attendanceStatus.textContent = "Mencari wajah...";
            DOM.welcomeMessage.classList.remove("show");
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
            DOM.attendanceStatus.textContent = detections.length === 1 ? "Wajah terdeteksi, belum cocok" : detections.length + " wajah, tidak ada identitas cocok";
            DOM.welcomeMessage.classList.remove("show");
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

        DOM.attendanceStatus.textContent = student.name + " terdeteksi";

        if (attendanceMatchFrames >= REQUIRED_MATCH_FRAMES) {
            DOM.welcomeMessage.textContent = "Selamat datang, " + student.name + "!";
            DOM.welcomeMessage.classList.add("show");
            registerAttendance(student, best.match.distance);
        } else {
            DOM.welcomeMessage.classList.remove("show");
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
    if (!DOM.attendanceVideo.videoWidth || !DOM.attendanceVideo.videoHeight) return;
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
// MATCHING - OPTIMIZED
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
        DOM.enrollmentVideo.srcObject = enrollmentStream;
        DOM.enrollmentVideo.classList.add("active");
        DOM.previewPlaceholder.style.display = "none";
        await waitForVideoReady(DOM.enrollmentVideo);
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
    DOM.enrollmentVideo.pause();
    DOM.enrollmentVideo.srcObject = null;
    DOM.enrollmentVideo.classList.remove("active");
    enrollmentProcessing = false;
    stabilityHistory = [];
    enrollmentReadyFrames = 0;
    lastEnrollmentDetection = null;
    detectionCounter = 0;
}

function clearEnrollmentImage() {
    currentEnrollmentDescriptor = null;
    currentEnrollmentImage = null;
    DOM.enrollmentImage.src = "";
    DOM.enrollmentImage.classList.remove("active", "has-image");
    var replaceBtn = document.getElementById('replaceImageBtn');
    if (replaceBtn) replaceBtn.remove();
    DOM.previewPlaceholder.style.display = "flex";
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
// ENROLLMENT PROCESSING - OPTIMIZED
// =========================================================

async function processEnrollmentFrame() {
    if (enrollmentProcessing || !enrollmentStream || DOM.enrollmentVideo.readyState < 2) return;
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
    DOM.aiProgress.style.width = percentage + '%';
    DOM.aiPercent.textContent = percentage + '%';
}

function setValidation(message, success) {
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

    DOM.enrollmentImage.src = imageData;
    DOM.enrollmentImage.classList.add("active", "has-image");
    DOM.enrollmentVideo.classList.remove("active");
    DOM.previewPlaceholder.style.display = "none";
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
// UPLOAD IMAGE - OPTIMIZED
// =========================================================

DOM.uploadButton.addEventListener("click", function() { DOM.photoInput.click(); });

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
        DOM.enrollmentImage.src = image.src;
        DOM.enrollmentImage.classList.add("active", "has-image");
        DOM.previewPlaceholder.style.display = "none";

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
        DOM.photoInput.value = "";
    }
});

// =========================================================
// FORM VALIDATION
// =========================================================

[DOM.nisnInput, DOM.studentNameInput, DOM.studentClassInput].forEach(function(input) {
    input.addEventListener("input", updateSaveButton);
});

function updateSaveButton() {
    var nisn = DOM.nisnInput.value.trim();
    var name = DOM.studentNameInput.value.trim();
    var className = DOM.studentClassInput.value.trim();
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

DOM.saveStudentButton.addEventListener("click", function() {
    var nisn = DOM.nisnInput.value.trim();
    var name = DOM.studentNameInput.value.trim();
    var className = DOM.studentClassInput.value.trim();

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

    DOM.nisnInput.value = "";
    DOM.studentNameInput.value = "";
    DOM.studentClassInput.value = "";
    currentEnrollmentDescriptor = null;
    currentEnrollmentImage = null;
    DOM.enrollmentImage.src = "";
    DOM.enrollmentImage.classList.remove("active", "has-image");
    var replaceBtn = document.getElementById('replaceImageBtn');
    if (replaceBtn) replaceBtn.remove();
    DOM.previewPlaceholder.style.display = "flex";
    resetEnrollmentState();
    updateSaveButton();
    renderDatabase();
    showToast(name + " berhasil didaftarkan!");
});

// =========================================================
// DATABASE RENDER - OPTIMIZED
// =========================================================

var filteredData = [];

function renderDatabase() {
    var students = getStudents();
    var attendance = getAttendance();
    var today = getLocalDate();
    var todayAttendance = attendance.filter(function(item) { return item.date === today; });

    DOM.totalStudents.textContent = students.length;
    DOM.totalPresent.textContent = todayAttendance.length;
    DOM.totalHistory.textContent = attendance.length;

    var percentage = students.length > 0 ? Math.round((todayAttendance.length / students.length) * 100) : 0;
    DOM.attendancePercentage.textContent = Math.min(percentage, 100) + '%';

    var searchTerm = DOM.dbSearch.value.toLowerCase().trim();
    var startDate = DOM.dbDateStart.value;
    var endDate = DOM.dbDateEnd.value;

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

    DOM.attendanceTableBody.innerHTML = "";

    if (filteredData.length === 0) {
        DOM.emptyDatabase.style.display = "block";
        return;
    }

    DOM.emptyDatabase.style.display = "none";

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
        DOM.attendanceTableBody.appendChild(row);
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

DOM.dbFilterBtn.addEventListener("click", renderDatabase);
DOM.dbSearch.addEventListener("input", renderDatabase);
DOM.dbDateStart.addEventListener("change", renderDatabase);
DOM.dbDateEnd.addEventListener("change", renderDatabase);

if (DOM.dbDeleteAllBtn) {
    DOM.dbDeleteAllBtn.addEventListener("click", deleteAllAttendance);
}

// =========================================================
// EXPORT DATABASE
// =========================================================

DOM.dbExportBtn.addEventListener("click", showExportDialog);

function showExportDialog() {
    var existingDialog = document.getElementById('exportDialog');
    if (existingDialog) existingDialog.remove();

    var dialog = document.createElement('div');
    dialog.id = 'exportDialog';
    dialog.className = 'export-dialog-overlay';
    dialog.innerHTML = 
        '<div class="export-dialog">' +
            '<div class="export-dialog-header">' +
                '<h3>Export Data Presensi</h3>' +
                '<button class="export-dialog-close" onclick="this.closest(\'#exportDialog\').remove()">✕</button>' +
            '</div>' +
            '<div class="export-dialog-body">' +
                '<div class="export-date-range">' +
                    '<div class="export-date-group">' +
                        '<label>Dari Tanggal</label>' +
                        '<input type="date" id="exportStartDate" value="' + getDefaultStartDate() + '">' +
                    '</div>' +
                    '<div class="export-date-group">' +
                        '<label>Sampai Tanggal</label>' +
                        '<input type="date" id="exportEndDate" value="' + getLocalDate() + '">' +
                    '</div>' +
                '</div>' +
                '<div class="export-format-options">' +
                    '<button class="export-format-btn" data-format="xlsx"><span>📊</span> XLSX</button>' +
                    '<button class="export-format-btn" data-format="csv"><span>📄</span> CSV</button>' +
                    '<button class="export-format-btn" data-format="image"><span>🖼️</span> Gambar</button>' +
                '</div>' +
                '<div class="export-preview">' +
                    '<p>Data akan diekspor berdasarkan rentang tanggal yang dipilih.</p>' +
                '</div>' +
            '</div>' +
            '<div class="export-dialog-footer">' +
                '<button class="export-cancel-btn" onclick="this.closest(\'#exportDialog\').remove()">Batal</button>' +
                '<button class="export-confirm-btn" id="exportConfirmBtn">Export Data</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(dialog);

    document.getElementById('exportConfirmBtn').addEventListener('click', function() {
        var startDate = document.getElementById('exportStartDate').value;
        var endDate = document.getElementById('exportEndDate').value;
        if (!startDate || !endDate) { showToast('Pilih rentang tanggal.'); return; }
        if (startDate > endDate) { showToast('Tanggal mulai harus sebelum akhir.'); return; }
        var selectedBtn = document.querySelector('.export-format-btn.active');
        if (!selectedBtn) { showToast('Pilih format export.'); return; }
        exportAttendanceData(startDate, endDate, selectedBtn.dataset.format);
    });

    document.querySelectorAll('.export-format-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.export-format-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
        });
    });
}

function getDefaultStartDate() {
    var date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
}

function exportAttendanceData(startDate, endDate, format) {
    var attendance = getAttendance();
    var filtered = attendance.filter(function(item) { return item.date >= startDate && item.date <= endDate; });

    if (filtered.length === 0) { showToast('Tidak ada data dalam rentang tersebut.'); return; }

    var exportData = filtered.map(function(item, index) {
        return {
            'No': index + 1,
            'NISN': item.nisn,
            'Nama': item.name,
            'Kelas': item.className,
            'Status': item.status,
            'Tanggal': item.date,
            'Waktu': new Date(item.timestamp).toLocaleTimeString('id-ID'),
            'Metode': item.method,
            'Confidence': Number(item.confidence).toFixed(1) + '%'
        };
    });

    switch(format) {
        case 'xlsx': exportToXLSX(exportData); break;
        case 'csv': exportToCSV(exportData); break;
        case 'image': exportToImage(exportData); break;
        default: showToast('Format tidak didukung.');
    }

    var dialog = document.getElementById('exportDialog');
    if (dialog) dialog.remove();
}

function exportToXLSX(data) {
    if (typeof XLSX === 'undefined') {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = function() { createXLSX(data); };
        document.head.appendChild(script);
        showToast('Memuat library XLSX...');
        return;
    }
    createXLSX(data);
}

function createXLSX(data) {
    try {
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
            { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Presensi');
        XLSX.writeFile(wb, 'presensi_' + getLocalDate() + '.xlsx');
        showToast('Berhasil export ' + data.length + ' data.');
    } catch (error) {
        console.error('[Export XLSX]', error);
        showToast('Gagal export ke XLSX.');
    }
}

function exportToCSV(data) {
    try {
        var headers = Object.keys(data[0]);
        var csvRows = [headers.join(',')];
        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            var values = headers.map(function(header) {
                var val = row[header] || '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    return '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            });
            csvRows.push(values.join(','));
        }
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

function exportToImage(data) {
    try {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var cellPadding = 12;
        var headerHeight = 40;
        var rowHeight = 35;
        var colWidths = [60, 120, 180, 120, 90, 120, 100, 140, 100];
        var headers = ['No', 'NISN', 'Nama', 'Kelas', 'Status', 'Tanggal', 'Waktu', 'Metode', 'Confidence'];
        var totalWidth = colWidths.reduce(function(a, b) { return a + b; }, 0) + cellPadding * 2;
        var totalHeight = headerHeight + (data.length + 1) * rowHeight + cellPadding * 2 + 50;
        canvas.width = totalWidth;
        canvas.height = totalHeight;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        ctx.fillStyle = '#1a2e1a';
        ctx.font = 'bold 18px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Laporan Presensi ' + getLocalDate(), totalWidth / 2, 35);

        var y = headerHeight + cellPadding + 15;
        ctx.fillStyle = '#e8f5e8';
        ctx.fillRect(cellPadding, y, totalWidth - cellPadding * 2, rowHeight);
        ctx.fillStyle = '#1a2e1a';
        ctx.font = 'bold 11px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var x = cellPadding;
        for (var i = 0; i < headers.length; i++) {
            ctx.fillText(headers[i], x + colWidths[i] / 2, y + rowHeight / 2);
            x += colWidths[i];
        }
        y += rowHeight;

        ctx.font = '10px Poppins, sans-serif';
        ctx.textBaseline = 'middle';
        for (var j = 0; j < data.length; j++) {
            var row = data[j];
            if (j % 2 === 0) {
                ctx.fillStyle = '#f5f8f5';
                ctx.fillRect(cellPadding, y, totalWidth - cellPadding * 2, rowHeight);
            }
            ctx.fillStyle = '#1a2e1a';
            x = cellPadding;
            var values = Object.values(row);
            for (var k = 0; k < values.length; k++) {
                ctx.fillText(String(values[k]), x + colWidths[k] / 2, y + rowHeight / 2);
                x += colWidths[k];
            }
            y += rowHeight;
        }

        ctx.strokeStyle = '#d4e2d4';
        ctx.lineWidth = 1;
        ctx.strokeRect(cellPadding, headerHeight + cellPadding + 15, totalWidth - cellPadding * 2, (data.length + 1) * rowHeight);

        var link = document.createElement('a');
        link.download = 'presensi_' + getLocalDate() + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Berhasil export ' + data.length + ' data.');
    } catch (error) {
        console.error('[Export Image]', error);
        showToast('Gagal export ke gambar.');
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

// =========================================================
// BUTTON EVENTS
// =========================================================

DOM.attendanceCameraButton.addEventListener("click", function() {
    if (attendanceStream) {
        stopAttendanceCamera();
    } else {
        startAttendanceCamera();
    }
});

DOM.cameraEnrollmentButton.addEventListener("click", function() {
    if (enrollmentStream) {
        stopEnrollmentCamera();
        setValidation("Kamera dimatikan.", true);
    } else {
        startEnrollmentCamera();
    }
});

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
// INITIALIZATION
// =========================================================

function initApp() {
    cacheDomRefs();
    initDefaultAdmin();
    handleAuth();
    
    // Set default dates
    if (DOM.dbDateStart) {
        var defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 7);
        DOM.dbDateStart.value = defaultStart.toISOString().split('T')[0];
    }
    if (DOM.dbDateEnd) {
        DOM.dbDateEnd.value = getLocalDate();
    }
}

// START
document.addEventListener('DOMContentLoaded', initApp);