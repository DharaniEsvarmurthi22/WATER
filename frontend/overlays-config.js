// KML/GeoJSON Overlay Configuration
// Add your custom overlays here - they will load automatically

const OVERLAY_CONFIG = {
    // Enable/disable auto-loading
    autoLoad: true,
    
    // List of overlay files to load automatically
    overlays: [
        {
            name: 'Nallampatti Cluster',
            file: 'nallampatti_cluster.kml',
            enabled: true,
            description: '7 villages in Salem district'
        }
        // Add more overlays here in the future:
        // {
        //     name: 'Coimbatore Region',
        //     file: 'coimbatore_region.kml',
        //     enabled: true,
        //     description: 'Coimbatore water bodies'
        // },
        // {
        //     name: 'Chennai Cluster',
        //     file: 'chennai_cluster.geojson',
        //     enabled: false,  // Set to true to auto-load
        //     description: 'Chennai lakes and ponds'
        // }
    ]
};

// Make it globally available
window.OVERLAY_CONFIG = OVERLAY_CONFIG;
