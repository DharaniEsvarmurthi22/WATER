// Authentication module for Water Dashboard
class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Initialize Supabase client
            this.supabase = supabase.createClient(
                window.config.supabase.url,
                window.config.supabase.anonKey
            );

            // Check if user is already logged in
            const { data: { user } } = await this.supabase.auth.getUser();
            this.currentUser = user;

            // Set up auth state listener
            this.supabase.auth.onAuthStateChange((event, session) => {
                this.currentUser = session?.user || null;
                this.handleAuthStateChange(event, session);
            });

            // Initialize page-specific functionality
            this.initPageHandlers();
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            this.showMessage('Configuration error. Please check your Supabase settings.', 'error');
        }
    }

    initPageHandlers() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        switch (currentPage) {
            case 'login.html':
                this.initLoginPage();
                break;
            case 'index.html':
            case '':
                this.initDashboardPage();
                break;
            case 'location.html':
                this.initLocationPage();
                break;
        }
    }

    initLoginPage() {
        // Redirect if already logged in
        if (this.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        const loginForm = document.getElementById('loginForm');
        const signupLink = document.getElementById('signupLink');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (signupLink) {
            signupLink.addEventListener('click', (e) => this.toggleSignupMode(e));
        }
    }

    initDashboardPage() {
        // Redirect if not logged in
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Initialize dashboard-specific auth features
        this.setupLogoutButton();
        this.displayUserInfo();
    }

    initLocationPage() {
        // Redirect if not logged in
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        this.setupLogoutButton();
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const isSignupMode = document.getElementById('loginForm').dataset.mode === 'signup';

        try {
            this.showMessage('Processing...', 'info');
            
            let result;
            if (isSignupMode) {
                result = await this.supabase.auth.signUp({
                    email: email,
                    password: password
                });
            } else {
                result = await this.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
            }

            if (result.error) {
                throw result.error;
            }

            if (isSignupMode && !result.data.session) {
                this.showMessage('Please check your email for verification link.', 'success');
            } else {
                this.showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }

        } catch (error) {
            console.error('Auth error:', error);
            this.showMessage(error.message || 'Authentication failed', 'error');
        }
    }

    toggleSignupMode(event) {
        event.preventDefault();
        
        const form = document.getElementById('loginForm');
        const submitButton = form.querySelector('button[type="submit"]');
        const signupLink = document.getElementById('signupLink');
        const title = document.querySelector('h2');
        
        const isSignupMode = form.dataset.mode === 'signup';
        
        if (isSignupMode) {
            // Switch to login mode
            form.dataset.mode = 'login';
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
            signupLink.textContent = 'Sign up here';
            title.textContent = 'Water Data Dashboard';
        } else {
            // Switch to signup mode
            form.dataset.mode = 'signup';
            submitButton.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Create Account';
            signupLink.textContent = 'Back to login';
            title.textContent = 'Create Account';
        }
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.showMessage('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Logout failed', 'error');
        }
    }

    setupLogoutButton() {
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.logout());
        }
    }

    displayUserInfo() {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement && this.currentUser) {
            userInfoElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-white text-sm"></i>
                    </div>
                    <span class="text-sm font-medium text-gray-700">${this.currentUser.email}</span>
                </div>
            `;
        }
    }

    handleAuthStateChange(event, session) {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Update current user
        this.currentUser = session?.user || null;
        
        // Handle different auth events
        switch (event) {
            case 'SIGNED_IN':
                console.log('User signed in');
                break;
            case 'SIGNED_OUT':
                console.log('User signed out');
                break;
            case 'TOKEN_REFRESHED':
                console.log('Token refreshed');
                break;
        }
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        const content = document.getElementById('messageContent');
        
        if (!container || !content) return;

        const colors = {
            success: 'bg-green-100 text-green-800 border-green-200',
            error: 'bg-red-100 text-red-800 border-red-200',
            info: 'bg-blue-100 text-blue-800 border-blue-200',
            warning: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        content.className = `p-3 rounded-lg text-sm border ${colors[type] || colors.info}`;
        content.innerHTML = `
            <div class="flex items-center">
                <i class="${icons[type] || icons.info} mr-2"></i>
                ${message}
            </div>
        `;

        container.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }

    // Utility method to check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get Supabase client for other modules
    getSupabaseClient() {
        return this.supabase;
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});
