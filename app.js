(() => {
    const seedRecords = [
        { nisn: '20240001', name: 'Aisyah Rahma', className: 'XII IPA 1', date: '2026-09-09', time: '07:15:12', status: 'Hadir', accuracy: 97.2 },
        { nisn: '20240002', name: 'Budi Pratama', className: 'XII IPA 2', date: '2026-09-09', time: '07:16:08', status: 'Hadir', accuracy: 96.7 },
        { nisn: '20240003', name: 'Citra Dewi', className: 'XI IPS 1', date: '2026-09-09', time: '07:14:44', status: 'Hadir', accuracy: 95.9 },
        { nisn: '20240004', name: 'Dimas Nugraha', className: 'XI IPA 1', date: '2026-09-09', time: '07:20:23', status: 'Terlambat', accuracy: 94.6 },
        { nisn: '20240005', name: 'Eka Putri', className: 'X IPA 2', date: '2026-09-08', time: '07:17:10', status: 'Hadir', accuracy: 96.2 },
        { nisn: '20240006', name: 'Farhan Ali', className: 'XII IPS 2', date: '2026-09-08', time: '07:22:44', status: 'Izin', accuracy: 91.8 },
        { nisn: '20240007', name: 'Gadis Lestari', className: 'XI IPA 3', date: '2026-09-07', time: '07:09:05', status: 'Hadir', accuracy: 98.1 },
        { nisn: '20240008', name: 'Hafiz Ramadhan', className: 'X IPS 1', date: '2026-09-07', time: '07:12:15', status: 'Hadir', accuracy: 95.4 },
        { nisn: '20240009', name: 'Indah Sari', className: 'XII IPS 1', date: '2026-09-06', time: '07:18:42', status: 'Hadir', accuracy: 97.4 },
        { nisn: '20240010', name: 'Joko Susilo', className: 'XI IPA 2', date: '2026-09-06', time: '07:26:18', status: 'Alpha', accuracy: 88.3 }
    ];

    const state = {
        records: [...seedRecords],
        totalStudents: 145
    };

    const elements = {
        searchInput: document.getElementById('searchInput') || document.getElementById('dbSearch'),
        startDate: document.getElementById('startDate') || document.getElementById('dbDateStart'),
        endDate: document.getElementById('endDate') || document.getElementById('dbDateEnd'),
        totalStudents: document.getElementById('totalStudents'),
        todayCount: document.getElementById('todayCount') || document.getElementById('totalPresent'),
        attendanceRate: document.getElementById('attendanceRate') || document.getElementById('attendancePercentage'),
        totalHistory: document.getElementById('totalHistory'),
        attendanceTableBody: document.getElementById('attendanceTableBody'),
        exportButton: document.querySelector('.export-button') || document.getElementById('dbExportBtn'),
        tableTabs: document.querySelectorAll('.table-tab'),
        tabButtons: document.querySelectorAll('.tab-item')
    };

    function normalizeText(value) {
        return String(value || '').toLowerCase().trim();
    }

    function getTodayDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getStatusClass(status) {
        const map = {
            Hadir: 'present',
            'Terlambat': 'late',
            Izin: 'leave',
            Alpha: 'absent'
        };
        return map[status] || 'present';
    }

    function getFilteredRecords() {
        const searchTerm = normalizeText(elements.searchInput ? elements.searchInput.value : '');
        const startDate = elements.startDate ? elements.startDate.value : '';
        const endDate = elements.endDate ? elements.endDate.value : '';

        return state.records.filter((record) => {
            const matchesSearch = !searchTerm || [
                record.name,
                record.nisn,
                record.className,
                record.status
            ].some((value) => normalizeText(value).includes(searchTerm));

            const matchesStart = !startDate || record.date >= startDate;
            const matchesEnd = !endDate || record.date <= endDate;

            return matchesSearch && matchesStart && matchesEnd;
        });
    }

    function updateStats(filteredRecords) {
        const today = getTodayDate();
        const todayRecords = filteredRecords.filter((record) => record.date === today);
        const presentToday = todayRecords.filter((record) => record.status === 'Hadir').length;
        const attendanceRate = Math.min(100, Math.round((presentToday / Math.max(state.totalStudents, 1)) * 100));

        if (elements.totalStudents) {
            elements.totalStudents.textContent = String(state.totalStudents);
        }

        if (elements.todayCount) {
            elements.todayCount.textContent = String(todayRecords.length || presentToday);
        }

        if (elements.attendanceRate) {
            elements.attendanceRate.textContent = `${attendanceRate}%`;
        }

        if (elements.totalHistory) {
            elements.totalHistory.textContent = String(filteredRecords.length || 0);
        }

        if (elements.tableTabs && elements.tableTabs.length > 0) {
            elements.tableTabs[0].textContent = `Riwayat Presensi (${filteredRecords.length || 0})`;
            elements.tableTabs[1].textContent = `Siswa Terdaftar (${state.totalStudents})`;
        }
    }

    function renderTable() {
        const records = getFilteredRecords();
        const tableBody = elements.attendanceTableBody;

        if (!tableBody) return;

        updateStats(records);

        if (!records.length) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-row">Tidak ada data yang sesuai dengan filter.</td>
        </tr>
      `;
            return;
        }

        tableBody.innerHTML = records.map((record) => `
      <tr>
        <td>${record.nisn}</td>
        <td>${record.name}</td>
        <td>${record.className}</td>
        <td>${record.date}</td>
        <td>${record.time}</td>
        <td><span class="status-badge ${getStatusClass(record.status)}">${record.status}</span></td>
        <td>${record.accuracy.toFixed(1)}%</td>
      </tr>
    `).join('');
    }

    function exportCsv() {
        const records = getFilteredRecords();
        const headers = ['NISN', 'Nama', 'Kelas', 'Tanggal', 'Waktu', 'Status', 'Akurasi'];
        const csvRows = [headers.join(',')];

        records.forEach((record) => {
            const row = [
                record.nisn,
                record.name,
                record.className,
                record.date,
                record.time,
                record.status,
                `${record.accuracy.toFixed(1)}%`
            ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'amanah-presensi.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function bindEvents() {
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', renderTable);
        }

        if (elements.startDate) {
            elements.startDate.addEventListener('change', renderTable);
        }

        if (elements.endDate) {
            elements.endDate.addEventListener('change', renderTable);
        }

        if (elements.exportButton) {
            elements.exportButton.addEventListener('click', exportCsv);
        }

        elements.tabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                elements.tabButtons.forEach((item) => item.classList.remove('active'));
                button.classList.add('active');
            });
        });

        elements.tableTabs.forEach((button) => {
            button.addEventListener('click', () => {
                elements.tableTabs.forEach((item) => item.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }

    renderTable();
    bindEvents();
})();
