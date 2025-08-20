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
        
        const forgotPasswordForm = document.getElementById('forgotPasswordFormElement');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
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
        document.getElementById('forgotPasswordForm').style.display = 'none';
        
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
        document.getElementById('forgotPasswordForm').style.display = 'none';
    }
    
    showForgotPassword() {
        document.getElementById('registrationForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('forgotPasswordForm').style.display = 'block';
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
                    'X-Organization-ID': this.config.organizationId.toString()
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
                    'X-Organization-ID': this.config.organizationId.toString()
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
    
    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('forgotPasswordEmail').value;
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/clients/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Organization-ID': this.config.organizationId.toString()
                },
                body: JSON.stringify({
                    email: email
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Password reset link sent to your email!', 'success');
                this.showLoginForm(); // Go back to login form
            } else {
                this.showToast(data.message || 'Failed to send reset link.', 'error');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showToast('Failed to send reset link. Please try again.', 'error');
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
                    'X-Organization-ID': this.config.organizationId.toString()
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
                    'X-Organization-ID': this.config.organizationId.toString()
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
                    'X-Organization-ID': this.config.organizationId.toString()
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
    
    // Feature implementations
    quickBookAppointment() {
        // Show quick booking modal with pre-filled tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        document.getElementById('appointmentDate').value = tomorrowStr;
        document.getElementById('appointmentTime').value = '09:00';
        
        // Pre-fill user info if available
        if (this.currentUser) {
            document.getElementById('clientName').value = this.currentUser.name || '';
            document.getElementById('clientEmail').value = this.currentUser.email || '';
            document.getElementById('clientPhone').value = this.currentUser.phone || '';
        }
        
        document.getElementById('appointmentModal').style.display = 'flex';
        this.showToast('Quick booking - form pre-filled for tomorrow!', 'success');
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
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            this.showToast('Appointment not found', 'error');
            return;
        }
        
        const date = new Date(appointment.scheduled_at);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const detailsHtml = `
            <div class="appointment-details">
                <h3>${appointment.service_name}</h3>
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${timeStr}</p>
                <p><strong>Duration:</strong> ${appointment.duration || 30} minutes</p>
                <p><strong>Status:</strong> <span class="status-${appointment.status}">${appointment.status}</span></p>
                ${appointment.service_description ? `<p><strong>Description:</strong> ${appointment.service_description}</p>` : ''}
                ${appointment.client_notes ? `<p><strong>Your Notes:</strong> ${appointment.client_notes}</p>` : ''}
                ${appointment.notes ? `<p><strong>Provider Notes:</strong> ${appointment.notes}</p>` : ''}
                <div class="appointment-actions">
                    <button class="btn btn-secondary" onclick="app.rescheduleAppointment(${appointmentId})">
                        <i class="fas fa-calendar-alt"></i> Reschedule
                    </button>
                    <button class="btn btn-danger" onclick="app.cancelAppointment(${appointmentId})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
        
        // Show in a modal or dedicated section
        const modal = document.createElement('div');
        modal.className = 'modal appointment-details-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Appointment Details</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${detailsHtml}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    rescheduleAppointment(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            this.showToast('Appointment not found', 'error');
            return;
        }
        
        // Close any existing appointment details modal
        const existingModal = document.querySelector('.appointment-details-modal');
        if (existingModal) existingModal.remove();
        
        const currentDate = new Date(appointment.scheduled_at);
        const dateStr = currentDate.toISOString().split('T')[0];
        const timeStr = currentDate.toTimeString().split(' ')[0].substring(0, 5);
        
        const modal = document.createElement('div');
        modal.className = 'modal reschedule-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Reschedule Appointment</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="appointment-info">
                        <h4>${appointment.service_name}</h4>
                        <p>Current: ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <form id="rescheduleForm">
                        <div class="form-group">
                            <label for="rescheduleDate">New Date</label>
                            <input type="date" id="rescheduleDate" value="${dateStr}" min="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label for="rescheduleTime">New Time</label>
                            <input type="time" id="rescheduleTime" value="${timeStr}" required>
                        </div>
                        <div class="form-group">
                            <label for="rescheduleReason">Reason for Rescheduling (Optional)</label>
                            <textarea id="rescheduleReason" rows="3" placeholder="Let us know why you need to reschedule..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Reschedule Appointment</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle form submission
        modal.querySelector('#rescheduleForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRescheduleSubmit(appointmentId, modal);
        });
    }
    
    async handleRescheduleSubmit(appointmentId, modal) {
        const date = document.getElementById('rescheduleDate').value;
        const time = document.getElementById('rescheduleTime').value;
        const reason = document.getElementById('rescheduleReason').value;
        
        const newDateTime = new Date(`${date}T${time}`);
        const token = localStorage.getItem('clientToken');
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/appointments/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Organization-ID': this.config.organizationId.toString()
                },
                body: JSON.stringify({
                    scheduled_at: newDateTime.toISOString(),
                    client_notes: reason ? `Rescheduled: ${reason}` : 'Rescheduled by client'
                })
            });
            
            if (response.ok) {
                this.showToast('Appointment rescheduled successfully!', 'success');
                modal.remove();
                await this.loadAppointments(); // Refresh appointments
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to reschedule appointment', 'error');
            }
        } catch (error) {
            console.error('Reschedule error:', error);
            this.showToast('Failed to reschedule appointment. Please try again.', 'error');
        }
    }
    
    async cancelAppointment(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            this.showToast('Appointment not found', 'error');
            return;
        }
        
        const confirmed = confirm(`Are you sure you want to cancel your appointment for ${appointment.service_name}?`);
        if (!confirmed) return;
        
        const token = localStorage.getItem('clientToken');
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/appointments/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Organization-ID': this.config.organizationId.toString()
                },
                body: JSON.stringify({
                    status: 'cancelled',
                    client_notes: 'Cancelled by client'
                })
            });
            
            if (response.ok) {
                this.showToast('Appointment cancelled successfully', 'success');
                // Close any open modals
                const modals = document.querySelectorAll('.appointment-details-modal');
                modals.forEach(modal => modal.remove());
                await this.loadAppointments(); // Refresh appointments
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to cancel appointment', 'error');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            this.showToast('Failed to cancel appointment. Please try again.', 'error');
        }
    }
    
    bookWithProvider(providerId) {
        const provider = this.providers.find(p => p.id === providerId);
        if (!provider) {
            this.showToast('Provider not found', 'error');
            return;
        }
        
        // Pre-fill the appointment form with provider information
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        document.getElementById('appointmentDate').value = tomorrowStr;
        document.getElementById('appointmentTime').value = '09:00';
        
        // Pre-fill user info if available
        if (this.currentUser) {
            document.getElementById('clientName').value = this.currentUser.name || '';
            document.getElementById('clientEmail').value = this.currentUser.email || '';
            document.getElementById('clientPhone').value = this.currentUser.phone || '';
        }
        
        // Set a default service name based on provider
        document.getElementById('serviceName').value = provider.specialty || 'Consultation';
        
        // Add provider info to the modal title
        const modalTitle = document.querySelector('#appointmentModal .modal-header h3');
        modalTitle.textContent = `Book with ${provider.name}`;
        
        document.getElementById('appointmentModal').style.display = 'flex';
        this.showToast(`Booking form opened for ${provider.name}`, 'success');
    }
    
    editProfile() {
        if (!this.currentUser) {
            this.showToast('Please log in to edit profile', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal edit-profile-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Profile</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editProfileForm">
                        <div class="form-group">
                            <label for="editName">Full Name</label>
                            <input type="text" id="editName" value="${this.currentUser.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEmail">Email</label>
                            <input type="email" id="editEmail" value="${this.currentUser.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editPhone">Phone Number</label>
                            <input type="tel" id="editPhone" value="${this.currentUser.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label for="editAddress">Address (Optional)</label>
                            <textarea id="editAddress" rows="3" placeholder="Your address...">${this.currentUser.address || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="editNotes">Additional Notes (Optional)</label>
                            <textarea id="editNotes" rows="3" placeholder="Any additional information...">${this.currentUser.notes || ''}</textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Update Profile</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle form submission
        modal.querySelector('#editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleProfileUpdate(modal);
        });
    }
    
    async handleProfileUpdate(modal) {
        const name = document.getElementById('editName').value;
        const email = document.getElementById('editEmail').value;
        const phone = document.getElementById('editPhone').value;
        const address = document.getElementById('editAddress').value;
        const notes = document.getElementById('editNotes').value;
        
        const token = localStorage.getItem('clientToken');
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/clients/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Organization-ID': this.config.organizationId.toString()
                },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    address,
                    notes
                })
            });
            
            if (response.ok) {
                const updatedClient = await response.json();
                this.currentUser = updatedClient;
                
                // Update UI with new information
                document.getElementById('clientName').textContent = this.currentUser.name;
                document.getElementById('profileName').textContent = this.currentUser.name;
                document.getElementById('profileEmail').textContent = this.currentUser.email;
                
                this.showToast('Profile updated successfully!', 'success');
                modal.remove();
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showToast('Failed to update profile. Please try again.', 'error');
        }
    }
    
    changePassword() {
        if (!this.currentUser) {
            this.showToast('Please log in to change password', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal change-password-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Change Password</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="changePasswordForm">
                        <div class="form-group">
                            <label for="currentPassword">Current Password</label>
                            <input type="password" id="currentPassword" required>
                        </div>
                        <div class="form-group">
                            <label for="newPassword">New Password</label>
                            <input type="password" id="newPassword" minlength="8" required>
                            <small>Password must be at least 8 characters long</small>
                        </div>
                        <div class="form-group">
                            <label for="confirmNewPassword">Confirm New Password</label>
                            <input type="password" id="confirmNewPassword" minlength="8" required>
                        </div>
                        <div class="password-strength" id="passwordStrength" style="display: none;">
                            <div class="strength-bar">
                                <div class="strength-fill"></div>
                            </div>
                            <span class="strength-text">Password strength</span>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Change Password</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add password strength indicator
        const newPasswordInput = modal.querySelector('#newPassword');
        const strengthIndicator = modal.querySelector('#passwordStrength');
        
        newPasswordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            if (password.length > 0) {
                strengthIndicator.style.display = 'block';
                this.updatePasswordStrength(password, strengthIndicator);
            } else {
                strengthIndicator.style.display = 'none';
            }
        });
        
        // Handle form submission
        modal.querySelector('#changePasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePasswordChange(modal);
        });
    }
    
    updatePasswordStrength(password, indicator) {
        let strength = 0;
        let strengthText = 'Weak';
        let strengthColor = '#ff4444';
        
        // Check password criteria
        if (password.length >= 8) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        switch (strength) {
            case 0:
            case 1:
                strengthText = 'Very Weak';
                strengthColor = '#ff4444';
                break;
            case 2:
                strengthText = 'Weak';
                strengthColor = '#ff8800';
                break;
            case 3:
                strengthText = 'Fair';
                strengthColor = '#ffaa00';
                break;
            case 4:
                strengthText = 'Good';
                strengthColor = '#88cc00';
                break;
            case 5:
                strengthText = 'Strong';
                strengthColor = '#44aa44';
                break;
        }
        
        const fill = indicator.querySelector('.strength-fill');
        const text = indicator.querySelector('.strength-text');
        
        fill.style.width = `${(strength / 5) * 100}%`;
        fill.style.backgroundColor = strengthColor;
        text.textContent = strengthText;
    }
    
    async handlePasswordChange(modal) {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        // Validate passwords match
        if (newPassword !== confirmPassword) {
            this.showToast('New passwords do not match', 'error');
            return;
        }
        
        // Validate password strength
        if (newPassword.length < 8) {
            this.showToast('Password must be at least 8 characters long', 'error');
            return;
        }
        
        const token = localStorage.getItem('clientToken');
        
        try {
            const response = await fetch(`${this.config.apiUrl}/api/v1/clients/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Organization-ID': this.config.organizationId.toString()
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            if (response.ok) {
                this.showToast('Password changed successfully!', 'success');
                modal.remove();
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Password change error:', error);
            this.showToast('Failed to change password. Please try again.', 'error');
        }
    }
    
    async toggleNotifications() {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            this.showToast('Notifications are not supported in this browser', 'error');
            return;
        }
        
        const currentPermission = Notification.permission;
        
        if (currentPermission === 'denied') {
            this.showToast('Notifications are blocked. Please enable them in browser settings.', 'error');
            return;
        }
        
        if (currentPermission === 'granted') {
            // Notifications are already enabled, show settings
            this.showNotificationSettings();
        } else {
            // Request permission
            try {
                const permission = await Notification.requestPermission();
                
                if (permission === 'granted') {
                    this.showToast('Notifications enabled successfully!', 'success');
                    
                    // Show a test notification
                    new Notification('WaitLessQ Notifications', {
                        body: 'You will now receive appointment reminders and updates.',
                        icon: '/static/icons/icon-192.png'
                    });
                    
                    // Save notification preference
                    localStorage.setItem('notificationsEnabled', 'true');
                    this.showNotificationSettings();
                } else {
                    this.showToast('Notifications permission denied', 'error');
                }
            } catch (error) {
                console.error('Notification permission error:', error);
                this.showToast('Failed to request notification permission', 'error');
            }
        }
    }
    
    showNotificationSettings() {
        const isEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        const reminderTime = localStorage.getItem('appointmentReminderTime') || '24'; // hours
        
        const modal = document.createElement('div');
        modal.className = 'modal notification-settings-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Notification Settings</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="notification-setting">
                        <label class="toggle-switch">
                            <input type="checkbox" id="notificationsEnabled" ${isEnabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <div class="setting-info">
                            <h4>Push Notifications</h4>
                            <p>Receive appointment reminders and updates</p>
                        </div>
                    </div>
                    
                    <div class="notification-setting ${!isEnabled ? 'disabled' : ''}">
                        <label for="reminderTime">Appointment Reminders</label>
                        <select id="reminderTime" ${!isEnabled ? 'disabled' : ''}>
                            <option value="1" ${reminderTime === '1' ? 'selected' : ''}>1 hour before</option>
                            <option value="2" ${reminderTime === '2' ? 'selected' : ''}>2 hours before</option>
                            <option value="4" ${reminderTime === '4' ? 'selected' : ''}>4 hours before</option>
                            <option value="24" ${reminderTime === '24' ? 'selected' : ''}>1 day before</option>
                            <option value="48" ${reminderTime === '48' ? 'selected' : ''}>2 days before</option>
                        </select>
                    </div>
                    
                    <div class="notification-types ${!isEnabled ? 'disabled' : ''}">
                        <h4>Notification Types</h4>
                        <label class="checkbox-setting">
                            <input type="checkbox" id="appointmentReminders" ${!isEnabled ? 'disabled' : ''} checked>
                            Appointment Reminders
                        </label>
                        <label class="checkbox-setting">
                            <input type="checkbox" id="appointmentConfirmations" ${!isEnabled ? 'disabled' : ''} checked>
                            Appointment Confirmations
                        </label>
                        <label class="checkbox-setting">
                            <input type="checkbox" id="rescheduleNotifications" ${!isEnabled ? 'disabled' : ''} checked>
                            Reschedule Notifications
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                        <button type="button" class="btn btn-primary" onclick="app.saveNotificationSettings(this.closest('.modal'))">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle notifications toggle
        const toggleSwitch = modal.querySelector('#notificationsEnabled');
        const dependentElements = modal.querySelectorAll('#reminderTime, #appointmentReminders, #appointmentConfirmations, #rescheduleNotifications');
        const settingsSection = modal.querySelector('.notification-types');
        const reminderSection = modal.querySelector('.notification-setting:nth-child(2)');
        
        toggleSwitch.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            dependentElements.forEach(el => el.disabled = !enabled);
            settingsSection.classList.toggle('disabled', !enabled);
            reminderSection.classList.toggle('disabled', !enabled);
        });
    }
    
    saveNotificationSettings(modal) {
        const enabled = modal.querySelector('#notificationsEnabled').checked;
        const reminderTime = modal.querySelector('#reminderTime').value;
        const appointmentReminders = modal.querySelector('#appointmentReminders').checked;
        const appointmentConfirmations = modal.querySelector('#appointmentConfirmations').checked;
        const rescheduleNotifications = modal.querySelector('#rescheduleNotifications').checked;
        
        // Save to localStorage
        localStorage.setItem('notificationsEnabled', enabled.toString());
        localStorage.setItem('appointmentReminderTime', reminderTime);
        localStorage.setItem('appointmentReminders', appointmentReminders.toString());
        localStorage.setItem('appointmentConfirmations', appointmentConfirmations.toString());
        localStorage.setItem('rescheduleNotifications', rescheduleNotifications.toString());
        
        this.showToast('Notification settings saved!', 'success');
        modal.remove();
        
        // If notifications were disabled, unregister service worker notifications
        if (!enabled && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                if (registration.pushManager) {
                    registration.pushManager.getSubscription().then(subscription => {
                        if (subscription) {
                            subscription.unsubscribe();
                        }
                    });
                }
            });
        }
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