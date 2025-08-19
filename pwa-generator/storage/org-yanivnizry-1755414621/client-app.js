// Client PWA Application
class ClientPWA {
    constructor() {
        this.config = window.APP_CONFIG;
        this.currentUser = null;
        this.appointments = [];
        this.providers = [];
        this.deferredPrompt = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupInstallPrompt();
        this.showLoadingScreen();
        
        // Check if user has invitation token
        if (this.config.invitationToken) {
            await this.validateInvitationToken();
        } else {
            await this.checkAuthentication();
        }
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                if (tab) this.showTab(tab);
            });
        });
        
        // Forms
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegistration(e));
        }
        
        const loginForm = document.getElementById('loginFormElement');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Install prompt buttons
        const dismissInstallBtn = document.getElementById('dismissInstallBtn');
        if (dismissInstallBtn) {
            dismissInstallBtn.addEventListener('click', () => this.dismissInstallPrompt());
        }
        
        const installAppBtn = document.getElementById('installAppBtn');
        if (installAppBtn) {
            installAppBtn.addEventListener('click', () => this.installApp());
        }
        
        // Install prompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA: beforeinstallprompt event fired');
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
    }
    
    setupInstallPrompt() {
        console.log('PWA: Setting up install prompt');
        console.log('PWA: Display mode standalone?', window.matchMedia('(display-mode: standalone)').matches);
        
        // Show install prompt if not already installed
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            console.log('PWA: Not in standalone mode, will show install prompt in 5s');
            setTimeout(() => this.showInstallPrompt(), 5000);
        } else {
            console.log('PWA: Already in standalone mode, no install prompt needed');
        }
    }
    
    showLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'flex';
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'none';
    }
    
    showAuthScreen() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
    
    showMainApp() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
    }
    
    async validateInvitationToken() {
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/clients/validate-token/${this.config.invitationToken}`);
            const data = await response.json();
            
            if (data.valid) {
                // Show registration form with client info
                document.getElementById('registrationForm').style.display = 'block';
                document.getElementById('loginForm').style.display = 'none';
                this.showAuthScreen();
                
                // Pre-populate client info if available
                if (data.client_name) {
                    this.showToast(`Welcome ${data.client_name}! Please create your password.`, 'info');
                }
            } else {
                this.showToast('Invalid or expired invitation link.', 'error');
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Error validating invitation token:', error);
            this.showToast('Error validating invitation. Please try again.', 'error');
            this.showLoginForm();
        }
    }
    
    showLoginForm() {
        document.getElementById('registrationForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        
        // Hide/show registration link based on invitation token availability
        const authSwitch = document.querySelector('.auth-switch');
        console.log('Auth switch element found?', !!authSwitch);
        console.log('Invitation token for auth switch?', !!this.config.invitationToken);
        
        if (authSwitch) {
            if (this.config.invitationToken) {
                console.log('Showing registration link - invitation token available');
                authSwitch.style.display = 'block';
            } else {
                console.log('Hiding registration link - no invitation token');
                authSwitch.style.display = 'none';
            }
        }
        
        this.showAuthScreen();
    }
    
    showRegistration() {
        document.getElementById('registrationForm').style.display = 'block';
        document.getElementById('loginForm').style.display = 'none';
    }
    
    async handleRegistration(e) {
        e.preventDefault();
        
        console.log('Registration attempt - invitation token available?', !!this.config.invitationToken);
        console.log('Invitation token value:', this.config.invitationToken);
        
        // Check if invitation token is available
        if (!this.config.invitationToken) {
            console.error('Registration blocked - no invitation token');
            this.showToast('Registration requires an invitation link.', 'error');
            return;
        }
        
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            this.showToast('Passwords do not match.', 'error');
            return;
        }
        
        if (password.length < 8) {
            this.showToast('Password must be at least 8 characters long.', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/clients/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invitation_token: this.config.invitationToken,
                    password: password,
                    confirm_password: confirmPassword
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('clientToken', data.access_token);
                this.showToast('Account created successfully!', 'success');
                await this.loadUserData();
                this.showMainApp();
            } else {
                this.showToast(data.message || 'Registration failed.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('Registration failed. Please try again.', 'error');
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/clients/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('clientToken', data.access_token);
                this.currentUser = data.client;
                this.providers = data.providers || [];
                this.showToast('Login successful!', 'success');
                this.showMainApp();
                await this.loadDashboardData();
            } else {
                this.showToast(data.message || 'Login failed.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed. Please try again.', 'error');
        }
    }
    
    async checkAuthentication() {
        const token = localStorage.getItem('clientToken');
        
        if (!token) {
            this.showLoginForm();
            return;
        }
        
        try {
            // Validate token by making a request to get user data
            const response = await fetch(`${this.config.apiUrl}/api/v1/clients/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.client;
                this.providers = data.providers || [];
                this.showMainApp();
                await this.loadDashboardData();
            } else {
                localStorage.removeItem('clientToken');
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            localStorage.removeItem('clientToken');
            this.showLoginForm();
        }
    }
    
    async loadUserData() {
        const token = localStorage.getItem('clientToken');
        if (!token) return;
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/clients/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.client;
                this.providers = data.providers || [];
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    async loadDashboardData() {
        if (!this.currentUser) return;
        
        // Update UI with user info
        document.getElementById('clientName').textContent = this.currentUser.name;
        document.getElementById('profileName').textContent = this.currentUser.name;
        document.getElementById('profileEmail').textContent = this.currentUser.email;
        
        // Load appointments and update stats
        await this.loadAppointments();
        this.updateDashboardStats();
        this.loadRecentActivity();
    }
    
    async loadAppointments() {
        const token = localStorage.getItem('clientToken');
        if (!token) return;
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/appointments/client`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.appointments = data.appointments || [];
                this.renderAppointments();
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    }
    
    updateDashboardStats() {
        const totalAppointments = this.appointments.length;
        const upcomingAppointments = this.appointments.filter(apt => 
            new Date(apt.scheduled_at) > new Date()
        ).length;
        const providersCount = this.providers.length;
        
        document.getElementById('totalAppointments').textContent = totalAppointments;
        document.getElementById('upcomingCount').textContent = upcomingAppointments;
        document.getElementById('providersCount').textContent = providersCount;
        
        // Profile stats
        document.getElementById('profileTotalAppointments').textContent = totalAppointments;
        document.getElementById('profileProviders').textContent = providersCount;
        
        if (this.currentUser.account_created_at) {
            const memberSince = new Date(this.currentUser.account_created_at).getFullYear();
            document.getElementById('memberSince').textContent = memberSince;
        }
    }
    
    loadRecentActivity() {
        const recentActivity = document.getElementById('recentActivity');
        
        // Get recent appointments (last 5)
        const recent = this.appointments
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);
        
        if (recent.length === 0) {
            recentActivity.innerHTML = '<p class="text-muted">No recent activity</p>';
            return;
        }
        
        recentActivity.innerHTML = recent.map(apt => `
            <div class="activity-item">
                <i class="fas fa-calendar"></i>
                <div>
                    <p><strong>${apt.service_name}</strong></p>
                    <small>${this.formatDate(apt.scheduled_at)}</small>
                </div>
            </div>
        `).join('');
    }
    
    renderAppointments(filter = 'all') {
        const appointmentsList = document.getElementById('appointmentsList');
        let filteredAppointments = this.appointments;
        
        const now = new Date();
        
        switch (filter) {
            case 'upcoming':
                filteredAppointments = this.appointments.filter(apt => new Date(apt.scheduled_at) > now);
                break;
            case 'past':
                filteredAppointments = this.appointments.filter(apt => new Date(apt.scheduled_at) <= now);
                break;
        }
        
        if (filteredAppointments.length === 0) {
            appointmentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No appointments found</h3>
                    <p>No appointments match your current filter.</p>
                </div>
            `;
            return;
        }
        
        appointmentsList.innerHTML = filteredAppointments.map(apt => `
            <div class="appointment-card">
                <div class="appointment-header">
                    <h3>${apt.service_name}</h3>
                    <span class="status-badge status-${apt.status}">${apt.status}</span>
                </div>
                <div class="appointment-details">
                    <p><i class="fas fa-calendar"></i> ${this.formatDate(apt.scheduled_at)}</p>
                    <p><i class="fas fa-clock"></i> ${this.formatTime(apt.scheduled_at)}</p>
                    <p><i class="fas fa-building"></i> ${apt.provider_name || 'Provider'}</p>
                </div>
                <div class="appointment-actions">
                    <button class="btn btn-secondary" onclick="app.viewAppointment(${apt.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${new Date(apt.scheduled_at) > now ? `
                        <button class="btn btn-primary" onclick="app.rescheduleAppointment(${apt.id})">
                            <i class="fas fa-edit"></i> Reschedule
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    renderProviders() {
        const providersList = document.getElementById('providersList');
        
        if (this.providers.length === 0) {
            providersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <h3>No providers found</h3>
                    <p>You haven't made any appointments yet.</p>
                </div>
            `;
            return;
        }
        
        providersList.innerHTML = this.providers.map(provider => `
            <div class="provider-card">
                <div class="provider-header">
                    <h3>${provider.business_name}</h3>
                    <div class="provider-rating">
                        <i class="fas fa-star"></i>
                        <span>4.8</span>
                    </div>
                </div>
                <div class="provider-details">
                    <p><i class="fas fa-map-marker-alt"></i> ${provider.address || 'Address not provided'}</p>
                    <p><i class="fas fa-phone"></i> ${provider.phone || 'Phone not provided'}</p>
                    <p><i class="fas fa-envelope"></i> ${provider.contact_email || 'Email not provided'}</p>
                </div>
                <div class="provider-actions">
                    <button class="btn btn-primary" onclick="app.bookWithProvider(${provider.id})">
                        <i class="fas fa-calendar-plus"></i> Book Appointment
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    showTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
        
        // Load data based on tab
        switch (tabName) {
            case 'appointments':
                this.renderAppointments();
                break;
            case 'providers':
                this.renderProviders();
                break;
        }
    }
    
    filterAppointments(filter) {
        // Update filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        this.renderAppointments(filter);
    }
    
    showInstallPrompt() {
        console.log('PWA: showInstallPrompt called, deferredPrompt available?', !!this.deferredPrompt);
        if (this.deferredPrompt) {
            console.log('PWA: Showing install prompt');
            document.getElementById('installPrompt').style.display = 'block';
        } else {
            console.log('PWA: No deferred prompt available, cannot show install prompt');
        }
    }
    
    dismissInstallPrompt() {
        document.getElementById('installPrompt').style.display = 'none';
    }
    
    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.showToast('App installed successfully!', 'success');
            }
            
            this.deferredPrompt = null;
            this.dismissInstallPrompt();
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
    
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    logout() {
        localStorage.removeItem('clientToken');
        this.currentUser = null;
        this.appointments = [];
        this.providers = [];
        this.showToast('Logged out successfully', 'success');
        this.showLoginForm();
    }
    
    // Placeholder methods for future implementation
    quickBookAppointment() {
        this.showToast('Quick booking feature coming soon!', 'info');
    }
    
    viewNextAppointment() {
        const upcoming = this.appointments.filter(apt => 
            new Date(apt.scheduled_at) > new Date()
        ).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
        
        if (upcoming.length > 0) {
            this.showTab('appointments');
            this.filterAppointments('upcoming');
        } else {
            this.showToast('No upcoming appointments', 'info');
        }
    }
    
    viewAppointment(appointmentId) {
        this.showToast('Appointment details coming soon!', 'info');
    }
    
    rescheduleAppointment(appointmentId) {
        this.showToast('Reschedule feature coming soon!', 'info');
    }
    
    bookWithProvider(providerId) {
        this.showToast('Provider booking coming soon!', 'info');
    }
    
    editProfile() {
        this.showToast('Profile editing coming soon!', 'info');
    }
    
    changePassword() {
        this.showToast('Password change coming soon!', 'info');
    }
    
    toggleNotifications() {
        this.showToast('Notifications coming soon!', 'info');
    }
    
    showUserMenu() {
        this.showTab('profile');
    }
}

// Global functions for onclick handlers

// Note: These methods are implemented in the main ClientPWA class above

function filterAppointments(filter) {
    app.filterAppointments(filter);
}

// Global functions for HTML onclick handlers
function showRegistration() {
    if (window.app) window.app.showRegistration();
}

function toggleNotifications() {
    if (window.app) window.app.toggleNotifications();
}

function showUserMenu() {
    if (window.app) window.app.showUserMenu();
}

function showTab(tab) {
    if (window.app) window.app.showTab(tab);
}

function quickBookAppointment() {
    if (window.app) window.app.quickBookAppointment();
}

function viewNextAppointment() {
    if (window.app) window.app.viewNextAppointment();
}

function showBookingForm() {
    if (window.app) window.app.showBookingForm();
}

function editProfile() {
    if (window.app) window.app.editProfile();
}

function changePassword() {
    if (window.app) window.app.changePassword();
}

function logout() {
    if (window.app) window.app.logout();
}

function installApp() {
    console.log('Global installApp called, window.app available?', !!window.app);
    if (window.app && typeof window.app.installApp === 'function') {
        window.app.installApp();
    } else {
        console.error('installApp called but window.app or installApp method not available');
    }
}

function dismissInstallPrompt() {
    console.log('Global dismissInstallPrompt called, window.app available?', !!window.app);
    if (window.app && typeof window.app.dismissInstallPrompt === 'function') {
        window.app.dismissInstallPrompt();
    } else {
        console.error('dismissInstallPrompt called but window.app or dismissInstallPrompt method not available');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ClientPWA');
    window.app = new ClientPWA();
    console.log('ClientPWA initialized, window.app available:', !!window.app);
});

// Ensure global functions are available immediately
console.log('Client-app.js loaded, global functions defined');

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientPWA;
}