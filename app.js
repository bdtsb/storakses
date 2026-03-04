const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPwXGyR0aDSj1tOI6j12tnDBVjc7TjwSbrUmVrDvBBcd0niEqkoI3ENMTnfskGhgFs/exec'; // E.g., https://script.google.com/macros/s/.../exec

let staffList = [];
let pendingTransactionPayload = null;
document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('access-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = document.getElementById('submit-loader');

    const successMessage = document.getElementById('success-message');
    const warningMessage = document.getElementById('warning-message');

    // Fetch latest access on load
    fetchLatestAccess();
    fetchStaff();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (SCRIPT_URL === 'REPLACE_WITH_YOUR_WEB_APP_URL') {
            alert("Sila tetapkan Google Apps Script URL dalam app.js terlebih dahulu.");
            return;
        }

        // Gather form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.action = 'addLog';
        data.timestamp = new Date().toISOString(); // Sent for logging purposes locally, Apps Script will use server time

        const staffName = data.fullName;
        if (!staffName) {
            return alert('Sila pilih nama Staff!');
        }

        const staffObj = staffList.find(s => s.Staff_Name === staffName);
        if (!staffObj) {
            return alert('Sila hubungi Admin untuk daftarkan nama anda dalam STAFF_LIST.');
        }

        pendingTransactionPayload = data;

        // Check PIN status
        if (!staffObj.Has_PIN) {
            document.getElementById('staff-set-pin-modal').classList.remove('hidden');
            document.getElementById('staff-new-pin').value = '';
            document.getElementById('staff-confirm-pin').value = '';
            setTimeout(() => document.getElementById('staff-new-pin').focus(), 100);
        } else {
            document.getElementById('staff-verify-pin-modal').classList.remove('hidden');
            document.getElementById('staff-verify-pin').value = '';
            setTimeout(() => document.getElementById('staff-verify-pin').focus(), 100);
        }
    });

    window.executePendingTransaction = async function () {
        if (!pendingTransactionPayload) return;
        setLoadingState(true);
        successMessage.classList.add('hidden');
        warningMessage.classList.add('hidden');

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(pendingTransactionPayload),
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                }
            });

            const result = await response.json();

            if (result.success) {
                // Show success
                successMessage.classList.remove('hidden');

                // Show warning if accesses > 3
                if (result.userAccessCount && result.userAccessCount > 3) {
                    warningMessage.classList.remove('hidden');
                }

                form.reset();
                // Update latest access view
                fetchLatestAccess();

                // Scroll to top to see success
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // Hide success message after 5 seconds
                setTimeout(() => {
                    successMessage.classList.add('hidden');
                    warningMessage.classList.add('hidden');
                }, 5000);
            } else {
                throw new Error(result.error || "Gagal menghantar log.");
            }
        } catch (error) {
            console.error('Ralat semasa menghantar borang:', error);
            alert("Ralat berlaku semasa menghantar: " + (error.message || "Sila cuba lagi."));
        } finally {
            setLoadingState(false);
            pendingTransactionPayload = null;
        }
    }

    async function fetchLatestAccess() {
        if (SCRIPT_URL === 'REPLACE_WITH_YOUR_WEB_APP_URL') return;

        try {
            const response = await fetch(`${SCRIPT_URL}?action=getLatest`);
            const data = await response.json();

            if (data.success && data.record) {
                document.getElementById('latest-user').textContent = data.record.fullName || 'N/A';
                document.getElementById('latest-time').textContent = formatTimestamp(data.record.timestamp) || 'N/A';
                document.getElementById('latest-purpose').textContent = data.record.purpose || 'N/A';
            } else {
                setLatestAccessError();
            }
        } catch (error) {
            console.error('Ralat semasa memuat turun rekod terkini:', error);
            setLatestAccessError();
        }
    }

    function setLatestAccessError() {
        document.getElementById('latest-user').textContent = '--';
        document.getElementById('latest-time').textContent = '--';
        document.getElementById('latest-purpose').textContent = '--';
    }

    function setLoadingState(isLoading) {
        submitBtn.disabled = isLoading;
        if (isLoading) {
            btnText.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }

    function formatTimestamp(isoString) {
        if (!isoString) return '-';
        if (String(isoString).includes('T')) {
            const d = new Date(isoString);
            if (!isNaN(d.getTime())) {
                const pad = n => String(n).padStart(2, '0');
                return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }
        }
        return isoString;
    }

    async function fetchStaff() {
        if (SCRIPT_URL === 'REPLACE_WITH_YOUR_WEB_APP_URL') return;
        try {
            const response = await fetch(`${SCRIPT_URL}?action=getStaff`);
            const data = await response.json();
            if (data.success) {
                staffList = data.data;
                const options = `<option value="" disabled selected>Sila pilih</option>` +
                    staffList.map(s => `<option value="${s.Staff_Name}">${s.Staff_Name}</option>`).join('');
                document.getElementById('fullName').innerHTML = options;
            }
        } catch (error) {
            console.error("Error loading staff", error);
        }
    }

    // --- Staff PIN Modals Logic ---
    window.closeStaffModal = function (type) {
        if (type === 'set') document.getElementById('staff-set-pin-modal').classList.add('hidden');
        if (type === 'verify') document.getElementById('staff-verify-pin-modal').classList.add('hidden');
        pendingTransactionPayload = null;
    }

    window.submitSetStaffPin = async function () {
        const pin1 = document.getElementById('staff-new-pin').value;
        const pin2 = document.getElementById('staff-confirm-pin').value;

        if (pin1.length !== 4 || isNaN(pin1)) return alert('PIN mestilah 4 angka.');
        if (pin1 !== pin2) return alert('Ralat: PIN pengesahan tidak sepadan!');

        setLoadingState(true);
        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "setStaffPin",
                    payload: { Staff_Name: pendingTransactionPayload.fullName, PIN: pin1 }
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const data = await res.json();
            if (data.success) {
                const staffObj = staffList.find(s => s.Staff_Name === pendingTransactionPayload.fullName);
                if (staffObj) staffObj.Has_PIN = true;

                document.getElementById('staff-set-pin-modal').classList.add('hidden');
                pendingTransactionPayload.pin = pin1;
                await executePendingTransaction();
            } else {
                alert("❌ Ralat Pelayan: " + data.error);
                setLoadingState(false);
            }
        } catch (e) {
            alert('❌ Ralat sambungan. Sila semak internet anda.');
            setLoadingState(false);
        }
    }

    window.submitVerifyStaffPin = async function () {
        const pin = document.getElementById('staff-verify-pin').value;
        if (pin.length !== 4) return alert('Sila masukkan 4-digit PIN.');

        document.getElementById('staff-verify-pin-modal').classList.add('hidden');
        pendingTransactionPayload.pin = pin;
        await executePendingTransaction();
    }
});
