// Environment Configuration Script
// This script loads environment variables for the Water Dashboard

(function() {
    'use strict';

    // Check if we're in a development environment
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('local');

    // Environment configuration
    const environments = {
        development: {
            SUPABASE_URL: 'YOUR_SUPABASE_URL_DEV',
            SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_DEV',
            DEBUG: true,
            API_TIMEOUT: 10000
        },
        production: {
            SUPABASE_URL: window.ENV_SUPABASE_URL || 'YOUR_SUPABASE_URL_PROD',
            SUPABASE_ANON_KEY: window.ENV_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_PROD',
            DEBUG: false,
            API_TIMEOUT: 5000
        }
    };

    // Select environment
    const currentEnv = isDevelopment ? 'development' : 'production';
    const config = environments[currentEnv];

    // Expose configuration globally
    window.SUPABASE_URL = config.SUPABASE_URL;
    window.SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
    window.DEBUG_MODE = config.DEBUG;
    window.API_TIMEOUT = config.API_TIMEOUT;

    // Log environment info (only in development)
    if (config.DEBUG) {
        console.log(`🌊 Water Dashboard - ${currentEnv.toUpperCase()} Environment`);
        console.log('Configuration loaded:', {
            environment: currentEnv,
            supabaseConfigured: !!config.SUPABASE_URL && config.SUPABASE_URL !== 'YOUR_SUPABASE_URL_DEV' && config.SUPABASE_URL !== 'YOUR_SUPABASE_URL_PROD',
            debugMode: config.DEBUG,
            apiTimeout: config.API_TIMEOUT
        });
    }

    // Validation function
    window.validateEnvironment = function() {
        const issues = [];

        if (!config.SUPABASE_URL || config.SUPABASE_URL.includes('YOUR_SUPABASE_URL')) {
            issues.push('Supabase URL not configured');
        }

        if (!config.SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')) {
            issues.push('Supabase Anonymous Key not configured');
        }

        if (issues.length > 0) {
            console.error('❌ Environment Configuration Issues:', issues);
            return false;
        }

        console.log('✅ Environment configuration is valid');
        return true;
    };

    // Auto-validate on load
    if (config.DEBUG) {
        setTimeout(() => {
            window.validateEnvironment();
        }, 100);
    }

})();
