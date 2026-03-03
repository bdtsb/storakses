const SCRIPT_URL = 'REPLACE_WITH_YOUR_WEB_APP_URL'; // Must match the URL in app.js

document.addEventListener('DOMContentLoaded', () => {
    if (SCRIPT_URL === 'REPLACE_WITH_YOUR_WEB_APP_URL') {
        document.getElementById('activity-table-body').innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Please configure SCRIPT_URL in admin.js</td></tr>`;
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
                throw new Error(data.error || "Failed to fetch data.");
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
            document.getElementById('activity-table-body').innerHTML = `<tr><td colspan="5" style="text-align:center;">Error loading data. Check console.</td></tr>`;
        }
    }

    function renderDashboard(records) {
        if (!records || records.length === 0) {
            document.getElementById('activity-table-body').innerHTML = `<tr><td colspan="5" style="text-align:center;">No records found.</td></tr>`;
            document.getElementById('total-today').textContent = '0';
            document.getElementById('last-person').textContent = '--';
            return;
        }

        // Get today's count
        const today = new Date().toDateString();
        const todayCount = records.filter(record => {
            const recordDate = new Date(record.timestamp).toDateString();
            return recordDate === today;
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
                <td>${formatTime(record.timestamp)}</td>
                <td><strong>${record.fullName}</strong><div style="font-size:12px;color:var(--text-muted)">${record.phone || ''}</div></td>
                <td>${record.department}</td>
                <td>${record.purpose} <br><span style="font-size:12px;color:var(--text-muted)">${record.projectName || ''}</span></td>
                <td>${record.duration}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function formatTime(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString('en-MY', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});
