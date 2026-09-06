"use strict";

/* =========================================================
   AMANAH ID v3.0 - ULTRA FAST & ACCURATE
========================================================= */

(function() {
    console.log('[Amanah ID] Starting...');

    // =========================================================
    // DOM REFS
    // =========================================================
    
    function getEl(id) {
        var el = document.getElementById(id);
        if (!el) console.warn('[Amanah ID] Element not found:', id);
        return el;
    }

    function getAll(selector) {
        return document.querySelectorAll(selector);
    }

    var DOM = {
        authPage: getEl('authPage'),
        mainApp: getEl('mainApp'),
        loginForm: getEl('loginForm'),
        signupForm: getEl('signupForm'),
        loginEmail: getEl('loginEmail'),
        loginPassword: getEl('loginPassword'),
        loginAgree: getEl('loginAgree'),
        loginButton: getEl('loginButton'),
        signupName: getEl('signupName'),
        signupEmail: getEl('signupEmail'),
        signupPassword: getEl('signupPassword'),
        signupConfirm: getEl('signupConfirm'),
        signupAgree: getEl('signupAgree'),
        signupButton: getEl('signupButton'),
        termsLink: getEl('termsLink'),
        termsModal: getEl('termsModal'),
        termsModalClose: getEl('termsModalClose'),
        termsModalAgree: getEl('termsModalAgree'),
        profileButton: getEl('profileButton'),
        navAvatar: getEl('navAvatar'),
        profileModal: getEl('profileModal'),
        profileClose: getEl('profileClose'),
        profileAvatar: getEl('profileAvatar'),
        profilePhotoInput: getEl('profilePhotoInput'),
        profileName: getEl('profileName'),
        profileEmail: getEl('profileEmail'),
        profilePassword: getEl('profilePassword'),
        profileSaveButton: getEl('profileSaveButton'),
        logoutButton: getEl('logoutButton'),
        toast: getEl('toast'),
        navItems: getAll('.nav-item'),
        pages: getAll('.page'),
        attendanceVideo: getEl('attendanceVideo'),
        attendanceOverlay: getEl('attendanceOverlay'),
        attendanceStatus: getEl('attendanceStatus'),
        attendanceError: getEl('attendanceError'),
        attendanceCameraButton: getEl('attendanceCameraButton'),
        fullscreenButton: getEl('fullscreenButton'),
        welcomeMessage: getEl('welcomeMessage'),
        totalStudents: getEl('totalStudents'),
        totalPresent: getEl('totalPresent'),
        attendancePercentage: getEl('attendancePercentage'),
        totalHistory: getEl('totalHistory'),
        attendanceTableBody: getEl('attendanceTableBody'),
        emptyDatabase: getEl('emptyDatabase'),
        nisnInput: getEl('nisn'),
        studentNameInput: getEl('studentName'),
        studentClassInput: getEl('studentClass'),
        saveStudentButton: getEl('saveStudentButton'),
        enrollmentVideo: getEl('enrollmentVideo'),
        enrollmentImage: getEl('enrollmentImage'),
        previewPlaceholder: getEl('previewPlaceholder'),
        uploadButton: getEl('uploadButton'),
        cameraEnrollmentButton: getEl('cameraEnrollmentButton'),
        photoInput: getEl('photoInput'),
        faceValidation: getEl('faceValidation'),
        aiProgress: getEl('aiProgress'),
        aiPercent: getEl('aiPercent'),
        dbSearch: getEl('dbSearch'),
        dbDateStart: getEl('dbDateStart'),
        dbDateEnd: getEl('dbDateEnd'),
        dbExportBtn: getEl('dbExportBtn'),
        dbDeleteAllBtn: getEl('dbDeleteAllBtn'),
        modelLoading: getEl('modelLoading')
    };

    // =========================================================
    // STATE
    // =========================================================

    var modelsReady = false;
    var isAuthenticated = false;
    var currentUser = null;
    var modelLoadingStarted = false;

    var attendanceStream = null;
    var enrollmentStream = null;
    var attendanceTimer = null;
    var enrollmentTimer = null;
    var attendanceProcessing = false;
    var enrollmentProcessing = false;

    var currentEnrollmentDescriptor = null;
    var currentEnrollmentImage = null;
    var enrollmentProgress = 0;
    var enrollmentReadyFrames = 0;
    var stabilityHistory = [];
    var enrollmentStage = 'front'; // front, right, left

    var attendanceMatchStudentId = null;
    var attendanceMatchFrames = 0;
    var attendanceCooldown = new Map();

    var STORAGE_KEYS = {
        USERS: 'amanah_users_v3',
        STUDENTS: 'amanah_students_v3',
        ATTENDANCE: 'amanah_attendance_v3',
        SESSION: 'amanah_session',
        LANGUAGE: 'amanah_language'
    };

    // =========================================================
    // LANGUAGE - LENGKAP 100% (DEFAULT ENGLISH)
    // =========================================================

    var translations = {
        id: {
            login: 'Masuk',
            signup: 'Daftar',
            logout: 'Keluar',
            profile: 'Profil',
            attendance: 'Presensi',
            database: 'Database',
            form: 'Formulir',
            subtitle: 'Sistem Presensi Wajah',
            email: 'Email',
            password: 'Kata Sandi',
            confirmPassword: 'Konfirmasi Sandi',
            fullName: 'Nama Lengkap',
            saveProfile: 'Simpan Profil',
            changePhoto: 'Ganti foto',
            language: 'Bahasa',
            agree: 'Saya setuju dengan',
            terms: 'Syarat & Ketentuan',
            termsTitle: 'Syarat & Ketentuan',
            terms1Title: '1. Penggunaan Layanan',
            terms1Desc: 'Dengan menggunakan layanan Amanah ID, Anda setuju untuk menggunakan sistem presensi wajah sesuai dengan ketentuan yang berlaku.',
            terms2Title: '2. Privasi Data',
            terms2Desc: 'Data wajah dan identitas Anda akan disimpan secara aman dan hanya digunakan untuk keperluan presensi di lingkungan sekolah.',
            terms3Title: '3. Keamanan',
            terms3Desc: 'Anda bertanggung jawab atas keamanan akun Anda. Jangan membagikan kredensial login kepada pihak lain.',
            terms4Title: '4. Larangan',
            terms4Desc: 'Dilarang menggunakan sistem ini untuk tujuan yang melanggar hukum atau menyalahgunakan fitur yang tersedia.',
            terms5Title: '5. Perubahan Ketentuan',
            terms5Desc: 'Kami berhak mengubah syarat dan ketentuan ini sewaktu-waktu dengan pemberitahuan terlebih dahulu.',
            cameraOff: 'Kamera belum aktif',
            cameraOn: 'Mencari wajah...',
            cameraErrorTitle: 'Kamera tidak dapat digunakan',
            cameraErrorDesc: 'Berikan izin kamera pada browser dan gunakan HTTPS atau localhost.',
            reportData: 'LAPORAN & DATA',
            databaseTitle: 'Database Presensi',
            databaseDesc: 'Kelola riwayat presensi, filter tanggal, & ekspor laporan.',
            totalStudents: 'TOTAL SISWA',
            presentToday: 'HADIR HARI INI',
            percentage: 'PERSENTASE',
            totalHistory: 'TOTAL RIWAYAT',
            name: 'Nama',
            class: 'Kelas',
            status: 'Status',
            date: 'Tanggal',
            time: 'Waktu',
            method: 'Metode',
            confidence: 'Confidence',
            action: 'Aksi',
            emptyTitle: 'Belum ada data presensi',
            emptyDesc: 'Data akan muncul setelah siswa melakukan verifikasi wajah.',
            registration: 'REGISTRASI',
            formTitle: 'Formulir Siswa',
            formDesc: 'Daftarkan identitas dan wajah siswa untuk presensi.',
            studentIdentity: 'Identitas Siswa',
            faceVerification: 'Verifikasi Wajah',
            faceVerificationDesc: 'Gunakan kamera atau upload satu foto wajah untuk registrasi.',
            saveStudent: 'Simpan Data Siswa',
            uploadPhoto: 'Upload Foto',
            useCamera: 'Gunakan Kamera',
            noPhoto: 'Belum ada foto wajah',
            aiAnalysis: 'Analisis AI',
            search: 'Cari nama, NISN, atau kelas...',
            export: 'Export',
            deleteAll: 'Hapus Semua',
            save: 'Simpan',
            welcome: 'Selamat datang',
            presensi: 'presensi',
            deleteConfirmTitle: 'Hapus Data Presensi',
            deleteConfirmDesc: 'Apakah Anda yakin ingin menghapus data ini?',
            deleteAllConfirmTitle: 'Hapus Semua Data?',
            deleteAllConfirmDesc: 'Anda akan menghapus SEMUA data presensi dan siswa.',
            deleteConfirmSub: 'Tindakan ini tidak dapat dibatalkan!',
            cancel: 'Batal',
            confirm: 'Hapus',
            confirmAll: 'Hapus Semua',
            loginAgree: 'Saya setuju dengan Syarat & Ketentuan',
            frontFace: 'Posisikan wajah dari depan',
            rightFace: 'Posisikan wajah dari kanan',
            leftFace: 'Posisikan wajah dari kiri',
            faceCaptured: 'Wajah berhasil ditangkap!',
            faceVerified: 'Foto wajah berhasil diverifikasi!',
            studentRegistered: 'berhasil didaftarkan!',
            attendanceRecorded: 'presensi!',
            profileSaved: 'Profil berhasil disimpan.',
            photoChanged: 'Foto profil diperbarui.',
            photoDeleted: 'Foto profil dihapus.',
            noPhoto: 'Tidak ada foto untuk dihapus.',
            cameraFailed: 'Kamera gagal diakses.',
            cameraUnavailable: 'Kamera tidak tersedia',
            invalidName: 'Nama belum valid.',
            invalidEmail: 'Email tidak valid.',
            invalidPassword: 'Password minimal 6 karakter.',
            emailRequired: 'Harap isi email dan password.',
            invalidCredentials: 'Email atau password salah.',
            emailTaken: 'Email sudah terdaftar.',
            accountCreated: 'Akun berhasil dibuat! Silakan login.',
            logoutSuccess: 'Keluar berhasil.',
            agreeRequired: 'Harap setujui syarat & ketentuan.',
            fillAllFields: 'Harap isi semua field.',
            termsAgreed: 'Terima kasih telah menyetujui syarat & ketentuan.',
            nisnOnlyNumbers: 'NISN hanya angka.',
            nisnTaken: 'NISN sudah terdaftar.',
            faceNotVerified: 'Wajah belum diverifikasi.',
            noData: 'Tidak ada data.',
            dataDeleted: 'Data dihapus.',
            allDataDeleted: 'Semua data dihapus.',
            exportSuccess: 'Export data berhasil.',
            exportFailed: 'Gagal export.',
            aiReady: 'Sistem AI siap digunakan.',
            aiLoading: 'AI disiapkan...',
            aiFailed: 'AI gagal dimuat.',
            loadingTimeout: 'AI loading timeout',
            retry: 'Coba Lagi',
            fullscreenUnavailable: 'Fullscreen tidak tersedia.',
            confirmDelete: 'Hapus',
            cancelDelete: 'Batal',
            defaultCredentials: 'Default: admin@amanahid.sch.id / admin123',
            enterFullName: 'Masukkan nama lengkap',
            yourEmail: 'email@anda.com',
            minPassword: 'Minimal 6 karakter',
            repeatPassword: 'Ulangi kata sandi'
        },
        en: {
            login: 'Log in',
            signup: 'Sign up',
            logout: 'Log out',
            profile: 'Profile',
            attendance: 'Attendance',
            database: 'Database',
            form: 'Form',
            subtitle: 'Face Recognition System',
            email: 'Email',
            password: 'Password',
            confirmPassword: 'Confirm Password',
            fullName: 'Full Name',
            saveProfile: 'Save Profile',
            changePhoto: 'Change photo',
            language: 'Language',
            agree: 'I agree to the',
            terms: 'Terms & Conditions',
            termsTitle: 'Terms & Conditions',
            terms1Title: '1. Service Usage',
            terms1Desc: 'By using Amanah ID, you agree to use the face recognition system in accordance with applicable regulations.',
            terms2Title: '2. Data Privacy',
            terms2Desc: 'Your face and identity data will be stored securely and only used for attendance purposes within the school environment.',
            terms3Title: '3. Security',
            terms3Desc: 'You are responsible for the security of your account. Do not share your login credentials with others.',
            terms4Title: '4. Prohibitions',
            terms4Desc: 'It is prohibited to use this system for unlawful purposes or to misuse the available features.',
            terms5Title: '5. Changes to Terms',
            terms5Desc: 'We reserve the right to change these terms and conditions at any time with prior notice.',
            cameraOff: 'Camera is off',
            cameraOn: 'Looking for a face...',
            cameraErrorTitle: 'Camera unavailable',
            cameraErrorDesc: 'Allow camera permission and use HTTPS or localhost.',
            reportData: 'REPORTS & DATA',
            databaseTitle: 'Attendance Database',
            databaseDesc: 'Manage attendance history, filter dates, & export reports.',
            totalStudents: 'TOTAL STUDENTS',
            presentToday: 'PRESENT TODAY',
            percentage: 'PERCENTAGE',
            totalHistory: 'TOTAL HISTORY',
            name: 'Name',
            class: 'Class',
            status: 'Status',
            date: 'Date',
            time: 'Time',
            method: 'Method',
            confidence: 'Confidence',
            action: 'Action',
            emptyTitle: 'No attendance data yet',
            emptyDesc: 'Data will appear after students verify their face.',
            registration: 'REGISTRATION',
            formTitle: 'Student Form',
            formDesc: 'Register student identity and face for attendance.',
            studentIdentity: 'Student Identity',
            faceVerification: 'Face Verification',
            faceVerificationDesc: 'Use camera or upload one face photo for registration.',
            saveStudent: 'Save Student Data',
            uploadPhoto: 'Upload Photo',
            useCamera: 'Use Camera',
            noPhoto: 'No face photo yet',
            aiAnalysis: 'AI Analysis',
            search: 'Search name, NISN, or class...',
            export: 'Export',
            deleteAll: 'Delete All',
            save: 'Save',
            welcome: 'Welcome',
            presensi: 'attendance',
            deleteConfirmTitle: 'Delete Attendance Record',
            deleteConfirmDesc: 'Are you sure you want to delete this data?',
            deleteAllConfirmTitle: 'Delete All Data?',
            deleteAllConfirmDesc: 'You are about to delete ALL attendance and student data.',
            deleteConfirmSub: 'This action cannot be undone!',
            cancel: 'Cancel',
            confirm: 'Delete',
            confirmAll: 'Delete All',
            loginAgree: 'I agree to the Terms & Conditions',
            frontFace: 'Position your face from the front',
            rightFace: 'Position your face from the right',
            leftFace: 'Position your face from the left',
            faceCaptured: 'Face captured successfully!',
            faceVerified: 'Face photo verified successfully!',
            studentRegistered: 'registered successfully!',
            attendanceRecorded: 'attendance recorded!',
            profileSaved: 'Profile saved successfully.',
            photoChanged: 'Profile photo updated.',
            photoDeleted: 'Profile photo deleted.',
            noPhoto: 'No photo to delete.',
            cameraFailed: 'Camera access failed.',
            cameraUnavailable: 'Camera unavailable',
            invalidName: 'Name is not valid.',
            invalidEmail: 'Email is not valid.',
            invalidPassword: 'Password must be at least 6 characters.',
            emailRequired: 'Please fill in email and password.',
            invalidCredentials: 'Email or password is incorrect.',
            emailTaken: 'Email is already registered.',
            accountCreated: 'Account created! Please log in.',
            logoutSuccess: 'Logged out successfully.',
            agreeRequired: 'Please agree to the terms & conditions.',
            fillAllFields: 'Please fill in all fields.',
            termsAgreed: 'Thank you for agreeing to the terms & conditions.',
            nisnOnlyNumbers: 'NISN must contain only numbers.',
            nisnTaken: 'NISN is already registered.',
            faceNotVerified: 'Face has not been verified.',
            noData: 'No data available.',
            dataDeleted: 'Data deleted.',
            allDataDeleted: 'All data deleted.',
            exportSuccess: 'Data exported successfully.',
            exportFailed: 'Export failed.',
            aiReady: 'AI system is ready.',
            aiLoading: 'AI is loading...',
            aiFailed: 'AI failed to load.',
            loadingTimeout: 'AI loading timeout',
            retry: 'Retry',
            fullscreenUnavailable: 'Fullscreen not available.',
            confirmDelete: 'Delete',
            cancelDelete: 'Cancel',
            defaultCredentials: 'Default: admin@amanahid.sch.id / admin123',
            enterFullName: 'Enter full name',
            yourEmail: 'your@email.com',
            minPassword: 'Minimum 6 characters',
            repeatPassword: 'Repeat password'
        },
        ar: {
            login: 'تسجيل الدخول',
            signup: 'إنشاء حساب',
            logout: 'تسجيل الخروج',
            profile: 'الملف الشخصي',
            attendance: 'الحضور',
            database: 'قاعدة البيانات',
            form: 'النموذج',
            subtitle: 'نظام التعرف على الوجوه',
            email: 'البريد الإلكتروني',
            password: 'كلمة المرور',
            confirmPassword: 'تأكيد كلمة المرور',
            fullName: 'الاسم الكامل',
            saveProfile: 'حفظ الملف الشخصي',
            changePhoto: 'تغيير الصورة',
            language: 'اللغة',
            agree: 'أوافق على',
            terms: 'الشروط والأحكام',
            termsTitle: 'الشروط والأحكام',
            terms1Title: '1. استخدام الخدمة',
            terms1Desc: 'باستخدام Amanah ID، فإنك توافق على استخدام نظام التعرف على الوجوه وفقًا للوائح المعمول بها.',
            terms2Title: '2. خصوصية البيانات',
            terms2Desc: 'سيتم تخزين بيانات وجهك وهويتك بشكل آمن واستخدامها فقط لأغراض الحضور في بيئة المدرسة.',
            terms3Title: '3. الأمان',
            terms3Desc: 'أنت مسؤول عن أمان حسابك. لا تشارك بيانات تسجيل الدخول الخاصة بك مع الآخرين.',
            terms4Title: '4. المحظورات',
            terms4Desc: 'يحظر استخدام هذا النظام لأغراض غير قانونية أو إساءة استخدام الميزات المتاحة.',
            terms5Title: '5. تغييرات الشروط',
            terms5Desc: 'نحتفظ بالحق في تغيير هذه الشروط والأحكام في أي وقت مع إشعار مسبق.',
            cameraOff: 'الكاميرا غير مفعلة',
            cameraOn: 'جارٍ البحث عن وجه...',
            cameraErrorTitle: 'الكاميرا غير متاحة',
            cameraErrorDesc: 'اسمح بإذن الكاميرا واستخدم HTTPS أو localhost.',
            reportData: 'التقارير والبيانات',
            databaseTitle: 'قاعدة بيانات الحضور',
            databaseDesc: 'إدارة سجل الحضور وتصفية التواريخ وتصدير التقارير.',
            totalStudents: 'إجمالي الطلاب',
            presentToday: 'الحضور اليوم',
            percentage: 'النسبة المئوية',
            totalHistory: 'إجمالي السجل',
            name: 'الاسم',
            class: 'الفصل',
            status: 'الحالة',
            date: 'التاريخ',
            time: 'الوقت',
            method: 'الطريقة',
            confidence: 'الثقة',
            action: 'الإجراء',
            emptyTitle: 'لا توجد بيانات حضور بعد',
            emptyDesc: 'ستظهر البيانات بعد أن يقوم الطلاب بالتحقق من وجوههم.',
            registration: 'التسجيل',
            formTitle: 'استمارة الطالب',
            formDesc: 'تسجيل هوية الطالب ووجهه للحضور.',
            studentIdentity: 'هوية الطالب',
            faceVerification: 'التحقق من الوجه',
            faceVerificationDesc: 'استخدم الكاميرا أو قم بتحميل صورة وجه واحدة للتسجيل.',
            saveStudent: 'حفظ بيانات الطالب',
            uploadPhoto: 'تحميل الصورة',
            useCamera: 'استخدام الكاميرا',
            noPhoto: 'لا توجد صورة وجه بعد',
            aiAnalysis: 'تحليل الذكاء الاصطناعي',
            search: 'ابحث عن الاسم أو NISN أو الفصل...',
            export: 'تصدير',
            deleteAll: 'حذف الكل',
            save: 'حفظ',
            welcome: 'مرحباً',
            presensi: 'الحضور',
            deleteConfirmTitle: 'حذف سجل الحضور',
            deleteConfirmDesc: 'هل أنت متأكد من رغبتك في حذف هذه البيانات؟',
            deleteAllConfirmTitle: 'حذف جميع البيانات؟',
            deleteAllConfirmDesc: 'أنت على وشك حذف جميع بيانات الحضور والطلاب.',
            deleteConfirmSub: 'لا يمكن التراجع عن هذا الإجراء!',
            cancel: 'إلغاء',
            confirm: 'حذف',
            confirmAll: 'حذف الكل',
            loginAgree: 'أوافق على الشروط والأحكام',
            frontFace: 'ضع وجهك من الأمام',
            rightFace: 'ضع وجهك من اليمين',
            leftFace: 'ضع وجهك من اليسار',
            faceCaptured: 'تم التقاط الوجه بنجاح!',
            faceVerified: 'تم التحقق من صورة الوجه بنجاح!',
            studentRegistered: 'تم تسجيل الطالب بنجاح!',
            attendanceRecorded: 'تم تسجيل الحضور!',
            profileSaved: 'تم حفظ الملف الشخصي بنجاح.',
            photoChanged: 'تم تحديث صورة الملف الشخصي.',
            photoDeleted: 'تم حذف صورة الملف الشخصي.',
            noPhoto: 'لا توجد صورة للحذف.',
            cameraFailed: 'فشل الوصول إلى الكاميرا.',
            cameraUnavailable: 'الكاميرا غير متاحة',
            invalidName: 'الاسم غير صالح.',
            invalidEmail: 'البريد الإلكتروني غير صالح.',
            invalidPassword: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.',
            emailRequired: 'يرجى ملء البريد الإلكتروني وكلمة المرور.',
            invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
            emailTaken: 'البريد الإلكتروني مسجل بالفعل.',
            accountCreated: 'تم إنشاء الحساب! يرجى تسجيل الدخول.',
            logoutSuccess: 'تم تسجيل الخروج بنجاح.',
            agreeRequired: 'يرجى الموافقة على الشروط والأحكام.',
            fillAllFields: 'يرجى ملء جميع الحقول.',
            termsAgreed: 'شكراً لموافقتك على الشروط والأحكام.',
            nisnOnlyNumbers: 'يجب أن يتكون رقم NISN من أرقام فقط.',
            nisnTaken: 'رقم NISN مسجل بالفعل.',
            faceNotVerified: 'لم يتم التحقق من الوجه.',
            noData: 'لا توجد بيانات.',
            dataDeleted: 'تم حذف البيانات.',
            allDataDeleted: 'تم حذف جميع البيانات.',
            exportSuccess: 'تم تصدير البيانات بنجاح.',
            exportFailed: 'فشل التصدير.',
            aiReady: 'نظام الذكاء الاصطناعي جاهز.',
            aiLoading: 'جاري تحميل الذكاء الاصطناعي...',
            aiFailed: 'فشل تحميل الذكاء الاصطناعي.',
            loadingTimeout: 'انتهت مهلة تحميل الذكاء الاصطناعي',
            retry: 'إعادة المحاولة',
            fullscreenUnavailable: 'وضع ملء الشاشة غير متاح.',
            confirmDelete: 'حذف',
            cancelDelete: 'إلغاء',
            defaultCredentials: 'البيانات الافتراضية: admin@amanahid.sch.id / admin123',
            enterFullName: 'أدخل الاسم الكامل',
            yourEmail: 'بريدك@الإلكتروني.com',
            minPassword: '6 أحرف على الأقل',
            repeatPassword: 'أعد إدخال كلمة المرور'
        }
    };

    var currentLang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en';

    function translate(key) {
        return (translations[currentLang] && translations[currentLang][key]) || 
               (translations['en'] && translations['en'][key]) || key;
    }

    function applyLanguage(lang) {
        if (!translations[lang]) return;
        currentLang = lang;
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
        
        document.documentElement.lang = lang === 'ar' ? 'ar-KW' : lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        // SEMUA elemen dengan data-i18n
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var key = el.dataset.i18n;
            var text = translate(key);
            if (text) el.textContent = text;
        });
        
        // Placeholder untuk input
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
            var key = el.dataset.i18nPlaceholder;
            var text = translate(key);
            if (text) el.placeholder = text;
        });
        
        // Language options
        document.querySelectorAll('.lang-opt').forEach(function(opt) {
            opt.classList.toggle('active', opt.dataset.lang === lang);
        });
        
        // Profile title
        var profileTitle = document.getElementById('profileTitle');
        if (profileTitle) profileTitle.textContent = translate('profile');
        
        // Toast juga kena
        console.log('[Amanah ID] Language changed to:', lang);
    }

    // Language switcher events
    document.querySelectorAll('.lang-opt').forEach(function(opt) {
        opt.addEventListener('click', function() {
            applyLanguage(this.dataset.lang);
        });
    });

    // =========================================================
    // STORAGE HELPERS
    // =========================================================

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || []; } 
        catch { return []; }
    }

    function saveUsers(users) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    function getStudents() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || []; } 
        catch { return []; }
    }

    function saveStudents(students) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    }

    function getAttendance() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) || []; } 
        catch { return []; }
    }

    function saveAttendance(attendance) {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
    }

    function getLocalDate() {
        var now = new Date();
        return now.getFullYear() + '-' + 
               String(now.getMonth() + 1).padStart(2, '0') + '-' + 
               String(now.getDate()).padStart(2, '0');
    }

    function createId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function escapeHTML(str) {
        return String(str).replace(/[&<>"]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            return m;
        });
    }

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    // =========================================================
    // TOAST - BISA TERJEMAH
    // =========================================================

    var toastTimer = null;

    function showToast(message) {
        if (!DOM.toast) return;
        DOM.toast.textContent = message;
        DOM.toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function() {
            DOM.toast.classList.remove('show');
        }, 2000);
    }

    function showToastKey(key) {
        showToast(translate(key));
    }

    // =========================================================
    // AUTH
    // =========================================================

    function initDefaultAdmin() {
        var users = getUsers();
        var exists = users.some(function(u) { 
            return u.email === 'admin@amanahid.sch.id'; 
        });
        if (!exists) {
            users.push({
                id: 'admin_' + Date.now(),
                name: 'Admin',
                email: 'admin@amanahid.sch.id',
                password: 'admin123',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            saveUsers(users);
        }
    }

    function goToDashboard() {
        if (!DOM.authPage || !DOM.mainApp) return;
        DOM.authPage.style.display = 'none';
        DOM.mainApp.style.display = 'flex';
        DOM.mainApp.classList.add('active');
        renderProfile();
        renderDatabase();
        
        // Load AI di background - TIDAK MEMBLOKIR
        setTimeout(function() {
            if (!modelsReady && !modelLoadingStarted) {
                loadModelsBackground();
            }
        }, 300);
    }

    function handleAuth() {
        var savedUser = localStorage.getItem(STORAGE_KEYS.SESSION);
        
        if (savedUser) {
            try {
                var user = JSON.parse(savedUser);
                if (user && user.email) {
                    currentUser = user;
                    isAuthenticated = true;
                    goToDashboard();
                    return;
                }
            } catch (e) {
                localStorage.removeItem(STORAGE_KEYS.SESSION);
            }
        }
        
        if (DOM.authPage) {
            DOM.authPage.style.display = 'flex';
        }
        if (DOM.mainApp) {
            DOM.mainApp.style.display = 'none';
            DOM.mainApp.classList.remove('active');
        }
    }

    // LOGIN - dengan checkbox agree
    if (DOM.loginForm) {
        DOM.loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (DOM.loginAgree && !DOM.loginAgree.checked) {
                showToast(translate('agreeRequired'));
                return;
            }
            
            var email = DOM.loginEmail ? DOM.loginEmail.value.trim() : '';
            var password = DOM.loginPassword ? DOM.loginPassword.value.trim() : '';

            if (!email || !password) {
                showToast(translate('emailRequired'));
                return;
            }

            var users = getUsers();
            var user = null;
            for (var i = 0; i < users.length; i++) {
                if (users[i].email === email && users[i].password === password) {
                    user = users[i];
                    break;
                }
            }

            if (!user) {
                showToast(translate('invalidCredentials'));
                return;
            }

            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
            currentUser = user;
            isAuthenticated = true;
            showToast(translate('welcome') + ', ' + user.name + '!');
            goToDashboard();
        });
    }

    // SIGNUP
    if (DOM.signupForm) {
        DOM.signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            var name = DOM.signupName ? DOM.signupName.value.trim() : '';
            var email = DOM.signupEmail ? DOM.signupEmail.value.trim() : '';
            var password = DOM.signupPassword ? DOM.signupPassword.value.trim() : '';
            var confirm = DOM.signupConfirm ? DOM.signupConfirm.value.trim() : '';

            if (!name || !email || !password || !confirm) {
                showToast(translate('fillAllFields'));
                return;
            }

            if (password.length < 6) {
                showToast(translate('invalidPassword'));
                return;
            }

            if (password !== confirm) {
                showToast(translate('invalidPassword'));
                return;
            }

            if (DOM.signupAgree && !DOM.signupAgree.checked) {
                showToast(translate('agreeRequired'));
                return;
            }

            var users = getUsers();
            for (var i = 0; i < users.length; i++) {
                if (users[i].email === email) {
                    showToast(translate('emailTaken'));
                    return;
                }
            }

            var newUser = {
                id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                name: name,
                email: email,
                password: password,
                role: 'user',
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            saveUsers(users);
            
            showToast(translate('accountCreated'));
            
            if (DOM.signupName) DOM.signupName.value = '';
            if (DOM.signupEmail) DOM.signupEmail.value = '';
            if (DOM.signupPassword) DOM.signupPassword.value = '';
            if (DOM.signupConfirm) DOM.signupConfirm.value = '';
            if (DOM.signupAgree) DOM.signupAgree.checked = false;
            if (DOM.signupButton) DOM.signupButton.disabled = true;
            
            var loginTab = document.querySelector('.auth-tab[data-tab="login"]');
            if (loginTab) loginTab.click();
            if (DOM.loginEmail) DOM.loginEmail.value = email;
            if (DOM.loginPassword) DOM.loginPassword.value = '';
            if (DOM.loginAgree) DOM.loginAgree.checked = true;
        });
    }

    // LOGOUT - tutup profile modal
    if (DOM.logoutButton) {
        DOM.logoutButton.addEventListener('click', function() {
            // Tutup profile modal
            if (DOM.profileModal) DOM.profileModal.classList.remove('show');
            
            localStorage.removeItem(STORAGE_KEYS.SESSION);
            isAuthenticated = false;
            currentUser = null;
            if (DOM.mainApp) {
                DOM.mainApp.style.display = 'none';
                DOM.mainApp.classList.remove('active');
            }
            if (DOM.authPage) DOM.authPage.style.display = 'flex';
            stopAttendanceCamera();
            stopEnrollmentCamera();
            showToast(translate('logoutSuccess'));
        });
    }

    // AUTH TABS
    document.querySelectorAll('.auth-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.auth-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            this.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(function(f) {
                f.classList.remove('active');
            });
            var formId = this.dataset.tab === 'login' ? 'loginForm' : 'signupForm';
            var form = document.getElementById(formId);
            if (form) form.classList.add('active');
            if (this.dataset.tab === 'signup') {
                if (DOM.signupAgree) DOM.signupAgree.checked = false;
                if (DOM.signupButton) DOM.signupButton.disabled = true;
            }
            if (this.dataset.tab === 'login') {
                if (DOM.loginAgree) DOM.loginAgree.checked = true;
            }
        });
    });

    // CHECKBOX - Signup
    if (DOM.signupAgree) {
        DOM.signupAgree.addEventListener('change', function() {
            if (DOM.signupButton) DOM.signupButton.disabled = !this.checked;
        });
    }

    // CHECKBOX - Login
    if (DOM.loginAgree) {
        DOM.loginAgree.checked = true;
    }

    // TERMS
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
            if (DOM.loginAgree) DOM.loginAgree.checked = true;
            showToast(translate('termsAgreed'));
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
    // PROFILE MODAL - JENDELA MELAYANG
    // =========================================================

    function getProfileFallback(name) {
        var initials = String(name || 'A').trim().split(/\s+/).slice(0, 2)
            .map(function(part) { return part.charAt(0).toUpperCase(); }).join('');
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">' +
            '<defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#1a73e8"/>' +
            '<stop offset="1" stop-color="#0d47a1"/></linearGradient></defs>' +
            '<rect width="160" height="160" rx="80" fill="url(#g)"/>' +
            '<text x="80" y="94" text-anchor="middle" font-family="Arial" font-size="54" font-weight="700" fill="white">' +
            escapeHTML(initials || 'A') + '</text></svg>';
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    }

    function renderProfile() {
        if (!currentUser) return;
        if (DOM.profileName) DOM.profileName.value = currentUser.name || '';
        if (DOM.profileEmail) DOM.profileEmail.value = currentUser.email || '';
        if (DOM.profilePassword) DOM.profilePassword.value = currentUser.password || '';
        
        var avatarSrc = currentUser.profilePhoto || getProfileFallback(currentUser.name);
        if (DOM.profileAvatar) DOM.profileAvatar.src = avatarSrc;
        if (DOM.navAvatar) DOM.navAvatar.src = avatarSrc;
    }

    // Hapus foto profil dengan klik
    function clearProfilePhoto() {
        if (!currentUser) return;
        currentUser.profilePhoto = null;
        var users = getUsers();
        var userIndex = users.findIndex(function(user) { return user.id === currentUser.id; });
        if (userIndex >= 0) {
            users[userIndex] = currentUser;
            saveUsers(users);
        }
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentUser));
        renderProfile();
        showToast(translate('photoDeleted'));
    }

    if (DOM.profileButton) {
        DOM.profileButton.addEventListener('click', function() {
            renderProfile();
            if (DOM.profileModal) DOM.profileModal.classList.add('show');
        });
    }

    if (DOM.profileClose) {
        DOM.profileClose.addEventListener('click', function() {
            if (DOM.profileModal) DOM.profileModal.classList.remove('show');
        });
    }

    if (DOM.profileModal) {
        DOM.profileModal.addEventListener('click', function(event) {
            if (event.target === this) {
                this.classList.remove('show');
            }
        });
    }

    // Klik foto profil untuk hapus
    if (DOM.profileAvatar) {
        DOM.profileAvatar.addEventListener('click', function() {
            if (currentUser && currentUser.profilePhoto) {
                clearProfilePhoto();
            } else {
                showToast(translate('noPhoto'));
            }
        });
        DOM.profileAvatar.style.cursor = 'pointer';
        DOM.profileAvatar.title = 'Klik untuk menghapus foto';
    }

    if (DOM.profilePhotoInput) {
        DOM.profilePhotoInput.addEventListener('change', function(event) {
            var file = event.target.files && event.target.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            var reader = new FileReader();
            reader.onload = function() {
                if (currentUser) {
                    currentUser.profilePhoto = reader.result;
                    var users = getUsers();
                    var userIndex = users.findIndex(function(user) { return user.id === currentUser.id; });
                    if (userIndex >= 0) {
                        users[userIndex] = currentUser;
                        saveUsers(users);
                    }
                    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentUser));
                    renderProfile();
                    showToast(translate('photoChanged'));
                }
            };
            reader.readAsDataURL(file);
        });
    }

    if (DOM.profileSaveButton) {
        DOM.profileSaveButton.addEventListener('click', function() {
            if (!currentUser) return;
            var name = DOM.profileName ? DOM.profileName.value.trim() : '';
            var email = DOM.profileEmail ? DOM.profileEmail.value.trim() : '';
            var password = DOM.profilePassword ? DOM.profilePassword.value.trim() : '';
            
            if (name.length < 2) {
                showToast(translate('invalidName'));
                return;
            }
            
            if (!email || email.length < 3) {
                showToast(translate('invalidEmail'));
                return;
            }
            
            if (password.length < 6) {
                showToast(translate('invalidPassword'));
                return;
            }
            
            currentUser.name = name;
            currentUser.email = email;
            currentUser.password = password;
            
            var users = getUsers();
            var userIndex = users.findIndex(function(user) { return user.id === currentUser.id; });
            if (userIndex >= 0) users[userIndex] = currentUser;
            saveUsers(users);
            localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentUser));
            
            if (DOM.welcomeMessage) DOM.welcomeMessage.textContent = translate('welcome') + ', ' + currentUser.name + '!';
            if (DOM.profileModal) DOM.profileModal.classList.remove('show');
            showToast(translate('profileSaved'));
        });
    }

    // =========================================================
    // NAVIGATION
    // =========================================================

    if (DOM.navItems) {
        DOM.navItems.forEach(function(button) {
            button.addEventListener('click', function() {
                if (button.id === 'logoutButton' || button.id === 'profileButton') return;
                var pageId = button.dataset.page;
                DOM.navItems.forEach(function(item) {
                    item.classList.remove('active');
                });
                button.classList.add('active');
                DOM.pages.forEach(function(page) {
                    page.classList.remove('active');
                });
                var targetPage = document.getElementById(pageId);
                if (targetPage) targetPage.classList.add('active');
                if (pageId !== 'attendancePage') stopAttendanceCamera();
                if (pageId !== 'formPage') stopEnrollmentCamera();
                if (pageId === 'databasePage') renderDatabase();
            });
        });
    }

    // =========================================================
    // LOAD MODELS - BACKGROUND CEPAT
    // =========================================================

    function loadModelsBackground() {
        if (modelLoadingStarted) return;
        if (typeof faceapi === 'undefined') {
            modelLoadingStarted = false;
            setTimeout(function() {
                if (!modelsReady) loadModelsBackground();
            }, 1000);
            return;
        }

        modelLoadingStarted = true;
        console.log('[Amanah ID] Loading AI models...');

        var TIMEOUT_MS = 8000;
        var loadTimeout = setTimeout(function() {
            console.warn('[Amanah ID] Model loading timeout');
            modelLoadingStarted = false;
        }, TIMEOUT_MS);

        function loadModelSet(url) {
            return Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(url),
                faceapi.nets.faceLandmark68Net.loadFromUri(url),
                faceapi.nets.faceRecognitionNet.loadFromUri(url)
            ]);
        }

        Promise.race([
            loadModelSet('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/models'),
            new Promise(function(_, reject) {
                setTimeout(function() { reject(new Error('Timeout')); }, 6000);
            })
        ]).catch(function() {
            return loadModelSet('https://justadudewhohacks.github.io/face-api.js/models');
        }).then(function() {
            clearTimeout(loadTimeout);
            modelsReady = true;
            modelLoadingStarted = false;
            console.log('[Amanah ID] AI models ready!');
            updateSaveButton();
            showToast(translate('aiReady'));
        }).catch(function(err) {
            console.error('[Amanah ID] Model load error:', err);
            clearTimeout(loadTimeout);
            modelLoadingStarted = false;
            showToast(translate('aiFailed'));
        });
    }

    // =========================================================
    // CAMERA HELPERS
    // =========================================================

    function requestCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser tidak mendukung getUserMedia.');
        }
        var constraints = {
            video: {
                facingMode: { ideal: 'user' },
                width: { ideal: 480, min: 240 },
                height: { ideal: 360, min: 180 },
                frameRate: { ideal: 30 }
            },
            audio: false
        };
        return navigator.mediaDevices.getUserMedia(constraints);
    }

    function getCameraErrorMessage(error) {
        if (error && error.name === 'NotAllowedError') return 'Izin kamera ditolak.';
        if (error && error.name === 'NotFoundError') return 'Tidak ada kamera.';
        if (error && error.name === 'NotReadableError') return 'Kamera digunakan aplikasi lain.';
        if (error && error.name === 'SecurityError') return 'Butuh HTTPS atau localhost.';
        return 'Kamera tidak tersedia.';
    }

    // =========================================================
    // ATTENDANCE - SUPER AKURAT
    // =========================================================

    async function startAttendanceCamera() {
        if (!modelsReady) {
            showToast(translate('aiLoading'));
            if (!modelLoadingStarted) loadModelsBackground();
            return;
        }
        
        try {
            stopAttendanceCamera();
            if (DOM.attendanceError) DOM.attendanceError.classList.remove('show');
            if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = 'Mengaktifkan kamera...';
            attendanceStream = await requestCamera();
            if (DOM.attendanceVideo) {
                DOM.attendanceVideo.srcObject = attendanceStream;
                await DOM.attendanceVideo.play();
            }
            if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = translate('cameraOn');
            if (DOM.attendanceCameraButton) DOM.attendanceCameraButton.title = 'Matikan kamera';
            startAttendanceLoop();
        } catch (error) {
            console.error('[Attendance Camera]', error);
            if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = translate('cameraUnavailable');
            if (DOM.attendanceError) DOM.attendanceError.classList.add('show');
            showToast(translate('cameraFailed'));
        }
    }

    function stopAttendanceCamera() {
        if (attendanceTimer) { clearInterval(attendanceTimer); attendanceTimer = null; }
        if (attendanceStream) {
            attendanceStream.getTracks().forEach(function(track) { track.stop(); });
            attendanceStream = null;
        }
        if (DOM.attendanceVideo) DOM.attendanceVideo.srcObject = null;
        if (DOM.attendanceOverlay) DOM.attendanceOverlay.innerHTML = '';
        if (DOM.welcomeMessage) DOM.welcomeMessage.classList.remove('show');
        if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = translate('cameraOff');
        if (DOM.attendanceCameraButton) DOM.attendanceCameraButton.title = 'Aktifkan kamera';
        attendanceProcessing = false;
        attendanceMatchStudentId = null;
        attendanceMatchFrames = 0;
    }

    function startAttendanceLoop() {
        if (attendanceTimer) clearInterval(attendanceTimer);
        attendanceTimer = setInterval(processAttendanceFrame, 200);
    }

    async function processAttendanceFrame() {
        if (attendanceProcessing || !modelsReady || !attendanceStream || 
            !DOM.attendanceVideo || DOM.attendanceVideo.readyState < 2) {
            return;
        }
        attendanceProcessing = true;

        try {
            var detections = await faceapi.detectAllFaces(
                DOM.attendanceVideo,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.40 })
            ).withFaceLandmarks().withFaceDescriptors();

            if (DOM.attendanceOverlay) DOM.attendanceOverlay.innerHTML = '';

            if (detections.length === 0) {
                if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = translate('cameraOn');
                if (DOM.welcomeMessage) DOM.welcomeMessage.classList.remove('show');
                attendanceMatchStudentId = null;
                attendanceMatchFrames = 0;
                return;
            }

            var students = getStudents();
            var faceResults = [];
            for (var i = 0; i < detections.length; i++) {
                var match = findBestMatch(detections[i].descriptor, students);
                faceResults.push({ detection: detections[i], match: match });
            }

            for (var j = 0; j < faceResults.length; j++) {
                var result = faceResults[j];
                var recognized = result.match && result.match.distance <= 0.42;
                createFaceOutline(result.detection.detection.box, recognized);
            }

            var recognizedFaces = [];
            for (var k = 0; k < faceResults.length; k++) {
                if (faceResults[k].match && faceResults[k].match.distance <= 0.42) {
                    recognizedFaces.push(faceResults[k]);
                }
            }

            if (recognizedFaces.length === 0) {
                if (DOM.attendanceStatus) {
                    DOM.attendanceStatus.textContent = detections.length === 1 ? 
                        'Wajah terdeteksi, belum cocok' : 
                        detections.length + ' wajah tidak cocok';
                }
                if (DOM.welcomeMessage) DOM.welcomeMessage.classList.remove('show');
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

            if (DOM.attendanceStatus) DOM.attendanceStatus.textContent = student.name + ' terdeteksi';

            if (attendanceMatchFrames >= 2) {
                if (DOM.welcomeMessage) {
                    DOM.welcomeMessage.textContent = translate('welcome') + ', ' + student.name + '!';
                    DOM.welcomeMessage.classList.add('show');
                }
                registerAttendance(student, best.match.distance);
            } else {
                if (DOM.welcomeMessage) DOM.welcomeMessage.classList.remove('show');
            }
        } catch (error) {
            console.error('[Attendance Detection]', error);
        } finally {
            attendanceProcessing = false;
        }
    }

    function createFaceOutline(box, recognized) {
        if (!DOM.attendanceVideo || !DOM.attendanceVideo.videoWidth || 
            !DOM.attendanceVideo.videoHeight || !DOM.attendanceOverlay) {
            return;
        }
        var outline = document.createElement('div');
        outline.className = recognized ? 'face-outline recognized' : 'face-outline';
        var mapped = mapVideoBox(box, DOM.attendanceVideo, true);
        outline.style.cssText = 'left:' + mapped.x + 'px;top:' + mapped.y + 'px;width:' + 
                                mapped.width + 'px;height:' + mapped.height + 'px;';
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

    function findBestMatch(descriptor, students) {
        var bestStudent = null;
        var bestDistance = Infinity;

        for (var i = 0; i < students.length; i++) {
            var student = students[i];
            if (!Array.isArray(student.descriptor) || student.descriptor.length !== descriptor.length) {
                continue;
            }
            var distance = faceapi.euclideanDistance(descriptor, new Float32Array(student.descriptor));
            if (distance < bestDistance) {
                bestDistance = distance;
                bestStudent = student;
            }
        }

        if (!bestStudent) return null;
        return { student: bestStudent, distance: bestDistance };
    }

    function registerAttendance(student, distance) {
        var attendance = getAttendance();
        var today = getLocalDate();
        
        for (var i = 0; i < attendance.length; i++) {
            if (attendance[i].nisn === student.nisn && attendance[i].date === today) {
                return;
            }
        }

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
            status: 'Hadir',
            date: today,
            timestamp: new Date().toISOString(),
            method: 'Face Recognition',
            confidence: confidence
        };

        attendance.unshift(record);
        saveAttendance(attendance);
        renderDatabase();
        showToast(student.name + ' ' + translate('presensi') + '!');
    }

    // =========================================================
    // ENROLLMENT - 3 STAGE (FRONT, RIGHT, LEFT) - SUPER CEPAT
    // =========================================================

    async function startEnrollmentCamera() {
        if (!modelsReady) {
            showToast(translate('aiLoading'));
            if (!modelLoadingStarted) loadModelsBackground();
            return;
        }
        
        try {
            stopEnrollmentCamera();
            resetEnrollmentState();
            clearEnrollmentImage();
            enrollmentStage = 'front';
            enrollmentStream = await requestCamera();
            if (DOM.enrollmentVideo) {
                DOM.enrollmentVideo.srcObject = enrollmentStream;
                DOM.enrollmentVideo.classList.add('active');
            }
            if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = 'none';
            if (DOM.enrollmentVideo) {
                await waitForVideoReady(DOM.enrollmentVideo);
            }
            setValidation(translate('frontFace'), true);
            startEnrollmentLoop();
        } catch (error) {
            console.error('[Enrollment Camera]', error);
            setValidation(getCameraErrorMessage(error), false);
            showToast(translate('cameraFailed'));
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
            DOM.enrollmentVideo.classList.remove('active');
        }
        enrollmentProcessing = false;
        stabilityHistory = [];
        enrollmentReadyFrames = 0;
        enrollmentStage = 'front';
    }

    function clearEnrollmentImage() {
        currentEnrollmentDescriptor = null;
        currentEnrollmentImage = null;
        if (DOM.enrollmentImage) {
            DOM.enrollmentImage.src = '';
            DOM.enrollmentImage.classList.remove('active', 'has-image');
        }
        var replaceBtn = document.getElementById('replaceImageBtn');
        if (replaceBtn) replaceBtn.remove();
        if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = 'flex';
        resetEnrollmentState();
        updateSaveButton();
    }

    function waitForVideoReady(video) {
        return new Promise(function(resolve) {
            if (video.readyState >= 2) { resolve(); return; }
            var handler = function() {
                video.removeEventListener('loadedmetadata', handler);
                resolve();
            };
            video.addEventListener('loadedmetadata', handler);
        });
    }

    function startEnrollmentLoop() {
        if (enrollmentTimer) clearInterval(enrollmentTimer);
        enrollmentTimer = setInterval(processEnrollmentFrame, 60);
    }

    var detectionCounter = 0;

    async function processEnrollmentFrame() {
        if (enrollmentProcessing || !enrollmentStream || 
            !DOM.enrollmentVideo || DOM.enrollmentVideo.readyState < 2) {
            return;
        }
        enrollmentProcessing = true;
        detectionCounter++;

        try {
            var detections = await faceapi.detectAllFaces(
                DOM.enrollmentVideo,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.35 })
            ).withFaceLandmarks().withFaceDescriptors();

            if (detections.length === 0) {
                enrollmentReadyFrames = 0;
                updateEnrollmentProgress(0);
                setValidation(translate('cameraOn'), false);
                return;
            }

            if (detections.length > 1) {
                enrollmentReadyFrames = 0;
                updateEnrollmentProgress(5);
                setValidation('Hanya satu wajah.', false);
                return;
            }

            var detection = detections[0];
            var box = detection.detection.box;
            var width = DOM.enrollmentVideo.videoWidth;
            var height = DOM.enrollmentVideo.videoHeight;

            var faceArea = (box.width * box.height) / (width * height);
            var sizeScore = 0;
            if (faceArea >= 0.04 && faceArea <= 0.55) {
                sizeScore = 90 + (1 - Math.abs(faceArea - 0.22) * 100);
            } else if (faceArea > 0.55 && faceArea <= 0.75) {
                sizeScore = 65 - (faceArea - 0.55) * 120;
            } else if (faceArea >= 0.02 && faceArea < 0.04) {
                sizeScore = 45 + (faceArea - 0.02) * 600;
            } else {
                sizeScore = Math.max(0, 100 - Math.abs(faceArea - 0.22) * 200);
            }
            sizeScore = clamp(sizeScore, 0, 100);

            var faceCenterX = box.x + box.width / 2;
            var faceCenterY = box.y + box.height / 2;
            var frameCenterX = width / 2;
            var frameCenterY = height / 2;
            var dist = Math.hypot((faceCenterX - frameCenterX) / width, 
                                  (faceCenterY - frameCenterY) / height);
            var centerScore = clamp(100 - (dist * 250), 0, 100);

            var lightScore = 80;
            if (detectionCounter % 3 === 0) {
                var brightness = calculateBrightness(DOM.enrollmentVideo);
                lightScore = calculateLightScore(brightness);
            }

            stabilityHistory.push({ x: faceCenterX, y: faceCenterY, 
                                    width: box.width, height: box.height });
            if (stabilityHistory.length > 3) stabilityHistory.shift();

            var stabilityScore = 50;
            if (stabilityHistory.length >= 3) {
                var first = stabilityHistory[0];
                var last = stabilityHistory[stabilityHistory.length - 1];
                var movement = Math.hypot(last.x - first.x, last.y - first.y);
                var sizeMovement = Math.abs(last.width - first.width);
                stabilityScore = clamp(100 - (movement * 0.4) - (sizeMovement * 0.3), 0, 100);
            }

            var finalScore = (sizeScore * 0.30 + centerScore * 0.30 + 
                              lightScore * 0.15 + stabilityScore * 0.25);

            if (finalScore > enrollmentProgress) {
                enrollmentProgress = enrollmentProgress * 0.15 + finalScore * 0.85;
            } else {
                enrollmentProgress = enrollmentProgress * 0.30 + finalScore * 0.70;
            }

            if (finalScore >= 80 && sizeScore >= 70 && centerScore >= 75) {
                enrollmentProgress = Math.min(100, enrollmentProgress + 25);
            }

            enrollmentProgress = clamp(enrollmentProgress, 0, 100);
            updateEnrollmentProgress(enrollmentProgress);

            var ready = finalScore >= 75 && faceArea >= 0.03 && faceArea <= 0.70 && 
                        centerScore >= 70 && stabilityScore >= 60;

            if (ready && enrollmentProgress >= 80) {
                enrollmentReadyFrames += 1;
            } else {
                enrollmentReadyFrames = 0;
            }

            var stageMessages = {
                front: translate('frontFace'),
                right: translate('rightFace'),
                left: translate('leftFace')
            };

            if (enrollmentProgress < 25) setValidation('Mendeteksi wajah...', true);
            else if (enrollmentProgress < 50) setValidation('Analisis kualitas...', true);
            else if (enrollmentProgress < 75) setValidation('Pertahankan posisi...', true);
            else if (enrollmentProgress < 100) setValidation('Hampir selesai...', true);
            else setValidation(translate('faceCaptured'), true);

            if (enrollmentProgress >= 100 && enrollmentReadyFrames >= 1) {
                await captureEnrollmentStage(detection);
            }
        } catch (error) {
            console.error('[Enrollment Detection]', error);
        } finally {
            enrollmentProcessing = false;
        }
    }

    async function captureEnrollmentStage(detection) {
        // Simpan descriptor untuk stage saat ini
        if (!currentEnrollmentDescriptor) {
            currentEnrollmentDescriptor = [];
        }
        currentEnrollmentDescriptor.push(Array.from(detection.descriptor));

        // Update stage
        if (enrollmentStage === 'front') {
            enrollmentStage = 'right';
            enrollmentProgress = 0;
            enrollmentReadyFrames = 0;
            stabilityHistory = [];
            setValidation(translate('rightFace'), true);
            updateEnrollmentProgress(0);
            showToast('Sisi kanan berhasil!');
        } else if (enrollmentStage === 'right') {
            enrollmentStage = 'left';
            enrollmentProgress = 0;
            enrollmentReadyFrames = 0;
            stabilityHistory = [];
            setValidation(translate('leftFace'), true);
            updateEnrollmentProgress(0);
            showToast('Sisi kiri berhasil!');
        } else if (enrollmentStage === 'left') {
            // Selesai 3 stage
            stopEnrollmentCamera();
            
            // Ambil rata-rata dari 3 descriptor
            var avgDescriptor = [];
            var len = currentEnrollmentDescriptor[0].length;
            for (var i = 0; i < len; i++) {
                var sum = 0;
                for (var j = 0; j < currentEnrollmentDescriptor.length; j++) {
                    sum += currentEnrollmentDescriptor[j][i];
                }
                avgDescriptor.push(sum / currentEnrollmentDescriptor.length);
            }
            currentEnrollmentDescriptor = avgDescriptor;
            
            // Capture image dari video
            var canvas = document.createElement('canvas');
            canvas.width = DOM.enrollmentVideo.videoWidth;
            canvas.height = DOM.enrollmentVideo.videoHeight;
            var context = canvas.getContext('2d');
            if (context) {
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(DOM.enrollmentVideo, 0, 0, canvas.width, canvas.height);
                currentEnrollmentImage = canvas.toDataURL('image/jpeg', 0.90);
            }

            if (DOM.enrollmentImage) {
                DOM.enrollmentImage.src = currentEnrollmentImage || '';
                DOM.enrollmentImage.classList.add('active', 'has-image');
            }
            if (DOM.enrollmentVideo) DOM.enrollmentVideo.classList.remove('active');
            if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = 'none';
            addReplaceButton();

            updateEnrollmentProgress(100);
            setValidation(translate('faceVerified'), true);
            updateSaveButton();
            showToast(translate('faceCaptured'));
        }
    }

    function calculateBrightness(video) {
        var canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 6;
        var context = canvas.getContext('2d', { willReadFrequently: true });
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
        DOM.faceValidation.className = 'validation-message';
        if (message) {
            DOM.faceValidation.classList.add(success ? 'success' : 'error');
        }
    }

    function resetEnrollmentState() {
        enrollmentProgress = 0;
        enrollmentReadyFrames = 0;
        stabilityHistory = [];
        detectionCounter = 0;
        enrollmentStage = 'front';
        currentEnrollmentDescriptor = null;
        updateEnrollmentProgress(0);
        setValidation('', true);
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
            showToast('Foto dihapus. Ambil foto baru.');
        });
        var preview = document.getElementById('enrollmentPreview');
        if (preview) { 
            preview.style.position = 'relative'; 
            preview.appendChild(replaceBtn); 
        }
    }

    // =========================================================
    // UPLOAD IMAGE - CEPAT
    // =========================================================

    if (DOM.uploadButton) {
        DOM.uploadButton.addEventListener('click', function() {
            if (DOM.photoInput) DOM.photoInput.click();
        });
    }

    if (DOM.photoInput) {
        DOM.photoInput.addEventListener('change', async function(event) {
            var file = event.target.files ? event.target.files[0] : null;
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                setValidation('File bukan gambar.', false);
                return;
            }

            if (!modelsReady) {
                setValidation(translate('aiLoading'), false);
                if (!modelLoadingStarted) loadModelsBackground();
                return;
            }

            try {
                stopEnrollmentCamera();
                resetEnrollmentState();
                var image = await faceapi.bufferToImage(file);
                if (DOM.enrollmentImage) {
                    DOM.enrollmentImage.src = image.src;
                    DOM.enrollmentImage.classList.add('active', 'has-image');
                }
                if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = 'none';

                var detections = await faceapi.detectAllFaces(
                    image,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.35 })
                ).withFaceLandmarks().withFaceDescriptors();

                if (detections.length === 0) {
                    setValidation('Foto ditolak: wajah tidak ditemukan.', false);
                    clearEnrollmentImage();
                    showToast('Wajah tidak terdeteksi.');
                    return;
                }

                if (detections.length > 1) {
                    setValidation('Foto ditolak: lebih dari satu wajah.', false);
                    clearEnrollmentImage();
                    showToast('Deteksi lebih dari satu wajah.');
                    return;
                }

                var detection = detections[0];
                var box = detection.detection.box;
                var areaRatio = (box.width * box.height) / (image.width * image.height);

                if (areaRatio < 0.025) {
                    setValidation('Wajah terlalu kecil.', false);
                    clearEnrollmentImage();
                    return;
                }

                currentEnrollmentDescriptor = Array.from(detection.descriptor);
                currentEnrollmentImage = image.src;
                updateEnrollmentProgress(100);
                setValidation(translate('faceVerified'), true);
                addReplaceButton();
                updateSaveButton();
            } catch (error) {
                console.error('[Upload Image]', error);
                setValidation('Foto gagal dianalisis.', false);
                clearEnrollmentImage();
            } finally {
                if (DOM.photoInput) DOM.photoInput.value = '';
            }
        });
    }

    // =========================================================
    // FORM VALIDATION
    // =========================================================

    if (DOM.nisnInput && DOM.studentNameInput && DOM.studentClassInput) {
        [DOM.nisnInput, DOM.studentNameInput, DOM.studentClassInput].forEach(function(input) {
            input.addEventListener('input', updateSaveButton);
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

    if (DOM.saveStudentButton) {
        DOM.saveStudentButton.addEventListener('click', function() {
            var nisn = DOM.nisnInput ? DOM.nisnInput.value.trim() : '';
            var name = DOM.studentNameInput ? DOM.studentNameInput.value.trim() : '';
            var className = DOM.studentClassInput ? DOM.studentClassInput.value.trim() : '';

            if (!/^\d+$/.test(nisn)) { showToast(translate('nisnOnlyNumbers')); return; }
            if (name.length < 2) { showToast(translate('invalidName')); return; }
            if (!className) { showToast('Kelas belum diisi.'); return; }
            if (!currentEnrollmentDescriptor) { showToast(translate('faceNotVerified')); return; }

            var students = getStudents();
            for (var i = 0; i < students.length; i++) {
                if (students[i].nisn === nisn) {
                    showToast(translate('nisnTaken'));
                    return;
                }
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

            if (DOM.nisnInput) DOM.nisnInput.value = '';
            if (DOM.studentNameInput) DOM.studentNameInput.value = '';
            if (DOM.studentClassInput) DOM.studentClassInput.value = '';
            currentEnrollmentDescriptor = null;
            currentEnrollmentImage = null;
            if (DOM.enrollmentImage) {
                DOM.enrollmentImage.src = '';
                DOM.enrollmentImage.classList.remove('active', 'has-image');
            }
            var replaceBtn = document.getElementById('replaceImageBtn');
            if (replaceBtn) replaceBtn.remove();
            if (DOM.previewPlaceholder) DOM.previewPlaceholder.style.display = 'flex';
            resetEnrollmentState();
            updateSaveButton();
            renderDatabase();
            showToast(name + ' ' + translate('studentRegistered'));
        });
    }

    // =========================================================
    // DATABASE - AUTO FILTER
    // =========================================================

    function renderDatabase() {
        if (!DOM.totalStudents || !DOM.totalPresent || 
            !DOM.attendancePercentage || !DOM.totalHistory) {
            return;
        }
        
        var students = getStudents();
        var attendance = getAttendance();
        var today = getLocalDate();
        var todayAttendance = [];
        for (var i = 0; i < attendance.length; i++) {
            if (attendance[i].date === today) {
                todayAttendance.push(attendance[i]);
            }
        }

        DOM.totalStudents.textContent = students.length;
        DOM.totalPresent.textContent = todayAttendance.length;
        DOM.totalHistory.textContent = attendance.length;

        var percentage = students.length > 0 ? 
            Math.round((todayAttendance.length / students.length) * 100) : 0;
        DOM.attendancePercentage.textContent = Math.min(percentage, 100) + '%';

        var searchTerm = DOM.dbSearch ? DOM.dbSearch.value.toLowerCase().trim() : '';
        var startDate = DOM.dbDateStart ? DOM.dbDateStart.value : '';
        var endDate = DOM.dbDateEnd ? DOM.dbDateEnd.value : '';

        var filteredData = [];
        for (var j = 0; j < attendance.length; j++) {
            var item = attendance[j];
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
            if (match) filteredData.push(item);
        }

        if (DOM.attendanceTableBody) DOM.attendanceTableBody.innerHTML = '';

        if (filteredData.length === 0) {
            if (DOM.emptyDatabase) DOM.emptyDatabase.style.display = 'block';
            return;
        }

        if (DOM.emptyDatabase) DOM.emptyDatabase.style.display = 'none';

        for (var k = 0; k < filteredData.length; k++) {
            var item = filteredData[k];
            var date = new Date(item.timestamp);
            var dateText = date.toLocaleDateString('id-ID');
            var timeText = date.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });

            var row = document.createElement('tr');
            row.innerHTML = 
                '<td>' + (k + 1) + '</td>' +
                '<td><strong>' + escapeHTML(item.nisn) + '</strong></td>' +
                '<td>' + escapeHTML(item.name) + '</td>' +
                '<td>' + escapeHTML(item.className) + '</td>' +
                '<td><span class="status-pill"><span class="status-dot"></span>' + 
                    escapeHTML(item.status) + '</span></td>' +
                '<td>' + dateText + '</td>' +
                '<td>' + timeText + '</td>' +
                '<td>' + escapeHTML(item.method) + '</td>' +
                '<td>' + Number(item.confidence).toFixed(1) + '%</td>' +
                '<td><div class="row-actions"><button class="row-action-btn" data-id="' + 
                    item.id + '" title="Hapus"><svg viewBox="0 0 24 24" width="16" height="16" ' +
                    'fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
                    '<line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>' +
                    '</svg></button></div></td>';
            if (DOM.attendanceTableBody) DOM.attendanceTableBody.appendChild(row);
        }

        document.querySelectorAll('.row-action-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = this.dataset.id;
                showDeleteConfirm(id);
            });
        });
    }

    // =========================================================
    // DELETE FUNCTIONS - HAPUS JUGA DATA SISWA
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
                '<h3>' + translate('deleteConfirmTitle') + '</h3>' +
                '<p>' + translate('deleteConfirmDesc') + '</p>' +
                '<p class="delete-dialog-sub">' + translate('deleteConfirmSub') + '</p>' +
                '<div class="delete-dialog-actions">' +
                    '<button class="delete-cancel-btn">' + translate('cancel') + '</button>' +
                    '<button class="delete-confirm-btn" data-id="' + id + '">' + translate('confirm') + '</button>' +
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
        var record = null;
        for (var i = 0; i < attendance.length; i++) {
            if (attendance[i].id === id) {
                record = attendance[i];
                break;
            }
        }
        if (!record) {
            showToast('Data tidak ditemukan.');
            return;
        }
        
        var newAttendance = [];
        for (var j = 0; j < attendance.length; j++) {
            if (attendance[j].id !== id) {
                newAttendance.push(attendance[j]);
            }
        }
        saveAttendance(newAttendance);
        
        // Hapus siswa terkait jika tidak ada presensi lain
        var students = getStudents();
        var studentExists = newAttendance.some(function(item) {
            return item.nisn === record.nisn;
        });
        if (!studentExists) {
            var newStudents = students.filter(function(s) {
                return s.nisn !== record.nisn;
            });
            saveStudents(newStudents);
        }
        
        renderDatabase();
        showToast('Data ' + record.name + ' ' + translate('dataDeleted'));
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
                '<h3>' + translate('deleteAllConfirmTitle') + '</h3>' +
                '<p>' + translate('deleteAllConfirmDesc') + '</p>' +
                '<p class="delete-dialog-sub">' + translate('deleteConfirmSub') + '</p>' +
                '<div class="delete-dialog-actions">' +
                    '<button class="delete-cancel-btn">' + translate('cancel') + '</button>' +
                    '<button class="delete-confirm-btn delete-all-btn">' + translate('confirmAll') + '</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(dialog);

        dialog.querySelector('.delete-cancel-btn').addEventListener('click', function() {
            dialog.remove();
        });

        dialog.querySelector('.delete-all-btn').addEventListener('click', function() {
            var attendance = getAttendance();
            if (attendance.length === 0) {
                showToast(translate('noData'));
                dialog.remove();
                return;
            }
            
            // Hapus semua attendance
            saveAttendance([]);
            
            // Hapus semua siswa
            saveStudents([]);
            
            renderDatabase();
            showToast(translate('allDataDeleted'));
            dialog.remove();
        });

        dialog.addEventListener('click', function(e) {
            if (e.target === this) {
                this.remove();
            }
        });
    }

    // =========================================================
    // DATABASE EVENTS - AUTO FILTER
    // =========================================================

    if (DOM.dbSearch) {
        DOM.dbSearch.addEventListener('input', renderDatabase);
    }
    if (DOM.dbDateStart) {
        DOM.dbDateStart.addEventListener('change', renderDatabase);
    }
    if (DOM.dbDateEnd) {
        DOM.dbDateEnd.addEventListener('change', renderDatabase);
    }

    if (DOM.dbDeleteAllBtn) {
        DOM.dbDeleteAllBtn.addEventListener('click', deleteAllAttendance);
    }

    // =========================================================
    // EXPORT - dengan tanggal
    // =========================================================

    if (DOM.dbExportBtn) {
        DOM.dbExportBtn.addEventListener('click', function() {
            var attendance = getAttendance();
            if (attendance.length === 0) {
                showToast(translate('noData'));
                return;
            }
            exportToCSV(attendance);
        });
    }

    function exportToCSV(data) {
        try {
            var headers = ['No', 'NISN', 'Nama', 'Kelas', 'Status', 'Tanggal', 'Waktu', 'Metode', 'Confidence'];
            var csvRows = [headers.join(',')];
            
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                var date = new Date(item.timestamp);
                var dateText = date.toLocaleDateString('id-ID');
                var timeText = date.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                });
                
                var row = [
                    i + 1,
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
            }
            
            var csvString = csvRows.join('\n');
            var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'presensi_' + getLocalDate() + '.csv';
            link.click();
            URL.revokeObjectURL(link.href);
            showToast(translate('exportSuccess'));
        } catch (error) {
            console.error('[Export CSV]', error);
            showToast(translate('exportFailed'));
        }
    }

    // =========================================================
    // BUTTON EVENTS
    // =========================================================

    if (DOM.attendanceCameraButton) {
        DOM.attendanceCameraButton.addEventListener('click', function() {
            if (attendanceStream) {
                stopAttendanceCamera();
            } else {
                startAttendanceCamera();
            }
        });
    }

    if (DOM.cameraEnrollmentButton) {
        DOM.cameraEnrollmentButton.addEventListener('click', function() {
            if (enrollmentStream) {
                stopEnrollmentCamera();
                setValidation('Kamera dimatikan.', true);
            } else {
                startEnrollmentCamera();
            }
        });
    }

    // =========================================================
    // FULLSCREEN
    // =========================================================

    if (DOM.fullscreenButton) {
        DOM.fullscreenButton.addEventListener('click', async function() {
            var stage = document.querySelector('.attendance-stage');
            try {
                if (!document.fullscreenElement) {
                    await stage.requestFullscreen();
                } else {
                    await document.exitFullscreen();
                }
            } catch (error) {
                console.error('[Fullscreen]', error);
                showToast(translate('fullscreenUnavailable'));
            }
        });
    }

    // =========================================================
    // VISIBILITY
    // =========================================================

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAttendanceCamera();
            stopEnrollmentCamera();
        }
    });

    window.addEventListener('beforeunload', function() {
        stopAttendanceCamera();
        stopEnrollmentCamera();
    });

    // =========================================================
    // INIT
    // =========================================================

    function init() {
        console.log('[Amanah ID] Initializing...');
        
        // Set default dates
        if (DOM.dbDateStart) {
            var defaultStart = new Date();
            defaultStart.setDate(defaultStart.getDate() - 7);
            DOM.dbDateStart.value = defaultStart.toISOString().split('T')[0];
        }
        if (DOM.dbDateEnd) {
            DOM.dbDateEnd.value = getLocalDate();
        }
        
        // Setup admin & language
        initDefaultAdmin();
        applyLanguage(currentLang);
        
        // Handle auth
        handleAuth();
        
        console.log('[Amanah ID] Ready!');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();