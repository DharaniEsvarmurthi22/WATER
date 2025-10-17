// Configuration file for the Water Dashboard application
class Config {
    constructor() {
        // Supabase configuration - these will be loaded from environment or set directly
        this.supabase = {
            url: window.SUPABASE_URL || 'YOUR_SUPABASE_URL',
            anonKey: window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
        };

        // MapLibre configuration
        this.map = {
            defaultCenter: [-98.5795, 39.8283], // Center of USA
            defaultZoom: 4,
            styles: {
                street: 'https://demotiles.maplibre.org/style.json',
                satellite: 'https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL'
            }
        };

        // Application settings
        this.app = {
            name: 'Water Data Dashboard',
            version: '1.0.0',
            refreshInterval: 30000, // 30 seconds for real-time updates
            maxHistoryPoints: 100
        };

        // Data visualization settings
        this.visualization = {
            colors: {
                primary: '#0ea5e9',
                secondary: '#06b6d4',
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                gradient: ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
            },
            markerSizes: {
                small: 8,
                medium: 12,
                large: 16
            }
        };
    }

    // Method to validate configuration
    isValid() {
        return this.supabase.url !== 'YOUR_SUPABASE_URL' && 
               this.supabase.anonKey !== 'YOUR_SUPABASE_ANON_KEY';
    }

    // Method to get marker color based on data value
    getMarkerColor(value, min = 0, max = 100) {
        const ratio = (value - min) / (max - min);
        const colors = this.visualization.colors.gradient;
        
        if (ratio <= 0.2) return colors[0]; // Blue
        if (ratio <= 0.4) return colors[1]; // Cyan
        if (ratio <= 0.6) return colors[2]; // Green
        if (ratio <= 0.8) return colors[3]; // Yellow
        return colors[4]; // Red
    }
}

// Export configuration instance
window.config = new Config();
