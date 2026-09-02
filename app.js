"use strict";

/* =========================================================
   AMANAH ID
   FRONTEND COMPUTER VISION PROTOTYPE
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

// PERBAIKAN: URL model yang benar
const MODEL_URL =
    "https://justadudewhohacks.github.io/face-api.js/models";

// URL cadangan jika primary gagal
const MODEL_URL_BACKUP =
    "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/models";


/*
 * Recognition threshold.
 *
 * Smaller value = stricter match.
 *
 * Untuk prototype, 0.46 cukup ketat.
 * Nilai produksi nantinya harus ditentukan
 * melalui dataset dan pengujian FAR/FRR.
 */

const FACE_MATCH_THRESHOLD =
    0.46;


/*
 * AI inference interval.
 *
 * OPTIMASI: Interval lebih cepat untuk enrollment
 */

const ATTENDANCE_INTERVAL =
    300; // Lebih cepat untuk respons lebih baik

const ENROLLMENT_INTERVAL =
    150; // JAUH lebih cepat untuk analisis real-time


/*
 * Recognition confirmation.
 *
 * Satu match tidak langsung dianggap
 * sebagai presensi.
 */

const REQUIRED_MATCH_FRAMES =
    2;


/*
 * Enrollment harus mencapai
 * 100% selama beberapa frame.
 * 
 * OPTIMASI: Kurangi frame requirement untuk kecepatan
 */

const REQUIRED_CAPTURE_FRAMES =
    1; // Dari 2 menjadi 1 frame


/*
 * Stabilitas wajah.
 */

const STABILITY_HISTORY =
    4; // Dari 6 menjadi 4


/* =========================================================
   STATE
========================================================= */

let modelsReady =
    false;

let modelLoadingAttempts =
    0;

const MAX_MODEL_ATTEMPTS =
    3;


let attendanceStream =
    null;

let enrollmentStream =
    null;


let attendanceTimer =
    null;

let enrollmentTimer =
    null;


let attendanceProcessing =
    false;

let enrollmentProcessing =
    false;


/*
 * Enrollment face descriptor.
 */

let currentEnrollmentDescriptor =
    null;


/*
 * Enrollment captured image.
 */

let currentEnrollmentImage =
    null;


/*
 * Enrollment progress.
 */

let enrollmentProgress =
    0;


/*
 * Consecutive valid capture frames.
 */

let enrollmentReadyFrames =
    0;


/*
 * Face movement history.
 */

let stabilityHistory =
    [];


/*
 * Attendance recognition confirmation.
 */

let attendanceMatchStudentId =
    null;

let attendanceMatchFrames =
    0;


/*
 * Short attendance cooldown.
 */

const attendanceCooldown =
    new Map();


/*
 * OPTIMASI: Cache untuk deteksi wajah
 */

let lastEnrollmentDetection = null;
let detectionCounter = 0;


/* =========================================================
   DOM
========================================================= */

const navItems =
    document.querySelectorAll(
        ".nav-item"
    );


const pages =
    document.querySelectorAll(
        ".page"
    );


/* Attendance */

const attendanceVideo =
    document.getElementById(
        "attendanceVideo"
    );


const attendanceOverlay =
    document.getElementById(
        "attendanceOverlay"
    );


const attendanceStatus =
    document.getElementById(
        "attendanceStatus"
    );


const attendanceError =
    document.getElementById(
        "attendanceError"
    );


const attendanceCameraButton =
    document.getElementById(
        "attendanceCameraButton"
    );


const fullscreenButton =
    document.getElementById(
        "fullscreenButton"
    );


const welcomeMessage =
    document.getElementById(
        "welcomeMessage"
    );


/* Database */

const totalStudents =
    document.getElementById(
        "totalStudents"
    );


const totalPresent =
    document.getElementById(
        "totalPresent"
    );


const attendancePercentage =
    document.getElementById(
        "attendancePercentage"
    );


const attendanceTableBody =
    document.getElementById(
        "attendanceTableBody"
    );


const emptyDatabase =
    document.getElementById(
        "emptyDatabase"
    );


/* Form */

const nisnInput =
    document.getElementById(
        "nisn"
    );


const studentNameInput =
    document.getElementById(
        "studentName"
    );


const studentClassInput =
    document.getElementById(
        "studentClass"
    );


const saveStudentButton =
    document.getElementById(
        "saveStudentButton"
    );


const enrollmentPreview =
    document.getElementById(
        "enrollmentPreview"
    );


const enrollmentVideo =
    document.getElementById(
        "enrollmentVideo"
    );


const enrollmentImage =
    document.getElementById(
        "enrollmentImage"
    );


const previewPlaceholder =
    document.getElementById(
        "previewPlaceholder"
    );


const uploadButton =
    document.getElementById(
        "uploadButton"
    );


const cameraEnrollmentButton =
    document.getElementById(
        "cameraEnrollmentButton"
    );


const photoInput =
    document.getElementById(
        "photoInput"
    );


const faceValidation =
    document.getElementById(
        "faceValidation"
    );


const aiProgress =
    document.getElementById(
        "aiProgress"
    );


const aiPercent =
    document.getElementById(
        "aiPercent"
    );


/* Misc */

const toast =
    document.getElementById(
        "toast"
    );


const modelLoading =
    document.getElementById(
        "modelLoading"
    );


/* =========================================================
   STORAGE
========================================================= */

const STUDENTS_KEY =
    "amanah_students_v3";


const ATTENDANCE_KEY =
    "amanah_attendance_v3";


function getStudents() {

    try {

        const data =
            JSON.parse(
                localStorage.getItem(
                    STUDENTS_KEY
                )
            );

        return Array.isArray(data)
            ? data
            : [];

    } catch {

        return [];

    }

}


function saveStudents(
    students
) {

    localStorage.setItem(
        STUDENTS_KEY,
        JSON.stringify(
            students
        )
    );

}


function getAttendance() {

    try {

        const data =
            JSON.parse(
                localStorage.getItem(
                    ATTENDANCE_KEY
                )
            );

        return Array.isArray(data)
            ? data
            : [];

    } catch {

        return [];

    }

}


function saveAttendance(
    attendance
) {

    localStorage.setItem(
        ATTENDANCE_KEY,
        JSON.stringify(
            attendance
        )
    );

}


/* =========================================================
   UTILITIES
========================================================= */

let toastTimer =
    null;


function showToast(
    message
) {

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2600
        );

}


function escapeHTML(
    value
) {

    return String(
        value
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   NAVIGATION
========================================================= */

navItems.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const pageId =
                    button.dataset.page;


                navItems.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                pages.forEach(
                    page => {

                        page.classList.remove(
                            "active"
                        );

                    }
                );


                const targetPage =
                    document.getElementById(
                        pageId
                    );


                if (targetPage) {

                    targetPage.classList.add(
                        "active"
                    );

                }


                /*
                 * Kamera hanya aktif
                 * pada halaman yang membutuhkan.
                 */

                if (
                    pageId !==
                    "attendancePage"
                ) {

                    stopAttendanceCamera();

                }


                if (
                    pageId !==
                    "formPage"
                ) {

                    stopEnrollmentCamera();

                }


                if (
                    pageId ===
                    "databasePage"
                ) {

                    renderDatabase();

                }

            }
        );

    }
);


