// Frontend Configuration
const config = {
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    api: {
        timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '5000'),
        debug: import.meta.env.VITE_DEBUG_MODE === 'true'
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
export const validateConfig = () => {
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

export default config;