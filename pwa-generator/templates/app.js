// Basic PWA Application (for backward compatibility)
const API_URL = '{{ api_url }}';
const PROVIDER_ID = {{ provider_id }};

// Install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

function showInstallButton() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'inline-block';
        installBtn.addEventListener('click', installApp);
    }
}

async function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        
        deferredPrompt = null;
        document.getElementById('installBtn').style.display = 'none';
    }
}

// Modal functions
function showAppointmentForm() {
    document.getElementById('appointmentModal').style.display = 'flex';
}

function showQueueForm() {
    document.getElementById('queueModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Form submissions
document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const appointmentData = {
        client_name: formData.get('clientName'),
        client_email: formData.get('clientEmail'),
        client_phone: formData.get('clientPhone'),
        service_name: formData.get('serviceName'),
        scheduled_at: `${formData.get('appointmentDate')}T${formData.get('appointmentTime')}:00`,
        notes: formData.get('clientNotes'),
        provider_id: PROVIDER_ID
    };
    
    try {
        const response = await fetch(`${API_URL}/api/v1/appointments/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            showStatus('Appointment booked successfully!', 'success');
            closeModal('appointmentModal');
            e.target.reset();
        } else {
            showStatus('Failed to book appointment. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
        showStatus('Network error. Please check your connection.', 'error');
    }
});

document.getElementById('queueForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const queueData = {
        client_name: formData.get('queueName'),
        client_phone: formData.get('queuePhone'),
        client_email: formData.get('queueEmail'),
        notes: formData.get('queueNotes'),
        provider_id: PROVIDER_ID
    };
    
    try {
        const response = await fetch(`${API_URL}/api/v1/queue/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(queueData)
        });
        
        if (response.ok) {
            const data = await response.json();
            showStatus(`Added to queue! Your position: ${data.position}`, 'success');
            closeModal('queueModal');
            e.target.reset();
        } else {
            showStatus('Failed to join queue. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error joining queue:', error);
        showStatus('Network error. Please check your connection.', 'error');
    }
});

function showStatus(message, type) {
    const statusSection = document.getElementById('statusSection');
    const statusContent = document.getElementById('statusContent');
    
    statusContent.innerHTML = `
        <div class="status-message ${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        </div>
    `;
    
    statusSection.style.display = 'block';
    
    setTimeout(() => {
        statusSection.style.display = 'none';
    }, 5000);
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('PWA initialized');
});
