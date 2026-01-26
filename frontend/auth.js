// Supabase Authentication Manager (minimal changes to enable multi-user + profiles)
class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;      // Supabase auth user
        this.userProfile = null;      // Row from public.user_profiles

        this.initSupabase();

        document.addEventListener('DOMContentLoaded', () => {
            // Defer full auth check until DOM is ready
            this.checkAuth();
        });
    }

    initSupabase() {
        try {
            const url = window.ENV?.SUPABASE_URL || window.ENV_CONFIG?.SUPABASE_URL;
            const key = window.ENV?.SUPABASE_ANON_KEY || window.ENV_CONFIG?.SUPABASE_ANON_KEY;
            if (url && key && window.supabase) {
                this.supabase = window.supabase.createClient(url, key);
                console.log('✅ Supabase client ready');

                // Attach auth state change listener
                this.supabase.auth.onAuthStateChange((event, session) => {
                    this.handleAuthStateChange(event, session);
                });
            } else {
                console.warn('⚠️ Supabase config not found; auth will be disabled');
            }
        } catch (err) {
            console.error('❌ initSupabase error', err);
        }
    }

    async checkAuth() {
        // If supabase wasn't initialized, skip
        if (!this.supabase) {
            // Still wire up logout and login form listeners even when supabase config missing
            this.setupEventListeners();
            this.setupLogoutButton();
            return;
        }

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            this.currentUser = session?.user || null;
            if (this.currentUser) {
                // Load user profile (if exists)
                await this.loadUserProfile();
            }
        } catch (err) {
            console.warn('Unable to get session:', err?.message || err);
        }

        // If currently on login page and authenticated, redirect to index
        const isLoginPage = window.location.pathname.includes('login.html');
        if (this.isAuthenticated() && isLoginPage) {
            window.location.replace('index.html');
            return;
        }

        // If not authenticated and not on login page, redirect to login
        if (!this.isAuthenticated() && !isLoginPage) {
            // If the page provides a `showLogin` hook (embedded login), call it.
            if (typeof window.showLogin === 'function') {
                try { window.showLogin(); } catch (e) { console.warn('showLogin hook error', e); }
            } else {
                // Fallback to redirecting to the separate login page
                window.location.replace('login.html');
                return;
            }
        }

        this.setupEventListeners();
        this.setupLogoutButton();
        this.displayUserInfo();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const signupLink = document.getElementById('signupLink');
        if (signupLink) signupLink.addEventListener('click', (e) => this.toggleSignupMode(e));
    }

    async handleLogin(event) {
        event.preventDefault();
        if (!this.supabase) {
            this.showMessage('Authentication not configured', 'error');
            return;
        }

        const form = event.target;
        const email = (form.querySelector('#email')?.value || '').trim();
        const password = (form.querySelector('#password')?.value || '').trim();
        const isSignup = form.dataset.mode === 'signup';

        if (!email || !password) {
            this.showMessage('Please provide email and password', 'error');
            return;
        }

        try {
            if (isSignup) {
                const { data, error } = await this.supabase.auth.signUp({ email, password });
                if (error) throw error;
                // After signup, user must confirm email (depending on Supabase settings)
                this.showMessage('Signup successful — check your email to confirm', 'success');
            } else {
                const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                this.currentUser = data.user || null;
                localStorage.setItem('isAuthenticated', 'true');
                await this.loadUserProfile();

                this.showMessage('Login successful — redirecting', 'success');
                setTimeout(() => window.location.replace('index.html'), 800);
            }
        } catch (err) {
            console.error('Login error', err);
            this.showMessage(err.message || 'Authentication failed', 'error');
        }
    }

    toggleSignupMode(event) {
        event.preventDefault();
        const form = document.getElementById('loginForm');
        if (!form) return;
        const submitButton = form.querySelector('button[type="submit"]');
        const signupLink = document.getElementById('signupLink');
        const title = document.querySelector('h2');
        const isSignupMode = form.dataset.mode === 'signup';
        if (isSignupMode) {
            form.dataset.mode = 'login';
            if (submitButton) submitButton.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
            if (signupLink) signupLink.textContent = 'Sign up here';
            if (title) title.textContent = 'Water Data Dashboard';
        } else {
            form.dataset.mode = 'signup';
            if (submitButton) submitButton.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Create Account';
            if (signupLink) signupLink.textContent = 'Back to login';
            if (title) title.textContent = 'Create Account';
        }
    }

    async loadUserProfile() {
        if (!this.supabase || !this.currentUser) return;
        try {
            const { data, error } = await this.supabase.from('user_profiles').select('*').eq('user_id', this.currentUser.id).limit(1).maybeSingle();
            if (error) {
                console.warn('Could not load user_profiles:', error.message || error);
                this.userProfile = null;
                return;
            }

            if (data) {
                this.userProfile = data;
            } else {
                // Create a default profile for new user
                const insert = await this.supabase.from('user_profiles').insert([{ user_id: this.currentUser.id, email: this.currentUser.email, role: 'user', allowed_overlays: [] }]);
                if (insert.error) {
                    console.warn('Could not create user profile:', insert.error.message || insert.error);
                    this.userProfile = null;
                } else {
                    this.userProfile = insert.data && insert.data[0] ? insert.data[0] : null;
                }
            }

            // Save lightweight profile in localStorage for quick checks
            try { localStorage.setItem('authProfile', JSON.stringify(this.userProfile || {})); } catch(e) {}
        } catch (err) {
            console.error('loadUserProfile error', err);
        }
    }

    async handleLogout() {
        try {
            if (this.supabase) {
                await this.supabase.auth.signOut();
            }
        } catch (e) {
            console.warn('signOut error', e?.message || e);
        }
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authProfile');
        this.currentUser = null;
        this.userProfile = null;
        window.location.href = 'login.html';
    }

    setupLogoutButton() {
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => { e.preventDefault(); this.handleLogout(); });
        }
    }

    displayUserInfo() {
        const userInfoElement = document.getElementById('userInfo');
        const profile = this.userProfile;
        const email = profile?.email || this.currentUser?.email || '';
        if (userInfoElement && email) {
            userInfoElement.classList.remove('hidden');
            userInfoElement.innerHTML = `
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-white text-sm"></i>
                    </div>
                    <span class="ml-2 text-sm font-medium text-gray-700">${email}</span>
                </div>
            `;
        }
    }

    handleAuthStateChange(event, session) {
        console.log('Auth state changed', event, session?.user?.email);
        this.currentUser = session?.user || null;
        if (this.currentUser) this.loadUserProfile();
        else {
            this.userProfile = null;
            try { localStorage.removeItem('authProfile'); } catch(e){}
        }
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        const content = document.getElementById('messageContent');
        if (!container || !content) return;
        const colors = { success: 'bg-green-100 text-green-800 border-green-200', error: 'bg-red-100 text-red-800 border-red-200', info: 'bg-blue-100 text-blue-800 border-blue-200' };
        content.className = `p-3 rounded-lg text-sm border ${colors[type] || colors.info}`;
        content.innerHTML = `<div class="flex items-center"><i class="fas fa-info-circle mr-2"></i>${message}</div>`;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('hidden'), 4000);
    }

    isAuthenticated() {
        return !!(localStorage.getItem('isAuthenticated') === 'true' || this.currentUser);
    }

    // Returns a combined object with auth and profile for convenience
    getCurrentUser() {
        return { auth: this.currentUser, profile: this.userProfile };
    }

    getSupabaseClient() { return this.supabase; }
}

// Expose singleton
document.addEventListener('DOMContentLoaded', () => {
    if (!window.authManager) window.authManager = new AuthManager();
    // Defensive fallback: ensure any logout button invokes the auth manager
    document.addEventListener('click', (e) => {
        try {
            const btn = e.target.closest && e.target.closest('#logoutButton');
            if (btn && window.authManager && typeof window.authManager.handleLogout === 'function') {
                e.preventDefault();
                window.authManager.handleLogout();
            }
        } catch (err) {
            // ignore
        }
    });
});