/* =========================================================
   LOAD MODELS - REVISED WITH BETTER ERROR HANDLING
========================================================= */

async function loadModels() {

    // Cek apakah faceapi tersedia
    if (typeof faceapi === 'undefined') {
        console.error("[Amanah ID] face-api.js library not loaded");
        showModelError(
            "Library face-api.js tidak ditemukan",
            "Pastikan koneksi internet aktif dan refresh halaman."
        );
        return;
    }

    try {

        console.log("[Amanah ID] Starting model loading...");

        // Coba load dari primary URL
        await loadModelsFromUrl(MODEL_URL);
        
        modelsReady = true;
        modelLoading.classList.add("hidden");
        updateSaveButton();

        console.log(
            "[Amanah ID] AI models loaded successfully."
        );

        showToast(
            "Sistem AI siap digunakan."
        );

    } catch (
        error
    ) {

        console.error(
            "[Amanah ID] Primary model load error:",
            error
        );

        // Coba backup URL
        try {
            console.log("[Amanah ID] Trying backup URL...");
            showModelStatus("Mencoba server cadangan...");
            
            await loadModelsFromUrl(MODEL_URL_BACKUP);
            
            modelsReady = true;
            modelLoading.classList.add("hidden");
            updateSaveButton();

            console.log(
                "[Amanah ID] AI models loaded from backup URL."
            );

            showToast(
                "Sistem AI siap digunakan (server cadangan)."
            );

        } catch (backupError) {

            console.error(
                "[Amanah ID] Backup model load error:",
                backupError
            );

            // Semua percobaan gagal
            showModelError(
                "Model AI gagal dimuat",
                "Periksa koneksi internet dan muat ulang halaman. " +
                "Pastikan tidak ada pemblokiran CORS."
            );

            // Tampilkan detail error di console untuk debugging
            console.warn("[Amanah ID] Detailed error info:", {
                primaryError: error.message,
                backupError: backupError.message,
                primaryUrl: MODEL_URL,
                backupUrl: MODEL_URL_BACKUP,
                faceapiVersion: faceapi?.version || 'unknown'
            });
        }

    }

}


