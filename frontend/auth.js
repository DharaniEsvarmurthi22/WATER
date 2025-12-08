// Supabase Authentication Manager
class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;

        // Initialize Supabase
        this.initSupabase();

        // Check if we're on the login page
        const isLoginPage = window.location.pathname.includes('login.html');

        // Check authentication status
        this.checkAuth(isLoginPage);
    }

    async initSupabase() {
        try {
            if (window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
                this.supabase = window.supabase.createClient(
                    window.ENV.SUPABASE_URL,
                    window.ENV.SUPABASE_ANON_KEY
                );
                console.log('✅ Supabase Auth initialized');

                // Get current session
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session) {
                    this.currentUser = session.user;
                    console.log('✅ User session found:', this.currentUser.email);
                }
            } else {
                console.warn('⚠️ Supabase credentials not found');
            }
        } catch (error) {
            console.error('❌ Failed to initialize Supabase Auth:', error);
        }
    }

    async checkAuth(isLoginPage) {
        // Wait for Supabase to initialize
        await this.initSupabase();

        // If we're authenticated and on login page, redirect to dashboard
        if (this.isAuthenticated() && isLoginPage) {
            window.location.replace('index.html');
            return;
        }

        // If we're not authenticated and not on login page, redirect to login
        if (!this.isAuthenticated() && !isLoginPage) {
            window.location.replace('login.html');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form handler
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button handler
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // Password toggle handler
        const togglePassword = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                const icon = togglePassword.querySelector('i');
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
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

    handleLogin(event) {
        event.preventDefault();

        const username = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        console.log('Login attempt:', { username, password }); // Debug log

        if (username === this.ADMIN_USERNAME && password === this.ADMIN_PASSWORD) {
            // Store auth state
            localStorage.setItem('isAuthenticated', 'true');

            // Show success message
            this.showMessage('Login successful! Redirecting...', 'success');

            // Update button state
            const submitButton = event.target.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Redirecting...';

            console.log('Login successful, redirecting...'); // Debug log

            // Redirect to dashboard
            setTimeout(() => {
                window.location.replace('index.html');
            }, 1000);
        } else {
            console.log('Login failed: Invalid credentials'); // Debug log
            this.showMessage('Invalid username or password', 'error');
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

    async handleLogout() {
        try {
            // Sign out from Supabase
            if (this.supabase) {
                const { error } = await this.supabase.auth.signOut();
                if (error) {
                    console.error('❌ Logout error:', error);
                }
            }

            // Clear all auth-related data
            localStorage.clear();
            sessionStorage.clear();
            this.currentUser = null;

            // Show logout message
            this.showMessage('Logging out...', 'info');

            console.log('✅ User logged out');

            // Force reload and redirect to login page
            window.location.href = 'login.html';
        } catch (error) {
            console.error('❌ Logout failed:', error);
            // Still redirect even if logout fails
            window.location.href = 'login.html';
        }
    }

    setupLogoutButton() {
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
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
        return localStorage.getItem('isAuthenticated') === 'true' || this.currentUser !== null;
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
