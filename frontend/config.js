// Frontend Configuration
// NOTE: This file is legacy. Use env-config.js and ENV_CONFIG instead.
const config = {
    supabase: {
        url: null, // Set via env-config.js
        anonKey: null, // Set via env-config.js
    },
    api: {
        timeout: 5000,
        debug: false
    },
    map: {
        styles: {
            street: 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
            satellite: 'https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
        },
        defaultCenter: [-96, 37.8], // Center of USA
        defaultZoom: 4
    }
};

// Validation function
window.validateConfig = () => {
    const issues = [];

    if (!config.supabase.url) {
        issues.push('Supabase URL not configured');
    }

    if (!config.supabase.anonKey) {
        issues.push('Supabase Anonymous Key not configured');
    }

    if (issues.length > 0) {
        console.error('❌ Environment Configuration Issues:', issues);
        return false;
    }

    console.log('✅ Environment configuration is valid');
    return true;
};

window.config = config;