async function loadModelsFromUrl(url) {

    // PERBAIKAN: Load dengan timeout untuk menghindari hang
    const timeout = 30000; // 30 detik timeout
    const loadPromise = Promise.all([
        faceapi.nets
            .tinyFaceDetector
            .loadFromUri(url),
        faceapi.nets
            .faceLandmark68Net
            .loadFromUri(url),
        faceapi.nets
            .faceRecognitionNet
            .loadFromUri(url)
    ]);

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Loading models from ${url} timed out after ${timeout}ms`));
        }, timeout);
    });

    await Promise.race([loadPromise, timeoutPromise]);

}


function showModelStatus(message) {
    const title = modelLoading.querySelector("strong");
    const subtitle = modelLoading.querySelector("span");

    if (title) {
        title.textContent = "Memuat Model AI";
    }

    if (subtitle) {
        subtitle.textContent = message;
    }
}


function showModelError(titleMessage, subtitleMessage) {
    const title = modelLoading.querySelector("strong");
    const subtitle = modelLoading.querySelector("span");

    if (title) {
        title.textContent = titleMessage || "Model AI gagal dimuat";
    }

    if (subtitle) {
        subtitle.textContent = subtitleMessage || 
            "Periksa koneksi internet dan pastikan tidak ada pemblokiran CORS. " +
            "Refresh halaman untuk mencoba lagi.";
    }

    // Tambahkan tombol retry
    const retryButton = document.createElement("button");
    retryButton.textContent = "Coba Lagi";
    retryButton.className = "primary-button";
    retryButton.style.marginTop = "15px";
    retryButton.style.padding = "10px 24px";
    retryButton.style.width = "auto";
    retryButton.style.fontSize = "12px";

    retryButton.addEventListener("click", () => {
        // Hapus tombol retry lama
        retryButton.remove();
        // Reset loading screen
        const titleEl = modelLoading.querySelector("strong");
        const subtitleEl = modelLoading.querySelector("span");
        if (titleEl) titleEl.textContent = "Amanah ID";
        if (subtitleEl) subtitleEl.textContent = "Menyiapkan sistem computer vision...";
        // Muat ulang models
        loadModels();
    });

    modelLoading.appendChild(retryButton);
}


/* =========================================================
   CAMERA
========================================================= */

async function requestCamera() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        throw new Error(
            "Browser tidak mendukung getUserMedia."
        );

    }


    return navigator.mediaDevices.getUserMedia({

        video: {

            facingMode:
                "user",

            width: {

                ideal:
                    480 // OPTIMASI: Resolusi lebih rendah untuk kecepatan

            },

            height: {

                ideal:
                    360

            },

            frameRate: {

                ideal:
                    30, // OPTIMASI: Frame rate lebih tinggi

                max:
                    30

            }

        },

        audio:
            false

    });

}


/* =========================================================
   ATTENDANCE CAMERA
========================================================= */

async function startAttendanceCamera() {

    if (
        !modelsReady
    ) {

        showToast(
            "Sistem AI belum siap."
        );

        return;

    }


    try {

        stopAttendanceCamera();


        attendanceError.classList.remove(
            "show"
        );


        attendanceStatus.textContent =
            "Mengaktifkan kamera...";


        attendanceStream =
            await requestCamera();


        attendanceVideo.srcObject =
            attendanceStream;


        await attendanceVideo.play();


        attendanceStatus.textContent =
            "Mencari wajah...";


        attendanceCameraButton.title =
            "Matikan kamera";


        startAttendanceLoop();


    } catch (
        error
    ) {

        console.error(
            "[Attendance Camera]",
            error
        );


        attendanceStatus.textContent =
            "Kamera tidak tersedia";


        attendanceError.classList.add(
            "show"
        );


        showToast(
            "Kamera gagal diakses."
        );

    }

}


function stopAttendanceCamera() {

    if (
        attendanceTimer
    ) {

        clearInterval(
            attendanceTimer
        );

        attendanceTimer =
            null;

    }


    if (
        attendanceStream
    ) {

        attendanceStream
            .getTracks()
            .forEach(
                track => {

                    track.stop();

                }
            );

        attendanceStream =
            null;

    }


    attendanceVideo.srcObject =
        null;


    attendanceOverlay.innerHTML =
        "";


    welcomeMessage.classList.remove(
        "show"
    );


    attendanceStatus.textContent =
        "Kamera belum aktif";


    attendanceCameraButton.title =
        "Aktifkan kamera";


    attendanceProcessing =
        false;


    attendanceMatchStudentId =
        null;


    attendanceMatchFrames =
        0;

}


/* =========================================================
   ATTENDANCE LOOP
========================================================= */

function startAttendanceLoop() {

    if (
        attendanceTimer
    ) {

        clearInterval(
            attendanceTimer
        );

    }


    attendanceTimer =
        setInterval(
            processAttendanceFrame,
            ATTENDANCE_INTERVAL
        );

}


async function processAttendanceFrame() {

    if (
        attendanceProcessing ||
        !modelsReady ||
        !attendanceStream ||
        attendanceVideo.readyState < 2
    ) {

        return;

    }


    attendanceProcessing =
        true;


    try {

        const detections =
            await faceapi
                .detectAllFaces(
                    attendanceVideo,
                    new faceapi.TinyFaceDetectorOptions({

                        inputSize:
                            224, // OPTIMASI: Lebih kecil untuk kecepatan

                        scoreThreshold:
                            0.55 // OPTIMASI: Threshold lebih rendah

                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptors();


        /*
         * ALWAYS clear old boxes.
         *
         * This prevents frozen
         * / stale outlines.
         */

        attendanceOverlay.innerHTML =
            "";


        /*
         * No face.
         */

        if (
            detections.length === 0
        ) {

            attendanceStatus.textContent =
                "Mencari wajah...";


            welcomeMessage.classList.remove(
                "show"
            );


            attendanceMatchStudentId =
                null;

            attendanceMatchFrames =
                0;


            return;

        }


        const students =
            getStudents();


        /*
         * Find match for every detected face.
         */

        const faceResults =
            detections.map(
                detection => {

                    const match =
                        findBestMatch(
                            detection.descriptor,
                            students
                        );


                    return {

                        detection,
                        match

                    };

                }
            );


        /*
         * Draw every face.
         */

        for (
            const result
            of faceResults
        ) {

            const recognized =
                Boolean(
                    result.match &&
                    result.match.distance <=
                    FACE_MATCH_THRESHOLD
                );


            createFaceOutline(
                result.detection.detection.box,
                recognized
            );

        }


        /*
         * Multiple faces:
         *
         * Each can have its own
         * white/green result.
         *
         * But attendance still
         * uses temporal confirmation.
         */

        const recognizedFaces =
            faceResults.filter(
                result =>
                    result.match &&
                    result.match.distance <=
                    FACE_MATCH_THRESHOLD
            );


        if (
            recognizedFaces.length === 0
        ) {

            attendanceStatus.textContent =
                detections.length === 1
                    ? "Wajah terdeteksi • identitas belum cocok"
                    : `${detections.length} wajah terdeteksi • tidak ada identitas cocok`;


            welcomeMessage.classList.remove(
                "show"
            );


            attendanceMatchStudentId =
                null;

            attendanceMatchFrames =
                0;


            return;

        }


        /*
         * Select best recognized face.
         */

        recognizedFaces.sort(
            (
                a,
                b
            ) =>
                a.match.distance -
                b.match.distance
        );


        const best =
            recognizedFaces[0];


        const student =
            best.match.student;


        /*
         * Multi-frame confirmation.
         */

        if (
            attendanceMatchStudentId ===
            student.id
        ) {

            attendanceMatchFrames +=
                1;

        } else {

            attendanceMatchStudentId =
                student.id;

            attendanceMatchFrames =
                1;

        }


        attendanceStatus.textContent =
            `${student.name} terdeteksi`;


        /*
         * Require multiple frames
         * before attendance.
         */

        if (
            attendanceMatchFrames >=
            REQUIRED_MATCH_FRAMES
        ) {

            welcomeMessage.textContent =
                `Selamat datang, ${student.name}!`;


            welcomeMessage.classList.add(
                "show"
            );


            registerAttendance(
                student,
                best.match.distance
            );

        } else {

            welcomeMessage.classList.remove(
                "show"
            );

        }

    } catch (
        error
    ) {

        console.error(
            "[Attendance Detection]",
            error
        );

    } finally {

        attendanceProcessing =
            false;

    }

}


/* =========================================================
   FACE OUTLINE
========================================================= */

function createFaceOutline(
    box,
    recognized
) {

    if (
        !attendanceVideo.videoWidth ||
        !attendanceVideo.videoHeight
    ) {

        return;

    }


    const outline =
        document.createElement(
            "div"
        );


    outline.className =
        recognized
            ? "face-outline recognized"
            : "face-outline";


    /*
     * Correctly map face-api coordinates
     * to object-fit: cover.
     */

    const mapped =
        mapVideoBox(
            box,
            attendanceVideo,
            true
        );


    outline.style.left =
        `${mapped.x}px`;


    outline.style.top =
        `${mapped.y}px`;


    outline.style.width =
        `${mapped.width}px`;


    outline.style.height =
        `${mapped.height}px`;


    attendanceOverlay.appendChild(
        outline
    );

}


/* =========================================================
   VIDEO BOX MAPPING
========================================================= */

function mapVideoBox(
    box,
    video,
    mirrored
) {

    const videoWidth =
        video.videoWidth;

    const videoHeight =
        video.videoHeight;


    const containerWidth =
        video.clientWidth;

    const containerHeight =
        video.clientHeight;


    /*
     * object-fit: cover
     */

    const scale =
        Math.max(
            containerWidth /
                videoWidth,

            containerHeight /
                videoHeight
        );


    const renderedWidth =
        videoWidth *
        scale;


    const renderedHeight =
        videoHeight *
        scale;


    const offsetX =
        (
            containerWidth -
            renderedWidth
        ) / 2;


    const offsetY =
        (
            containerHeight -
            renderedHeight
        ) / 2;


    let x =
        offsetX +
        box.x *
        scale;


    if (
        mirrored
    ) {

        x =
            containerWidth -
            (
                offsetX +
                (
                    box.x +
                    box.width
                ) *
                scale
            );

    }


    const y =
        offsetY +
        box.y *
        scale;


    return {

        x,

        y,

        width:
            box.width *
            scale,

        height:
            box.height *
            scale

    };

}


/* =========================================================
   MATCHING
========================================================= */

function findBestMatch(
    descriptor,
    students
) {

    let bestStudent =
        null;


    let bestDistance =
        Infinity;


    for (
        const student
        of students
    ) {

        if (
            !Array.isArray(
                student.descriptor
            )
        ) {

            continue;

        }


        if (
            student.descriptor.length !==
            descriptor.length
        ) {

            continue;

        }


        const distance =
            faceapi.euclideanDistance(
                descriptor,
                new Float32Array(
                    student.descriptor
                )
            );


        if (
            distance <
            bestDistance
        ) {

            bestDistance =
                distance;

            bestStudent =
                student;

        }

    }


    if (
        !bestStudent
    ) {

        return null;

    }


    return {

        student:
            bestStudent,

        distance:
            bestDistance

    };

}


/* =========================================================
   ATTENDANCE REGISTER
========================================================= */

function registerAttendance(
    student,
    distance
) {

    const attendance =
        getAttendance();


    const today =
        getLocalDate();


    /*
     * No duplicate attendance
     * on the same day.
     */

    const existing =
        attendance.find(
            item =>
                item.nisn ===
                student.nisn &&
                item.date ===
                today
        );


    if (
        existing
    ) {

        return;

    }


    /*
     * Short cooldown.
     */

    const currentTime =
        Date.now();


    const previous =
        attendanceCooldown.get(
            student.id
        );


    if (
        previous &&
        currentTime -
        previous <
        5000
    ) {

        return;

    }


    attendanceCooldown.set(
        student.id,
        currentTime
    );


    /*
     * Confidence here is only a
     * normalized prototype indicator.
     *
     * It is NOT a statistical probability.
     */

    const confidence =
        Math.max(
            0,
            Math.min(
                100,
                (
                    1 -
                    distance
                ) *
                100
            )
        );


    const record = {

        id:
            createId(),

        nisn:
            student.nisn,

        name:
            student.name,

        className:
            student.className,

        status:
            "Hadir",

        date:
            today,

        timestamp:
            new Date()
                .toISOString(),

        method:
            "Face Recognition",

        confidence:
            confidence

    };


    attendance.unshift(
        record
    );


    saveAttendance(
        attendance
    );


    renderDatabase();


    showToast(
        `${student.name} berhasil melakukan presensi.`
    );

}


/* =========================================================
   FORM CAMERA
========================================================= */

async function startEnrollmentCamera() {

    if (
        !modelsReady
    ) {

        showToast(
            "Sistem AI belum siap."
        );

        return;

    }


    try {

        stopEnrollmentCamera();


        resetEnrollmentState();


        /*
         * Remove current image.
         */

        enrollmentImage.src =
            "";


        enrollmentImage.classList.remove(
            "active"
        );


        previewPlaceholder.style.display =
            "flex";


        /*
         * Request camera.
         */

        enrollmentStream =
            await requestCamera();


        /*
         * Attach immediately.
         */

        enrollmentVideo.srcObject =
            enrollmentStream;


        enrollmentVideo.classList.add(
            "active"
        );


        previewPlaceholder.style.display =
            "none";


        await waitForVideoReady(
            enrollmentVideo
        );


        setValidation(
            "Kamera aktif. Posisikan satu wajah di tengah.",
            true
        );


        startEnrollmentLoop();


    } catch (
        error
    ) {

        console.error(
            "[Enrollment Camera]",
            error
        );


        setValidation(
            getCameraErrorMessage(
                error
            ),
            false
        );


        showToast(
            "Kamera formulir gagal dibuka."
        );

    }

}


function stopEnrollmentCamera() {

    if (
        enrollmentTimer
    ) {

        clearInterval(
            enrollmentTimer
        );

        enrollmentTimer =
            null;

    }


    if (
        enrollmentStream
    ) {

        enrollmentStream
            .getTracks()
            .forEach(
                track => {

                    track.stop();

                }
            );

        enrollmentStream =
            null;

    }


    enrollmentVideo.pause();


    enrollmentVideo.srcObject =
        null;


    enrollmentVideo.classList.remove(
        "active"
    );


    enrollmentProcessing =
        false;


    stabilityHistory =
        [];


    enrollmentReadyFrames =
        0;
        
    lastEnrollmentDetection = null;
    detectionCounter = 0;

}


/* =========================================================
   WAIT FOR VIDEO
========================================================= */

function waitForVideoReady(
    video
) {

    return new Promise(
        resolve => {

            if (
                video.readyState >=
                2
            ) {

                resolve();

                return;

            }


            const handler =
                () => {

                    video.removeEventListener(
                        "loadedmetadata",
                        handler
                    );

                    resolve();

                };


            video.addEventListener(
                "loadedmetadata",
                handler
            );

        }
    );

}


/* =========================================================
   ENROLLMENT LOOP
========================================================= */

function startEnrollmentLoop() {

    if (
        enrollmentTimer
    ) {

        clearInterval(
            enrollmentTimer
        );

    }


    enrollmentTimer =
        setInterval(
            processEnrollmentFrame,
            ENROLLMENT_INTERVAL
        );

}


/* =========================================================
   ENROLLMENT AI - OPTIMIZED FOR SPEED
========================================================= */

async function processEnrollmentFrame() {

    if (
        enrollmentProcessing ||
        !enrollmentStream ||
        enrollmentVideo.readyState < 2
    ) {

        return;

    }


    enrollmentProcessing =
        true;
        
    detectionCounter++;


    try {

        const detections =
            await faceapi
                .detectAllFaces(
                    enrollmentVideo,
                    new faceapi.TinyFaceDetectorOptions({

                        inputSize:
                            160, // OPTIMASI: Ukuran lebih kecil untuk kecepatan ekstrim

                        scoreThreshold:
                            0.50 // OPTIMASI: Threshold lebih rendah

                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptors();


        /*
         * NO FACE
         */

        if (
            detections.length === 0
        ) {

            enrollmentReadyFrames =
                0;
                
            lastEnrollmentDetection = null;


            updateEnrollmentProgress(
                0
            );


            setValidation(
                "Wajah belum terdeteksi.",
                false
            );


            return;

        }


        /*
         * MULTIPLE FACES
         */

        if (
            detections.length > 1
        ) {

            enrollmentReadyFrames =
                0;
                
            lastEnrollmentDetection = null;


            updateEnrollmentProgress(
                5
            );


            setValidation(
                "Hanya satu wajah yang boleh berada di kamera.",
                false
            );


            return;

        }


        const detection =
            detections[0];


        const box =
            detection.detection.box;


        const width =
            enrollmentVideo.videoWidth;


        const height =
            enrollmentVideo.videoHeight;


        /*
         * OPTIMASI: Cache detection untuk frame berikutnya
         */
        lastEnrollmentDetection = detection;


        /*
         * ==============================================
         * 1. FACE SIZE - OPTIMASI: Lebih cepat
         * ==============================================
         */

        const faceArea =
            (
                box.width *
                box.height
            ) /
            (
                width *
                height
            );


        // OPTIMASI: Perhitungan lebih langsung
        let sizeScore = 0;
        if (faceArea >= 0.08 && faceArea <= 0.50) {
            sizeScore = 95 + (1 - Math.abs(faceArea - 0.22) * 150);
        } else if (faceArea > 0.50 && faceArea <= 0.70) {
            sizeScore = 70 - (faceArea - 0.50) * 100;
        } else if (faceArea >= 0.04 && faceArea < 0.08) {
            sizeScore = 60 + (faceArea - 0.04) * 500;
        } else {
            sizeScore = Math.max(0, 100 - Math.abs(faceArea - 0.22) * 300);
        }
        sizeScore = clamp(sizeScore, 0, 100);


        /*
         * ==============================================
         * 2. CENTER - OPTIMASI: Lebih cepat
         * ==============================================
         */

        const faceCenterX =
            box.x + box.width / 2;
        const faceCenterY =
            box.y + box.height / 2;
        const frameCenterX =
            width / 2;
        const frameCenterY =
            height / 2;

        const distance = Math.hypot(
            (faceCenterX - frameCenterX) / width,
            (faceCenterY - frameCenterY) / height
        );

        const centerScore = clamp(100 - (distance * 350), 0, 100);


        /*
         * ==============================================
         * 3. BRIGHTNESS - OPTIMASI: Skip jika tidak perlu
         * ==============================================
         */

        let lightScore = 85; // Default nilai baik
        if (detectionCounter % 3 === 0) { // Hitung brightness setiap 3 frame
            const brightness = calculateBrightness(enrollmentVideo);
            lightScore = calculateLightScore(brightness);
        }


        /*
         * ==============================================
         * 4. STABILITY - OPTIMASI: Lebih cepat
         * ==============================================
         */

        stabilityHistory.push({
            x: centerX,
            y: centerY,
            width: box.width,
            height: box.height
        });

        if (stabilityHistory.length > STABILITY_HISTORY) {
            stabilityHistory.shift();
        }

        let stabilityScore = 50;
        if (stabilityHistory.length >= STABILITY_HISTORY) {
            const first = stabilityHistory[0];
            const last = stabilityHistory[stabilityHistory.length - 1];
            
            const movement = Math.hypot(last.x - first.x, last.y - first.y);
            const sizeMovement = Math.abs(last.width - first.width);
            
            stabilityScore = clamp(100 - (movement * 1.5) - (sizeMovement * 1.2), 0, 100);
        }


        /*
         * ==============================================
         * FINAL SCORE - OPTIMASI: Bobot dioptimasi
         * ==============================================
         */

        const finalScore = (
            sizeScore * 0.30 +
            centerScore * 0.30 +
            lightScore * 0.15 +
            stabilityScore * 0.25
        );


        /*
         * OPTIMASI: Progress lebih agresif
         */
        if (finalScore > enrollmentProgress) {
            enrollmentProgress = enrollmentProgress * 0.50 + finalScore * 0.50;
        } else {
            enrollmentProgress = enrollmentProgress * 0.70 + finalScore * 0.30;
        }

        // Boost progress jika kondisi sangat baik
        if (finalScore >= 90 && sizeScore >= 80 && centerScore >= 85) {
            enrollmentProgress = Math.min(100, enrollmentProgress + 15);
        }

        enrollmentProgress = clamp(enrollmentProgress, 0, 100);


        updateEnrollmentProgress(
            enrollmentProgress
        );


        /*
         * Ready threshold - OPTIMASI: Lebih permisif
         */

        const ready =
            finalScore >= 85 &&
            faceArea >= 0.06 &&
            faceArea <= 0.65 &&
            centerScore >= 80 &&
            stabilityScore >= 70;


        if (
            ready &&
            enrollmentProgress >= 90
        ) {

            enrollmentReadyFrames +=
                1;

        } else {

            enrollmentReadyFrames =
                0;

        }


        /*
         * Status message - OPTIMASI: Lebih ringkas
         */

        if (enrollmentProgress < 40) {
            setValidation("Mendeteksi wajah...", true);
        } else if (enrollmentProgress < 70) {
            setValidation("Analisis kualitas wajah...", true);
        } else if (enrollmentProgress < 90) {
            setValidation("Pertahankan posisi...", true);
        } else if (enrollmentProgress < 100) {
            setValidation("Hampir selesai...", true);
        } else {
            setValidation("Siap!", true);
        }


        /*
         * 100% - OPTIMASI: Capture lebih cepat
         */

        if (
            enrollmentProgress >= 100 &&
            enrollmentReadyFrames >=
            REQUIRED_CAPTURE_FRAMES
        ) {

            await captureEnrollment(
                detection
            );

        }

    } catch (
        error
    ) {

        console.error(
            "[Enrollment Detection]",
            error
        );

    } finally {

        enrollmentProcessing =
            false;

    }

}


/* =========================================================
   ENROLLMENT SCORING - OPTIMASI: Fungsi lebih efisien
========================================================= */

function calculateSizeScore(
    ratio
) {

    // OPTIMASI: Perhitungan lebih langsung
    if (ratio >= 0.10 && ratio <= 0.35) {
        return 95 + (1 - Math.abs(ratio - 0.22) * 200);
    } else if (ratio > 0.35 && ratio <= 0.55) {
        return 70 - (ratio - 0.35) * 150;
    } else if (ratio >= 0.05 && ratio < 0.10) {
        return 50 + (ratio - 0.05) * 800;
    } else {
        return Math.max(0, 100 - Math.abs(ratio - 0.22) * 250);
    }

}


function calculateCenterScore(
    box,
    width,
    height
) {

    const faceCenterX =
        box.x + box.width / 2;
    const faceCenterY =
        box.y + box.height / 2;
    const frameCenterX =
        width / 2;
    const frameCenterY =
        height / 2;

    const distance = Math.hypot(
        (faceCenterX - frameCenterX) / width,
        (faceCenterY - frameCenterY) / height
    );

    return clamp(100 - (distance * 350), 0, 100);

}


function calculateBrightness(
    video
) {

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width = 16; // OPTIMASI: Resolusi lebih rendah
    canvas.height = 12;

    const context =
        canvas.getContext(
            "2d",
            { willReadFrequently: true }
        );

    if (!context) {
        return 128;
    }

    context.drawImage(video, 0, 0, 16, 12);

    const image = context.getImageData(0, 0, 16, 12);
    let sum = 0;

    for (let i = 0; i < image.data.length; i += 4) {
        const r = image.data[i];
        const g = image.data[i + 1];
        const b = image.data[i + 2];
        sum += (0.299 * r) + (0.587 * g) + (0.114 * b);
    }

    return sum / (image.data.length / 4);

}


function calculateLightScore(
    brightness
) {

    if (brightness >= 70 && brightness <= 200) {
        return 100 - Math.abs(brightness - 135) * 0.5;
    } else if (brightness < 70) {
        return clamp(brightness / 70 * 100, 0, 100);
    } else {
        return clamp(100 - (brightness - 200) / 60 * 100, 0, 100);
    }

}


function calculateStabilityScore(
    box
) {

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    stabilityHistory.push({
        x: centerX,
        y: centerY,
        width: box.width,
        height: box.height
    });

    if (stabilityHistory.length > STABILITY_HISTORY) {
        stabilityHistory.shift();
    }

    if (stabilityHistory.length < STABILITY_HISTORY) {
        return 50;
    }

    const first = stabilityHistory[0];
    const last = stabilityHistory[stabilityHistory.length - 1];

    const movement = Math.hypot(last.x - first.x, last.y - first.y);
    const sizeMovement = Math.abs(last.width - first.width);

    return clamp(100 - (movement * 1.5) - (sizeMovement * 1.2), 0, 100);

}


/* =========================================================
   ENROLLMENT PROGRESS
========================================================= */

function updateEnrollmentProgress(
    value
) {

    enrollmentProgress =
        clamp(
            value,
            0,
            100
        );


    const percentage =
        Math.round(
            enrollmentProgress
        );


    aiProgress.style.width =
        `${percentage}%`;


    aiPercent.textContent =
        `${percentage}%`;

}


/* =========================================================
   CAPTURE ENROLLMENT
========================================================= */

async function captureEnrollment(
    detection
) {

    /*
     * Prevent another interval
     * from firing.
     */

    stopEnrollmentCamera();


    /*
     * Create image.
     */

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        enrollmentVideo.videoWidth;


    canvas.height =
        enrollmentVideo.videoHeight;


    const context =
        canvas.getContext(
            "2d"
        );


    if (!context) {

        setValidation(
            "Gagal memproses gambar.",
            false
        );

        return;

    }


    /*
     * Mirror image to match
     * the preview.
     */

    context.translate(
        canvas.width,
        0
    );


    context.scale(
        -1,
        1
    );


    context.drawImage(
        enrollmentVideo,
        0,
        0,
        canvas.width,
        canvas.height
    );


    const imageData =
        canvas.toDataURL(
            "image/jpeg",
            0.90
        );


    /*
     * Save descriptor.
     */

    currentEnrollmentDescriptor =
        Array.from(
            detection.descriptor
        );


    currentEnrollmentImage =
        imageData;


    /*
     * Display captured image.
     */

    enrollmentImage.src =
        imageData;


    enrollmentImage.classList.add(
        "active"
    );


    enrollmentVideo.classList.remove(
        "active"
    );


    previewPlaceholder.style.display =
        "none";


    /*
     * Final bar.
     */

    updateEnrollmentProgress(
        100
    );


    setValidation(
        "Foto wajah berhasil diverifikasi dan siap disimpan.",
        true
    );


    updateSaveButton();


    showToast(
        "Wajah berhasil ditangkap."
    );

}


/* =========================================================
   UPLOAD IMAGE
========================================================= */

uploadButton.addEventListener(
    "click",
    () => {

        photoInput.click();

    }
);


photoInput.addEventListener(
    "change",
    async event => {

        const file =
            event.target.files?.[0];


        if (!file) {

            return;

        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            setValidation(
                "File bukan gambar.",
                false
            );

            return;

        }


        try {

            stopEnrollmentCamera();


            resetEnrollmentState();


            const image =
                await faceapi.bufferToImage(
                    file
                );


            enrollmentImage.src =
                image.src;


            enrollmentImage.classList.add(
                "active"
            );


            previewPlaceholder.style.display =
                "none";


            const detections =
                await faceapi
                    .detectAllFaces(
                        image,
                        new faceapi.TinyFaceDetectorOptions({

                            inputSize:
                                224, // OPTIMASI

                            scoreThreshold:
                                0.55

                        })
                    )
                    .withFaceLandmarks()
                    .withFaceDescriptors();


            /*
             * Must be exactly one face.
             */

            if (
                detections.length === 0
            ) {

                setValidation(
                    "Foto ditolak: wajah tidak ditemukan.",
                    false
                );

                return;

            }


            if (
                detections.length > 1
            ) {

                setValidation(
                    "Foto ditolak: lebih dari satu wajah terdeteksi.",
                    false
                );

                return;

            }


            const detection =
                detections[0];


            const box =
                detection.detection.box;


            const areaRatio =
                (
                    box.width *
                    box.height
                ) /
                (
                    image.width *
                    image.height
                );


            /*
             * Basic quality filter.
             */

            if (
                areaRatio <
                0.04
            ) {

                setValidation(
                    "Wajah terlalu kecil dalam foto.",
                    false
                );

                return;

            }


            currentEnrollmentDescriptor =
                Array.from(
                    detection.descriptor
                );


            currentEnrollmentImage =
                image.src;


            updateEnrollmentProgress(
                100
            );


            setValidation(
                "Foto diterima. Wajah berhasil dianalisis.",
                true
            );


            updateSaveButton();


        } catch (
            error
        ) {

            console.error(
                "[Upload Image]",
                error
            );


            setValidation(
                "Foto gagal dianalisis.",
                false
            );

        } finally {

            /*
             * Reset file input so the same
             * image can be selected again.
             */

            photoInput.value =
                "";

        }

    }
);


/* =========================================================
   FORM VALIDATION
========================================================= */

[
    nisnInput,
    studentNameInput,
    studentClassInput
].forEach(
    input => {

        input.addEventListener(
            "input",
            updateSaveButton
        );

    }
);


function updateSaveButton() {

    const nisn =
        nisnInput.value.trim();


    const name =
        studentNameInput.value.trim();


    const className =
        studentClassInput.value.trim();


    saveStudentButton.disabled =
        !(
            modelsReady &&
            /^\d+$/.test(
                nisn
            ) &&
            nisn.length >= 4 &&
            name.length >= 2 &&
            className.length >= 1 &&
            Array.isArray(
                currentEnrollmentDescriptor
            ) &&
            currentEnrollmentDescriptor.length > 0
        );

}


/* =========================================================
   SAVE STUDENT
========================================================= */

saveStudentButton.addEventListener(
    "click",
    () => {

        const nisn =
            nisnInput.value.trim();


        const name =
            studentNameInput.value.trim();


        const className =
            studentClassInput.value.trim();


        if (
            !/^\d+$/.test(
                nisn
            )
        ) {

            showToast(
                "NISN hanya boleh berisi angka."
            );

            return;

        }


        if (
            name.length < 2
        ) {

            showToast(
                "Nama siswa belum valid."
            );

            return;

        }


        if (
            !className
        ) {

            showToast(
                "Kelas belum diisi."
            );

            return;

        }


        if (
            !currentEnrollmentDescriptor
        ) {

            showToast(
                "Wajah belum diverifikasi."
            );

            return;

        }


        const students =
            getStudents();


        const duplicate =
            students.find(
                student =>
                    student.nisn ===
                    nisn
            );


        if (
            duplicate
        ) {

            showToast(
                "NISN tersebut sudah terdaftar."
            );

            return;

        }


        const student = {

            id:
                createId(),

            nisn:
                nisn,

            name:
                name,

            className:
                className,

            descriptor:
                currentEnrollmentDescriptor,

            registeredAt:
                new Date()
                    .toISOString()

        };


        students.push(
            student
        );


        saveStudents(
            students
        );


        /*
         * Reset form.
         */

        nisnInput.value =
            "";

        studentNameInput.value =
            "";

        studentClassInput.value =
            "";


        currentEnrollmentDescriptor =
            null;


        currentEnrollmentImage =
            null;


        enrollmentImage.src =
            "";


        enrollmentImage.classList.remove(
            "active"
        );


        previewPlaceholder.style.display =
            "flex";


        resetEnrollmentState();


        updateSaveButton();


        renderDatabase();


        showToast(
            `${name} berhasil didaftarkan.`
        );

    }
);


/* =========================================================
   RESET ENROLLMENT
========================================================= */

function resetEnrollmentState() {

    enrollmentProgress =
        0;


    enrollmentReadyFrames =
        0;


    stabilityHistory =
        [];
        
    lastEnrollmentDetection = null;
    detectionCounter = 0;


    updateEnrollmentProgress(
        0
    );


    setValidation(
        "",
        true
    );

}


/* =========================================================
   VALIDATION MESSAGE
========================================================= */

function setValidation(
    message,
    success
) {

    faceValidation.textContent =
        message;


    faceValidation.className =
        "validation-message";


    if (
        message
    ) {

        faceValidation.classList.add(
            success
                ? "success"
                : "error"
        );

    }

}


/* =========================================================
   CAMERA ERROR MESSAGE
========================================================= */

function getCameraErrorMessage(
    error
) {

    if (
        error?.name ===
        "NotAllowedError"
    ) {

        return (
            "Izin kamera ditolak. Izinkan akses kamera pada browser."
        );

    }


    if (
        error?.name ===
        "NotFoundError"
    ) {

        return (
            "Tidak ada kamera yang ditemukan."
        );

    }


    if (
        error?.name ===
        "NotReadableError"
    ) {

        return (
            "Kamera sedang digunakan aplikasi lain."
        );

    }


    if (
        error?.name ===
        "SecurityError"
    ) {

        return (
            "Kamera membutuhkan HTTPS atau localhost."
        );

    }


    return (
        "Kamera tidak dapat digunakan pada perangkat ini."
    );

}


/* =========================================================
   DATABASE RENDER - WITH EXPORT FUNCTIONS
========================================================= */

function renderDatabase() {

    const students =
        getStudents();


    const attendance =
        getAttendance();


    const today =
        getLocalDate();


    const todayAttendance =
        attendance.filter(
            item =>
                item.date ===
                today
        );


    totalStudents.textContent =
        students.length;


    totalPresent.textContent =
        todayAttendance.length;


    const percentage =
        students.length > 0
            ? Math.round(
                (
                    todayAttendance.length /
                    students.length
                ) * 100
            )
            : 0;


    attendancePercentage.textContent =
        `${Math.min(
            percentage,
            100
        )}%`;


    attendanceTableBody.innerHTML =
        "";


    if (
        attendance.length === 0
    ) {

        emptyDatabase.style.display =
            "block";

        return;

    }


    emptyDatabase.style.display =
        "none";


    attendance.forEach(
        (
            item,
            index
        ) => {

            const date =
                new Date(
                    item.timestamp
                );


            const dateText =
                date.toLocaleDateString(
                    "id-ID"
                );


            const timeText =
                date.toLocaleTimeString(
                    "id-ID",
                    {
                        hour:
                            "2-digit",

                        minute:
                            "2-digit",

                        second:
                            "2-digit"
                    }
                );


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(
                            item.nisn
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        item.name
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.className
                    )}
                </td>

                <td>

                    <span class="status-pill">

                        <span class="status-dot"></span>

                        ${escapeHTML(
                            item.status
                        )}

                    </span>

                </td>

                <td>
                    ${dateText}
                </td>

                <td>
                    ${timeText}
                </td>

                <td>
                    ${escapeHTML(
                        item.method
                    )}
                </td>

                <td>
                    ${Number(
                        item.confidence
                    ).toFixed(1)}%
                </td>

            `;


            attendanceTableBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   EXPORT DATABASE FUNCTIONALITY
========================================================= */

function showExportDialog() {
    // Hapus dialog yang sudah ada
    const existingDialog = document.getElementById('exportDialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    // Buat dialog container
    const dialog = document.createElement('div');
    dialog.id = 'exportDialog';
    dialog.className = 'export-dialog-overlay';

    dialog.innerHTML = `
        <div class="export-dialog">
            <div class="export-dialog-header">
                <h3>📊 Export Data Presensi</h3>
                <button class="export-dialog-close" onclick="this.closest('#exportDialog').remove()">✕</button>
            </div>
            
            <div class="export-dialog-body">
                <div class="export-date-range">
                    <div class="export-date-group">
                        <label>Dari Tanggal</label>
                        <input type="date" id="exportStartDate" value="${getDefaultStartDate()}">
                    </div>
                    <div class="export-date-group">
                        <label>Sampai Tanggal</label>
                        <input type="date" id="exportEndDate" value="${getLocalDate()}">
                    </div>
                </div>
                
                <div class="export-format-options">
                    <button class="export-format-btn" data-format="xlsx">
                        <span>📊</span> XLSX
                    </button>
                    <button class="export-format-btn" data-format="csv">
                        <span>📄</span> CSV
                    </button>
                    <button class="export-format-btn" data-format="image">
                        <span>🖼️</span> Gambar
                    </button>
                </div>
                
                <div class="export-preview">
                    <p>Data akan diekspor berdasarkan rentang tanggal yang dipilih.</p>
                </div>
            </div>
            
            <div class="export-dialog-footer">
                <button class="export-cancel-btn" onclick="this.closest('#exportDialog').remove()">Batal</button>
                <button class="export-confirm-btn" id="exportConfirmBtn">Export Data</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Event listener untuk tombol export
    document.getElementById('exportConfirmBtn').addEventListener('click', () => {
        const startDate = document.getElementById('exportStartDate').value;
        const endDate = document.getElementById('exportEndDate').value;
        
        if (!startDate || !endDate) {
            showToast('Pilih rentang tanggal terlebih dahulu.');
            return;
        }
        
        if (startDate > endDate) {
            showToast('Tanggal mulai harus sebelum tanggal akhir.');
            return;
        }
        
        // Ambil format yang dipilih
        const selectedBtn = document.querySelector('.export-format-btn.active');
        if (!selectedBtn) {
            showToast('Pilih format export terlebih dahulu.');
            return;
        }
        
        const format = selectedBtn.dataset.format;
        exportAttendanceData(startDate, endDate, format);
    });

    // Event listener untuk pilihan format
    document.querySelectorAll('.export-format-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
}

function exportAttendanceData(startDate, endDate, format) {
    const attendance = getAttendance();
    
    // Filter berdasarkan rentang tanggal
    const filtered = attendance.filter(item => {
        return item.date >= startDate && item.date <= endDate;
    });

    if (filtered.length === 0) {
        showToast('Tidak ada data dalam rentang tanggal tersebut.');
        return;
    }

    // Siapkan data untuk export
    const exportData = filtered.map((item, index) => ({
        'No': index + 1,
        'NISN': item.nisn,
        'Nama': item.name,
        'Kelas': item.className,
        'Status': item.status,
        'Tanggal': item.date,
        'Waktu': new Date(item.timestamp).toLocaleTimeString('id-ID'),
        'Metode': item.method,
        'Confidence': `${Number(item.confidence).toFixed(1)}%`
    }));

    // Export berdasarkan format
    switch(format) {
        case 'xlsx':
            exportToXLSX(exportData);
            break;
        case 'csv':
            exportToCSV(exportData);
            break;
        case 'image':
            exportToImage(exportData);
            break;
        default:
            showToast('Format tidak didukung.');
    }

    // Tutup dialog
    const dialog = document.getElementById('exportDialog');
    if (dialog) dialog.remove();
}

function exportToXLSX(data) {
    // Pastikan library tersedia
    if (typeof XLSX === 'undefined') {
        // Load library jika belum ada
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => {
            createXLSX(data);
        };
        document.head.appendChild(script);
        showToast('Memuat library XLSX...');
        return;
    }
    createXLSX(data);
}

function createXLSX(data) {
    try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        // Atur lebar kolom
        ws['!cols'] = [
            { wch: 5 },   // No
            { wch: 15 },  // NISN
            { wch: 25 },  // Nama
            { wch: 15 },  // Kelas
            { wch: 12 },  // Status
            { wch: 15 },  // Tanggal
            { wch: 12 },  // Waktu
            { wch: 18 },  // Metode
            { wch: 12 }   // Confidence
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Presensi');
        
        // Generate file
        const fileName = `presensi_${getLocalDate()}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showToast(`Berhasil export ${data.length} data ke ${fileName}`);
    } catch (error) {
        console.error('[Export XLSX]', error);
        showToast('Gagal export ke XLSX.');
    }
}

function exportToCSV(data) {
    try {
        // Buat header
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Header
        csvRows.push(headers.join(','));
        
        // Data
        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header] || '';
                // Escape jika ada koma atau quote
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            });
            csvRows.push(values.join(','));
        }
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `presensi_${getLocalDate()}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        
        showToast(`Berhasil export ${data.length} data ke CSV.`);
    } catch (error) {
        console.error('[Export CSV]', error);
        showToast('Gagal export ke CSV.');
    }
}

function exportToImage(data) {
    try {
        // Buat canvas untuk gambar
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Hitung dimensi
        const cellPadding = 12;
        const headerHeight = 40;
        const rowHeight = 35;
        const colWidths = [60, 120, 180, 120, 90, 120, 100, 140, 100];
        const headers = ['No', 'NISN', 'Nama', 'Kelas', 'Status', 'Tanggal', 'Waktu', 'Metode', 'Confidence'];
        
        const totalWidth = colWidths.reduce((a, b) => a + b, 0) + cellPadding * 2;
        const totalHeight = headerHeight + (data.length + 1) * rowHeight + cellPadding * 2;
        
        canvas.width = totalWidth;
        canvas.height = totalHeight;
        
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalWidth, totalHeight);
        
        // Title
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 16px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`📊 Laporan Presensi ${getLocalDate()}`, totalWidth / 2, 30);
        
        let y = headerHeight + cellPadding;
        
        // Header row
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(cellPadding, y, totalWidth - cellPadding * 2, rowHeight);
        
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 11px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let x = cellPadding;
        headers.forEach((header, i) => {
            ctx.fillText(header, x + colWidths[i] / 2, y + rowHeight / 2);
            x += colWidths[i];
        });
        
        y += rowHeight;
        
        // Data rows
        ctx.font = '10px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        data.forEach((row, rowIndex) => {
            const isEven = rowIndex % 2 === 0;
            if (isEven) {
                ctx.fillStyle = '#fafafa';
                ctx.fillRect(cellPadding, y, totalWidth - cellPadding * 2, rowHeight);
            }
            
            ctx.fillStyle = '#111827';
            x = cellPadding;
            const values = Object.values(row);
            values.forEach((val, i) => {
                let displayVal = String(val);
                if (i === 8) { // Confidence
                    displayVal = String(val);
                }
                ctx.fillText(displayVal, x + colWidths[i] / 2, y + rowHeight / 2);
                x += colWidths[i];
            });
            
            y += rowHeight;
        });
        
        // Border
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(cellPadding, headerHeight + cellPadding, totalWidth - cellPadding * 2, (data.length + 1) * rowHeight);
        
        // Convert to image
        const link = document.createElement('a');
        link.download = `presensi_${getLocalDate()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showToast(`Berhasil export ${data.length} data ke gambar.`);
    } catch (error) {
        console.error('[Export Image]', error);
        showToast('Gagal export ke gambar.');
    }
}


