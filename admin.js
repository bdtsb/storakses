const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPwXGyR0aDSj1tOI6j12tnDBVjc7TjwSbrUmVrDvBBcd0niEqkoI3ENMTnfskGhgFs/exec'; // Must match the URL in app.js

document.addEventListener('DOMContentLoaded', () => {
    if (SCRIPT_URL === 'REPLACE_WITH_YOUR_WEB_APP_URL') {
        document.getElementById('activity-table-body').innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Sila tetapkan SCRIPT_URL dalam admin.js</td></tr>`;
        return;
    }

    fetchActivityData();

    async function fetchActivityData() {
        try {
            const response = await fetch(`${SCRIPT_URL}?action=getAllLogs`);
            const data = await response.json();

            if (data.success) {
                renderDashboard(data.records);
            } else {
                throw new Error(data.error || "Gagal memuat turun data.");
            }
        } catch (error) {
            console.error('Ralat semasa mengambil data admin:', error);
            document.getElementById('activity-table-body').innerHTML = `<tr><td colspan="5" style="text-align:center;">Ralat memuatkan data. Semak konsol.</td></tr>`;
        }
    }

    function renderDashboard(records) {
        if (!records || records.length === 0) {
            document.getElementById('activity-table-body').innerHTML = `<tr><td colspan="5" style="text-align:center;">Tiada rekod dijumpai.</td></tr>`;
            document.getElementById('total-today').textContent = '0';
            document.getElementById('last-person').textContent = '--';
            return;
        }

        // Get today's count
        const today = new Date();
        const todayStr = ('0' + today.getDate()).slice(-2) + '/' + ('0' + (today.getMonth() + 1)).slice(-2) + '/' + String(today.getFullYear()).slice(-2);
        const todayCount = records.filter(record => {
            return record.timestamp && record.timestamp.startsWith(todayStr); // Check if date part matches
        }).length;

        document.getElementById('total-today').textContent = todayCount;

        // Last person
        const lastRecord = records[records.length - 1]; // Assume last appended is at the end
        document.getElementById('last-person').textContent = lastRecord.fullName || '--';

        // Table body
        const tbody = document.getElementById('activity-table-body');
        tbody.innerHTML = '';

        // Reverse to show latest first
        const displayRecords = [...records].reverse().slice(0, 50); // Show max 50 for performance

        displayRecords.forEach(record => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${record.timestamp}</td>
                <td><strong>${record.fullName}</strong><div style="font-size:12px;color:var(--text-muted)">${record.phone || ''}</div></td>
                <td>${record.department}</td>
                <td>${record.purpose} <br><span style="font-size:12px;color:var(--text-muted)">${record.projectName || ''}</span></td>
                <td>${record.duration}</td>
            `;
            tbody.appendChild(tr);
        });
    }
});
