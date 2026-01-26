// env-config.js - Environment configuration

// Default configuration
const ENV_CONFIG = {
    // API Configuration
    API_URL: 'http://localhost:3000',
    API_VERSION: 'v1',

    // Map Configuration
    DEFAULT_CENTER: [0, 0],
    DEFAULT_ZOOM: 4,
    MAP_STYLE_STREET: 'https://api.maptiler.com/maps/streets/style.json',
    MAP_STYLE_SATELLITE: 'https://api.maptiler.com/maps/hybrid/style.json',

    // Authentication
    AUTH_REQUIRED: true,
    AUTH_STORAGE_KEY: 'water_dashboard_auth',

    // Data Refresh
    REFRESH_INTERVAL: 30000, // 30 seconds

    // Feature Flags
    ENABLE_HEATMAP: true,
    ENABLE_CUSTOM_OVERLAYS: true,
    ENABLE_LOCATION_TRACKING: true
};

// Supabase Configuration
ENV_CONFIG.SUPABASE_URL = 'https://uvqcctheqvuilwfbpqcd.supabase.co';
ENV_CONFIG.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cWNjdGhlcXZ1aWx3ZmJwcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA0NDgsImV4cCI6MjA3NjcxNjQ0OH0.BDPOk3CicghYD18lqRCvITbLyHKLP_mQWtprXrkXphs';

// Storage bucket for KML overlays (used by upload_kml.js)
ENV_CONFIG.KML_BUCKET = 'kml-overlays';

// Backward-compatible overlay config object
window.OVERLAY_CONFIG = window.OVERLAY_CONFIG || { storageBucket: ENV_CONFIG.KML_BUCKET };

// Make configuration available globally
window.ENV_CONFIG = ENV_CONFIG;

// Backward compatibility
window.ENV = {
    SUPABASE_URL: ENV_CONFIG.SUPABASE_URL,
    SUPABASE_ANON_KEY: ENV_CONFIG.SUPABASE_ANON_KEY
};