/* =========================================================
   FULLSCREEN
========================================================= */

fullscreenButton.addEventListener(
    "click",
    async () => {

        const stage =
            document.querySelector(
                ".attendance-stage"
            );


        try {

            if (
                !document.fullscreenElement
            ) {

                await stage.requestFullscreen();

            } else {

                await document.exitFullscreen();

            }

        } catch (
            error
        ) {

            console.error(
                "[Fullscreen]",
                error
            );

            showToast(
                "Fullscreen tidak tersedia."
            );

        }

    }
);


/* =========================================================
   ATTENDANCE CAMERA BUTTON
========================================================= */

attendanceCameraButton.addEventListener(
    "click",
    () => {

        if (
            attendanceStream
        ) {

            stopAttendanceCamera();

        } else {

            startAttendanceCamera();

        }

    }
);


/* =========================================================
   ENROLLMENT CAMERA BUTTON
========================================================= */

cameraEnrollmentButton.addEventListener(
    "click",
    () => {

        if (
            enrollmentStream
        ) {

            stopEnrollmentCamera();


            setValidation(
                "Kamera dimatikan.",
                true
            );

        } else {

            startEnrollmentCamera();

        }

    }
);


/* =========================================================
   VISIBILITY
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            stopAttendanceCamera();

            stopEnrollmentCamera();

        }

    }
);


/* =========================================================
   PAGE UNLOAD
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        stopAttendanceCamera();

        stopEnrollmentCamera();

    }
);


/* =========================================================
   WINDOW RESIZE
========================================================= */

