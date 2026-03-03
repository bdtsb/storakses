const SCRIPT_URL = 'REPLACE_WITH_YOUR_WEB_APP_URL'; // E.g., https://script.google.com/macros/s/.../exec

document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('access-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = document.getElementById('submit-loader');
    
    const successMessage = document.getElementById('success-message');
    const warningMessage = document.getElementById('warning-message');
    
    // Fetch latest access on load
    fetchLatestAccess();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (SCRIPT_URL === 'REPLACE_WITH_YOUR_WEB_APP_URL') {
            alert("Please configure the Google Apps Script URL in app.js first.");
            return;
        }

        // Gather form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.action = 'addLog';
        data.timestamp = new Date().toISOString(); // Sent for logging purposes locally, Apps Script will use server time

        // UI Feedback
        setLoadingState(true);
        successMessage.classList.add('hidden');
        warningMessage.classList.add('hidden');

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                // Using text/plain is a common workaround to avoid CORS preflight issues with typical Google Apps Script setups when sending JSON stringified
                body: JSON.stringify(data),
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
                throw new Error(result.error || "Failed to submit log.");
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert("An error occurred while submitting. Please try again or check your connection.");
        } finally {
            setLoadingState(false);
        }
    });

    async function fetchLatestAccess() {
        if (SCRIPT_URL === 'REPLACE_WITH_YOUR_WEB_APP_URL') return;

        try {
            const response = await fetch(`${SCRIPT_URL}?action=getLatest`);
            const data = await response.json();
            
            if (data.success && data.record) {
                document.getElementById('latest-user').textContent = data.record.fullName || 'N/A';
                document.getElementById('latest-time').textContent = data.record.timestamp ? formatTime(data.record.timestamp) : 'N/A';
                document.getElementById('latest-purpose').textContent = data.record.purpose || 'N/A';
            } else {
                setLatestAccessError();
            }
        } catch (error) {
            console.error('Error fetching latest access:', error);
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

    function formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('en-MY', {
            day: '2-digit',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
});
