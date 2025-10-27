// Advanced Overlays Configuration with Multiple Storage Options
// You can now load KML files from: Local files, Supabase Storage, or External URLs

const OVERLAY_CONFIG = {
    // Enable/disable auto-loading
    autoLoad: true,

    // Supabase Storage Settings
    useSupabaseStorage: true,
    storageBucket: 'kml-overlays',  // Supabase storage bucket name

    // List of overlay files to load automatically
    overlays: [
        // ═══════════════════════════════════════════════════════
        // METHOD 2: Supabase Storage (Production - Currently Active)
        // ═══════════════════════════════════════════════════════
        {
            name: 'Nallampatti Cluster',
            source: 'supabase',  // Loads from Supabase Storage (cloud)
            file: 'nallampatti_cluster.kml',
            enabled: true,
            description: '5 villages in Salem district'
        },

        // ═══════════════════════════════════════════════════════
        // METHOD 2: Supabase Storage (Recommended for Production!)
        // Best for: Large files, frequently updated maps, production
        // ═══════════════════════════════════════════════════════
        // {
        //     name: 'Tamil Nadu Districts',
        //     source: 'supabase',  // Loads from Supabase Storage
        //     file: 'tn-districts.kml',  // Just filename (in kml-overlays bucket)
        //     enabled: true,
        //     description: 'All district boundaries'
        // },

        // ═══════════════════════════════════════════════════════
        // METHOD 3: External URL
        // Best for: Government data, external sources
        // ═══════════════════════════════════════════════════════
        // {
        //     name: 'Government Data',
        //     source: 'url',  // Loads from any URL
        //     file: 'https://example.com/data/boundaries.kml',
        //     enabled: false,
        //     description: 'Official boundaries'
        // }
    ]
};

// Make it globally available
window.OVERLAY_CONFIG = OVERLAY_CONFIG;