let resizeTimer =
    null;


window.addEventListener(
    "resize",
    () => {

        clearTimeout(
            resizeTimer
        );


        resizeTimer =
            setTimeout(
                () => {

                    /*
                     * The outlines are recreated
                     * on the next inference cycle.
                     */

                },
                100
            );

    }
);


/* =========================================================
   HELPERS
========================================================= */

function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );

}


function createId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
        "function"
    ) {

        return window.crypto.randomUUID();

    }


    return (
        Date.now().toString(
            36
        ) +
        Math.random()
            .toString(
                36
            )
            .slice(2)
    );

}


function getLocalDate() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        )
        .padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


/* =========================================================
   INITIALIZATION
========================================================= */

renderDatabase();


// PERBAIKAN: Tunggu face-api.js siap sebelum load models
if (typeof faceapi !== 'undefined') {
    // Tunggu sebentar untuk memastikan face-api.js fully loaded
    setTimeout(loadModels, 100);
} else {
    // Coba load ulang dengan interval jika face-api.js belum siap
    let checkInterval = setInterval(() => {
        if (typeof faceapi !== 'undefined') {
            clearInterval(checkInterval);
            setTimeout(loadModels, 100);
        }
    }, 500);

    // Timeout jika terlalu lama
    setTimeout(() => {
        clearInterval(checkInterval);
        if (!modelsReady) {
            showModelError(
                "Library face-api.js tidak ditemukan",
                "Pastikan koneksi internet aktif dan refresh halaman."
            );
        }
    }, 10000);
}

/* =========================================================
   EXPORT BUTTON
========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('exportButton');
    if (exportButton) {
        exportButton.addEventListener('click', showExportDialog);
    }
});

// Tambahkan juga jika tombol dibuat dinamis
// Cek setiap render database
const originalRenderDatabase = renderDatabase;
renderDatabase = function() {
    originalRenderDatabase();
    // Cek jika tombol export ada
    const exportButton = document.getElementById('exportButton');
    if (exportButton && !exportButton._listenerAdded) {
        exportButton.addEventListener('click', showExportDialog);
        exportButton._listenerAdded = true;
    }
};