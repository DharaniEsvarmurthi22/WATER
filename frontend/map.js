// Map Manager for Water Quality Monitoring Dashboard
class MapManager {
    constructor() {
        this.map = null;
        this.currentStyle = 'street';
        this.markers = [];
        this.kmlLayers = [];
        this.heatmapLayer = null;
        this.colorscaleManager = null;  // Will be initialized after map loads
        this.overlayConfig = window.OVERLAY_CONFIG || { autoLoad: false, overlays: [] };
        this.lastClickedLocation = null;  // Track last clicked location for dashboard
        this.layersVisible = {
            sensors: true,
            heatmap: false,
            overlays: true
        };

        this.villages = {
            salem: [
                { name: 'Salem South', coords: [78.1460, 11.6643], id: 'salemsouth' },
                { name: 'Yercaud', coords: [78.2067, 11.7778], id: 'yercaud' },
                { name: 'Sankari', coords: [77.8833, 11.4833], id: 'sankari' },
                { name: 'Edappadi', coords: [77.8167, 11.6833], id: 'edappadi' },
                { name: 'Omalur', coords: [78.0333, 11.7333], id: 'omalur' },
                { name: 'Mettur', coords: [77.8000, 11.7833], id: 'mettur' }
            ]
        };

        this.init();
    }

    async init() {
        try {
            await this.initializeMap();
            this.setupEventListeners();
            this.addVillageMarkers();
            await this.loadDefaultKMLOverlays(); // Load KML automatically

            // Initialize colorscale manager after map is ready
            if (window.ColorscaleManager) {
                this.colorscaleManager = new window.ColorscaleManager(this);
                console.log('✅ Colorscale manager initialized');
            }

            // Don't restore map state on page refresh - keep default globe view
            // this.restoreMapState();
            this.hideLoadingOverlay();
        } catch (error) {
            console.error('Map initialization error:', error);
            this.showError('Failed to initialize map. Please refresh the page.');
        }
    }

    async loadDefaultKMLOverlays() {
        // Auto-load KML/GeoJSON overlays from multiple sources
        if (!this.overlayConfig.autoLoad) {
            console.log('ℹ️ Auto-load overlays is disabled in config');
            return;
        }

        const enabledOverlays = this.overlayConfig.overlays.filter(o => o.enabled);

        if (enabledOverlays.length === 0) {
            console.log('ℹ️ No overlays enabled in configuration');
            return;
        }

        console.log(`📍 Loading ${enabledOverlays.length} overlay(s)...`);

        for (const overlay of enabledOverlays) {
            try {
                let fileUrl;

                // Determine source and build URL
                switch (overlay.source) {
                    case 'local':
                        // Load from frontend/ folder
                        fileUrl = overlay.file;
                        break;

                    case 'supabase':
                        // Load from Supabase Storage
                        const bucket = this.overlayConfig.storageBucket || 'kml-overlays';
                        const supabaseUrl = window.ENV_CONFIG?.SUPABASE_URL;
                        if (!supabaseUrl) {
                            console.warn(`⚠️ Supabase URL not configured for: ${overlay.name}`);
                            continue;
                        }
                        fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${overlay.file}`;
                        break;

                    case 'url':
                        // Load from external URL
                        fileUrl = overlay.file;
                        break;

                    default:
                        // Fallback to local if source not specified
                        fileUrl = overlay.file;
                }

                console.log(`🔍 Attempting to load from: ${fileUrl}`);
                const response = await fetch(fileUrl);
                console.log(`📡 Response status: ${response.status} ${response.statusText}`);

                if (response.ok) {
                    const text = await response.text();
                    console.log(`📄 File size: ${text.length} bytes`);

                    // Determine file type and load
                    if (overlay.file.endsWith('.kml')) {
                        await this.loadKML(text, overlay.name, overlay.id || overlay.overlayId);
                        console.log(`✅ Loaded KML: ${overlay.name} (${overlay.source})`);
                    } else if (overlay.file.endsWith('.geojson') || overlay.file.endsWith('.json')) {
                        const geojson = JSON.parse(text);
                        await this.loadGeoJSON(geojson, overlay.name, overlay.id || overlay.overlayId);
                        console.log(`✅ Loaded GeoJSON: ${overlay.name} (${overlay.source})`);
                    }
                } else {
                    console.warn(`⚠️ Could not load: ${overlay.file} (${response.status})`);
                }
            } catch (error) {
                console.warn(`⚠️ Error loading ${overlay.name}:`, error.message);
            }
        }
    }

    saveMapState() {
        if (!this.map) return;
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const state = {
            lat: center.lat,
            lng: center.lng,
            zoom: zoom
        };
        sessionStorage.setItem('mapState', JSON.stringify(state));
        console.log('Map state saved:', state);
    }

    restoreMapState() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const lat = urlParams.get('lat');
        const lng = urlParams.get('lng');
        const zoom = urlParams.get('zoom');

        if (lat && lng && zoom) {
            this.map.flyTo({
                center: [parseFloat(lng), parseFloat(lat)],
                zoom: parseFloat(zoom),
                duration: 1000
            });
            console.log('Map state restored from URL');
            return;
        }

        // Otherwise check session storage
        const savedState = sessionStorage.getItem('mapState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.map.flyTo({
                center: [state.lng, state.lat],
                zoom: state.zoom,
                duration: 1000
            });
            console.log('Map state restored from session:', state);
        }
    }

    // Center the map on given coordinates [lng, lat]
    // Accepts optional third parameter `options`:
    // { openPopupFor: <locationId> } - after moveend attempt to open popup for that location (works for HTML markers and KML points)
    centerOnLocation(coordinates, zoomLevel = 14, options = {}) {
        if (!this.map) {
            console.warn('⚠️ centerOnLocation called but map is not initialized yet');
            return;
        }

        if (!coordinates || coordinates.length < 2) {
            console.warn('⚠️ centerOnLocation received invalid coordinates:', coordinates);
            return;
        }

        try {
            // Compute pixel offset so the marker remains visible when a right-side legend
            // or panel is present. Using project/unproject is more reliable than adjusting
            // longitude values directly (works regardless of projection or zoom).
            let legendOffsetPx = 0;
            try {
                const legend = document.getElementById('colorscaleLegend');
                if (legend && !legend.classList.contains('collapsed')) {
                    const w = legend.offsetWidth || 0;
                    // Move the visible marker left by half the legend width plus margin
                    legendOffsetPx = Math.round((w / 2) + 20);
                }
            } catch (e) {
                // ignore DOM query errors
            }

            // Start with the provided coordinates but allow overriding if a KML point
            // matching the requested locationId is found in loaded KML sources.
            let lng = parseFloat(coordinates[0]);
            let lat = parseFloat(coordinates[1]);
            let targetCoords = [lng, lat];

            // If caller requested a popup for a specific locationId, try to find a
            // matching Point feature in loaded KML/GeoJSON sources and use its exact
            // coordinates for centering (this prevents landing on polygon edges).
            if (options && options.openPopupFor && Array.isArray(this.kmlLayers) && this.kmlLayers.length > 0) {
                try {
                    const wantedId = (options.openPopupFor || '').toString().toLowerCase();
                    for (const layerInfo of this.kmlLayers) {
                        try {
                            const srcId = layerInfo.sourceId;
                            if (!srcId || !this.map.getSource || !this.map.getSource(srcId)) continue;

                            // querySourceFeatures returns features from the source (works for geojson sources)
                            const sourceFeatures = this.map.querySourceFeatures(srcId) || [];
                            if (sourceFeatures.length === 0) continue;

                            const match = sourceFeatures.find(f => {
                                const name = (f.properties && (f.properties.name || f.properties.Name)) || '';
                                if (!name) return false;
                                const fid = name.toString().toLowerCase().replace(/\s+/g, '');
                                return fid === wantedId;
                            });

                            if (match && match.geometry && match.geometry.type === 'Point' && Array.isArray(match.geometry.coordinates)) {
                                targetCoords = match.geometry.coordinates.slice(0, 2);
                                lng = parseFloat(targetCoords[0]);
                                lat = parseFloat(targetCoords[1]);
                                console.log(`🔎 Found KML point for ${wantedId}, using coords ${targetCoords}`);
                                break;
                            }
                        } catch (innerErr) {
                            // ignore per-source errors and continue
                        }
                    }
                } catch (e) {
                    console.warn('Error while searching KML sources for point feature', e);
                }
            }

            // If there is no offset required, just fly to the coordinates normally
            if (!legendOffsetPx) {
                const flyOpts = {
                    center: [lng, lat],
                    zoom: zoomLevel,
                    speed: 1.2,
                    curve: 1,
                    essential: true
                };
                // Attach moveend handler if popup open requested
                if (options && options.openPopupFor) {
                    this.map.once('moveend', () => this._tryOpenPopupAfterCenter(coordinates, options.openPopupFor));
                }
                this.map.flyTo(flyOpts);
                console.log(`🎯 Centering map (no pixel offset) on: [${lng}, ${lat}] at zoom ${zoomLevel}`);
                return;
            }

            // Project target to pixel coordinates, shift by legendOffsetPx, then unproject
            const targetPoint = this.map.project([lng, lat]);
            const adjustedPoint = { x: targetPoint.x - legendOffsetPx, y: targetPoint.y };
            const adjustedCenter = this.map.unproject(adjustedPoint);

            const flyOpts = {
                center: [adjustedCenter.lng, adjustedCenter.lat],
                zoom: zoomLevel,
                speed: 1.2,
                curve: 1,
                essential: true
            };

            if (options && options.openPopupFor) {
                // Pass the actual coordinates used for centering so popup placement is accurate
                this.map.once('moveend', () => this._tryOpenPopupAfterCenter(targetCoords, options.openPopupFor));
            }

            this.map.flyTo(flyOpts);
            console.log(`🎯 Centering map on location: [${lng}, ${lat}] at zoom ${zoomLevel} (pixelOffset=${legendOffsetPx})`);
        } catch (err) {
            console.error('❌ centerOnLocation error:', err);
        }
    }

    // Internal helper: try to open popup after map moved to a location
    _tryOpenPopupAfterCenter(coordinates, locationId) {
        try {
            // First, attempt to find an HTML marker (added via addMarkerForLocation)
            if (this.markers && this.markers.length > 0) {
                const marker = this.markers.find(m => m._element && m._element.dataset && (m._element.dataset.locationId === locationId || m._element.dataset.locationId === (locationId)));
                if (marker) {
                    try {
                        const popup = marker.getPopup ? marker.getPopup() : null;
                        if (popup && popup.addTo) {
                            popup.addTo(this.map);
                            console.log(`✅ Opened HTML marker popup for ${locationId}`);
                            return;
                        }
                    } catch (e) {
                        console.warn('Unable to open marker popup for HTML marker', e);
                    }
                }
            }

            // If no HTML marker found, try to query rendered features near the target coordinates
            const lng = parseFloat(coordinates[0]);
            const lat = parseFloat(coordinates[1]);
            const targetPx = this.map.project([lng, lat]);
            const buffer = 8; // pixels
            const features = this.map.queryRenderedFeatures([
                [targetPx.x - buffer, targetPx.y - buffer],
                [targetPx.x + buffer, targetPx.y + buffer]
            ]);

            if (features && features.length > 0) {
                // Prefer a feature whose name normalizes to the requested locationId
                let matched = features.find(f => {
                    const name = f.properties?.name || f.properties?.Name || '';
                    if (!name) return false;
                    const fid = name.toLowerCase().replace(/\s+/g, '');
                    return fid === locationId;
                }) || features[0];

                const kmlProps = matched.properties || {};
                const lngLatObj = { lng: lng, lat: lat };
                try {
                    this.showDynamicPopup(lngLatObj, locationId, kmlProps);
                    console.log(`✅ Opened KML popup for ${locationId}`);
                    return;
                } catch (e) {
                    console.warn('Unable to open KML popup', e);
                }
            }

            console.warn(`⚠️ No popup found or created for ${locationId} after centering`);
        } catch (error) {
            console.error('❌ _tryOpenPopupAfterCenter error:', error);
        }
    }

    updateMarkersWithFilter(filteredLocations) {
        // Remove existing markers
        this.markers.forEach(marker => marker.remove());
        this.markers = [];

        // Add filtered markers from the provided locations
        filteredLocations.forEach(location => {
            this.addMarkerForLocation(location);
        });
    }

    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('mapLoading');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    async initializeMap() {
        // 🌍 Use Mapbox GL JS v3 with custom satellite tiles for TRUE 3D GLOBE
        mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

        console.log('🌍 Initializing 3D Globe...');

        this.map = new mapboxgl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'satellite': {
                        type: 'raster',
                        tiles: [
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        ],
                        tileSize: 256,
                        attribution: '© Esri'
                    },
                    'osm': {
                        type: 'raster',
                        tiles: [
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '© OpenStreetMap'
                    }
                },
                layers: [
                    {
                        id: 'background',
                        type: 'background',
                        paint: {
                            'background-color': '#000000'
                        }
                    },
                    {
                        id: 'satellite-tiles',
                        type: 'raster',
                        source: 'satellite',
                        minzoom: 0,
                        maxzoom: 22,
                        layout: {
                            'visibility': 'none'  // Hidden by default
                        }
                    },
                    {
                        id: 'osm-tiles',
                        type: 'raster',
                        source: 'osm',
                        minzoom: 0,
                        maxzoom: 19
                        // Visible by default (Street view)
                    }
                ]
            },
            projection: 'globe',  // 🌍 TRUE 3D GLOBE!
            center: [78.9629, 20.5937],
            zoom: 1.5,
            pitch: 0,
            bearing: 0,
            antialias: true
        });

        // Configure globe atmosphere with stars
        this.map.on('style.load', () => {
            console.log('🎨 Style loaded, adding atmosphere...');
            this.map.setFog({
                'range': [0.8, 8],
                'color': '#000814',
                'horizon-blend': 0.1,
                'high-color': '#245bde',
                'space-color': '#000000',
                'star-intensity': 0.8
            });
            console.log('✨ Atmosphere and stars added');
        });

        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        this.map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        // Wait for map to fully load
        await new Promise((resolve) => {
            this.map.on('load', () => {
                console.log('✅ Globe fully loaded!');
                resolve();
            });
        });

        // Hide loading overlay immediately after globe loads
        this.hideLoadingOverlay();

        console.log('🌍 Globe ready - staying at world view');

        // Set current style to street (default)
        this.currentStyle = 'street';
    }

    setupEventListeners() {
        // Fix button IDs to match HTML
        const satelliteBtn = document.getElementById('satelliteViewBtn');
        const streetBtn = document.getElementById('streetViewBtn');

        if (satelliteBtn) satelliteBtn.addEventListener('click', () => this.switchToSatellite());
        if (streetBtn) streetBtn.addEventListener('click', () => this.switchToStreet());

        // Layer toggles
        const sensorsLayerToggle = document.getElementById('sensorsLayer');
        const overlaysLayerToggle = document.getElementById('overlaysLayer');

        if (sensorsLayerToggle) {
            sensorsLayerToggle.addEventListener('change', (e) => {
                this.toggleSensorsLayer(e.target.checked);
            });
        }

        if (overlaysLayerToggle) {
            overlaysLayerToggle.addEventListener('change', (e) => {
                this.toggleOverlaysLayer(e.target.checked);
            });
        }

        // File upload with database storage and device linking
        this.uploadedFiles = []; // Track uploaded files
        const fileUpload = document.getElementById('fileUpload');
        if (fileUpload) {
            fileUpload.addEventListener('change', async (e) => {
                const files = e.target.files;
                for (let file of files) {
                    try {
                        // Get current user
                        const authManager = window.authManager;
                        if (!authManager || !authManager.currentUser) {
                            this.showError('Please login to upload files');
                            continue;
                        }
                        
                        const userId = authManager.currentUser.id;
                        const supaClient = authManager.getSupabaseClient();
                        
                        if (!supaClient) {
                            this.showError('Supabase client not available');
                            continue;
                        }

                        // Show uploading message
                        this.showSuccess(`Uploading ${file.name}...`);

                        // 1. Upload file to Supabase Storage
                        const timestamp = Date.now();
                        const storagePath = `${userId}/${timestamp}_${file.name}`;
                        
                        const { data: uploadData, error: uploadError } = await supaClient.storage
                            .from('kml-overlays')
                            .upload(storagePath, file, {
                                contentType: file.name.endsWith('.kml') ? 'application/vnd.google-earth.kml+xml' : 'application/json',
                                upsert: false
                            });

                        if (uploadError) {
                            console.error('Storage upload error:', uploadError);
                            this.showError(`Upload failed: ${uploadError.message}`);
                            continue;
                        }

                        console.log('✅ File uploaded to storage:', uploadData.path);

                        // 2. Create database record
                        const overlayName = file.name.replace(/\.[^/.]+$/, "");
                        
                        const { data: kmlRecord, error: dbError } = await supaClient
                            .from('kml_overlays')
                            .insert({
                                name: overlayName,
                                file_name: file.name,
                                storage_path: uploadData.path,
                                owner_user_id: userId,
                                enabled: true
                            })
                            .select()
                            .single();

                        if (dbError) {
                            console.error('Database insert error:', dbError);
                            this.showError(`Database error: ${dbError.message}`);
                            continue;
                        }

                        console.log('✅ KML record created:', kmlRecord);

                        // 3. Load the KML file to map immediately
                        const text = await file.text();
                        if (file.name.endsWith('.kml')) {
                            await this.loadKML(text, file.name);
                        } else if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
                            await this.loadGeoJSON(JSON.parse(text), file.name);
                        }

                        this.showSuccess(`${file.name} uploaded and saved!`);

                        // 4. Show device linking popup
                        if (window.showDeviceLinkPopup) {
                            window.showDeviceLinkPopup(kmlRecord.id, kmlRecord.name);
                        }

                        // 5. Refresh the overlays list
                        if (window.authManager && window.authManager.currentUser) {
                            const currentUserId = window.authManager.currentUser.id;
                            const profile = window.authManager.userProfile;
                            
                            if (profile && profile.role === 'admin') {
                                // Admin view - refresh current selected user
                                const adminSelect = document.getElementById('adminUserSelect');
                                if (adminSelect && adminSelect.value) {
                                    const selectedUserId = adminSelect.value;
                                    if (window.renderOverlaysForUser) {
                                        await window.renderOverlaysForUser(selectedUserId);
                                    }
                                }
                            } else {
                                // Regular user - refresh own overlays
                                if (window.renderOverlaysForUser) {
                                    console.log('🔄 Refreshing overlays for user:', currentUserId);
                                    await window.renderOverlaysForUser(currentUserId);
                                }
                            }
                        }

                    } catch (error) {
                        console.error('File upload error:', error);
                        this.showError(`Failed to load ${file.name}: ${error.message}`);
                    }
                }
                fileUpload.value = '';
            });
        }
    }

    toggleSensorsLayer(visible) {
        console.log('🔘 Toggling village markers:', visible);
        this.layersVisible.sensors = visible;

        // Village markers are now the KML circle layers, not separate HTML markers
        const layers = this.map.getStyle().layers;
        const circleLayers = layers.filter(layer =>
            layer.type === 'circle' &&
            (layer.id.includes('kml') || layer.id.includes('point') || layer.id.includes('nallampatti'))
        );

        circleLayers.forEach(layer => {
            if (this.map.getLayer(layer.id)) {
                this.map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
                console.log(`   ${visible ? '👁️' : '🚫'} ${layer.id}`);
            }
        });

        console.log(`✅ Village markers ${visible ? 'shown' : 'hidden'} (${circleLayers.length} circle layers)`);
    }

    toggleHeatmapLayer(visible) {
        console.log('🔥 Toggling heatmap layer:', visible);
        this.layersVisible.heatmap = visible;

        if (visible) {
            this.createHeatmap();
        } else {
            this.removeHeatmap();
        }
    }

    toggleOverlaysLayer(visible) {
        console.log('📐 Toggling KML overlays layer:', visible);
        this.layersVisible.overlays = visible;

        // Toggle only polygon and line layers (boundaries), NOT circle markers
        const layers = this.map.getStyle().layers;
        const boundaryLayers = layers.filter(layer =>
            (layer.type === 'fill' || layer.type === 'line') &&
            (layer.id.includes('kml') ||
                layer.id.includes('polygon') ||
                layer.id.includes('line') ||
                layer.id.includes('nallampatti'))
        );

        boundaryLayers.forEach(layer => {
            if (this.map.getLayer(layer.id)) {
                this.map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
                console.log(`   ${visible ? '👁️' : '🚫'} ${layer.id}`);
            }
        });

        console.log(`✅ KML boundaries ${visible ? 'shown' : 'hidden'}`);
    }

    createHeatmap() {
        // Get all sensor locations with values
        if (!window.sensorData || !window.sensorData.locations) {
            console.warn('No sensor data available for heatmap');
            return;
        }

        const heatmapData = {
            type: 'FeatureCollection',
            features: window.sensorData.locations.map(location => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: location.coordinates || [0, 0]
                },
                properties: {
                    value: location.lastReading || 0
                }
            }))
        };

        // Add heatmap source if it doesn't exist
        if (!this.map.getSource('heatmap-source')) {
            this.map.addSource('heatmap-source', {
                type: 'geojson',
                data: heatmapData
            });
        } else {
            this.map.getSource('heatmap-source').setData(heatmapData);
        }

        // Add heatmap layer if it doesn't exist
        if (!this.map.getLayer('heatmap-layer')) {
            this.map.addLayer({
                id: 'heatmap-layer',
                type: 'heatmap',
                source: 'heatmap-source',
                paint: {
                    // Increase weight based on water quality value
                    'heatmap-weight': [
                        'interpolate',
                        ['linear'],
                        ['get', 'value'],
                        0, 0,
                        100, 1
                    ],
                    // Increase intensity as zoom level increases
                    'heatmap-intensity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, 1,
                        9, 3
                    ],
                    // Color gradient: green (good) to red (poor)
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(33,102,172,0)',
                        0.2, 'rgb(103,169,207)',
                        0.4, 'rgb(209,229,240)',
                        0.6, 'rgb(253,219,199)',
                        0.8, 'rgb(239,138,98)',
                        1, 'rgb(178,24,43)'
                    ],
                    // Adjust radius based on zoom level
                    'heatmap-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, 2,
                        9, 20
                    ],
                    // Transition from heatmap to circle layer by zoom level
                    'heatmap-opacity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        7, 1,
                        9, 0
                    ]
                }
            }, 'waterway-label'); // Insert before labels
        }

        console.log('✅ Heatmap layer created');
    }

    removeHeatmap() {
        if (this.map.getLayer('heatmap-layer')) {
            this.map.removeLayer('heatmap-layer');
        }
        if (this.map.getSource('heatmap-source')) {
            this.map.removeSource('heatmap-source');
        }
        console.log('✅ Heatmap layer removed');
    }

    switchToSatellite() {
        if (this.currentStyle === 'satellite') return;

        console.log('🛰️ Switching to satellite view...');

        // Show satellite, hide street
        this.map.setLayoutProperty('satellite-tiles', 'visibility', 'visible');
        this.map.setLayoutProperty('osm-tiles', 'visibility', 'none');

        this.currentStyle = 'satellite';

        // Update button styles
        document.getElementById('satelliteViewBtn')?.classList.add('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('satelliteViewBtn')?.classList.remove('text-gray-600', 'hover:text-gray-900');
        document.getElementById('streetViewBtn')?.classList.remove('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('streetViewBtn')?.classList.add('text-gray-600', 'hover:text-gray-900');

        console.log('✅ Switched to satellite view');
    }

    switchToStreet() {
        if (this.currentStyle === 'street') return;

        console.log('🗺️ Switching to street view...');

        // Hide satellite, show street
        this.map.setLayoutProperty('satellite-tiles', 'visibility', 'none');
        this.map.setLayoutProperty('osm-tiles', 'visibility', 'visible');

        this.currentStyle = 'street';

        // Update button styles
        document.getElementById('streetViewBtn')?.classList.add('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('streetViewBtn')?.classList.remove('text-gray-600', 'hover:text-gray-900');
        document.getElementById('satelliteViewBtn')?.classList.remove('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('satelliteViewBtn')?.classList.add('text-gray-600', 'hover:text-gray-900');

        console.log('✅ Switched to street view');
    }

    addVillageMarkers() {
        // Remove old markers
        this.markers.forEach(m => m.remove());
        this.markers = [];

        // Don't add separate markers - use KML polygons only
        console.log('📍 Using KML polygons as markers (no separate blue dots)');
    }

    addMarkerForLocation(location) {
        const coords = location.coordinates || location.coords;
        if (!coords || coords.length < 2) {
            console.warn('⚠️ Skipping location without valid coordinates:', location);
            return;
        }

        const locationId = location.location_id || location.id;

        const el = document.createElement('div');
        el.className = 'village-marker';
        el.dataset.locationId = locationId; // Add location ID for colorscale
        el.innerHTML = `<div class="marker" data-location="${locationId}" style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:2px solid #1e40af;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`;
        el.style.cursor = 'pointer';

        // Apply current visibility state from toggle
        el.style.display = this.layersVisible.sensors ? 'block' : 'none';

        console.log(`🎯 Creating marker for location: ${locationId} (visible: ${this.layersVisible.sensors})`);

        const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(coords)
            .addTo(this.map);

        el.addEventListener('click', () => {
            this.lastClickedLocation = locationId;  // Store for dashboard button
            console.log('📍 Marker clicked:', locationId);
            
            // Show location details in sidebar instead of navigating
            this.showLocationDetails(locationId);
        });

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding:8px;">
                <h3 style="font-weight:bold;margin-bottom:4px;">${location.name}</h3>
                <p style="color:#666;font-size:12px;">Water quality monitoring</p>
                <button onclick="window.mapManager.saveMapState(); window.location.href='location.html?location=${locationId}'" 
                        style="margin-top:8px;padding:4px 12px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">
                    View Dashboard
                </button>
            </div>
        `);

        marker.setPopup(popup);
        this.markers.push(marker);
    }

    // Show location details in sidebar (instead of navigating to location.html)
    showLocationDetails(locationId) {
        console.log('📊 Showing details for:', locationId);
        
        // Update the stats location filter to show this specific location
        const statsFilter = document.getElementById('statsLocationFilter');
        if (statsFilter) {
            statsFilter.value = locationId;
            // Trigger change event to update statistics
            statsFilter.dispatchEvent(new Event('change'));
        }
        
        // Update the readings location filter
        const readingsFilter = document.getElementById('locationFilter');
        if (readingsFilter) {
            readingsFilter.value = locationId;
            readingsFilter.dispatchEvent(new Event('change'));
        }
        
        console.log('✅ Location details updated in sidebar');
    }

    // Public method to update marker color by location ID
    updateMarkerColor(locationId, color) {
        const marker = this.markers.find(m => m._element.dataset.locationId === locationId);
        if (marker) {
            const markerEl = marker._element.querySelector('.marker');
            if (markerEl) {
                markerEl.style.backgroundColor = color;
                markerEl.style.borderColor = this.darkenColor(color);
                console.log(`✅ Updated marker ${locationId} to ${color}`);
                return true;
            }
        }
        console.warn(`⚠️ Marker not found for ${locationId}`);
        return false;
    }

    darkenColor(hex) {
        // Convert hex to RGB
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // Darken by 30%
        const darken = (val) => Math.max(0, Math.floor(val * 0.7));

        return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
    }

    async loadKML(kmlText, fileName, overlayId = null) {
        console.log(`🔄 Converting KML to GeoJSON: ${fileName}, overlayId: ${overlayId}`);
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlText, 'text/xml');

        // Check for parsing errors
        const parserError = kml.querySelector('parsererror');
        if (parserError) {
            console.error('❌ KML parsing error:', parserError.textContent);
            return [];
        }

        const geojson = toGeoJSON.kml(kml);
        console.log(`📊 GeoJSON features found: ${geojson.features?.length || 0}`);
        console.log('📍 GeoJSON data:', JSON.stringify(geojson, null, 2));

        if (geojson.features && geojson.features.length > 0) {
            return await this.loadGeoJSON(geojson, fileName, overlayId);
        } else {
            console.error('❌ No features found in KML file');
            return [];
        }
    }

    async loadGeoJSON(geojson, fileName, overlayId = null) {
        console.log(`📥 Loading GeoJSON: ${fileName}, overlayId: ${overlayId}`);
        const layerId = `layer-${Date.now()}`;
        const sourceId = `source-${Date.now()}`;
        const createdLayerIds = [];

        // Separate features by geometry type
        const points = geojson.features.filter(f => f.geometry.type === 'Point');
        const lines = geojson.features.filter(f => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
        const polygons = geojson.features.filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');

        console.log(`📊 Feature breakdown: ${points.length} points, ${lines.length} lines, ${polygons.length} polygons`);

        // Add Point features (villages/markers) with matching colors
        if (points.length > 0) {
            try {
                const pointSourceId = `${sourceId}-points`;
                const pointLayerId = `${layerId}-points`;

                // Assign same colors as polygons
                const villageColors = [
                    '#22c55e', '#f97316', '#3b82f6', '#a855f7', '#eab308',
                    '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f59e0b'
                ];

                points.forEach((feature, index) => {
                    feature.properties.markerColor = villageColors[index % villageColors.length];
                });

                this.map.addSource(pointSourceId, {
                    type: 'geojson',
                    data: { ...geojson, features: points }
                });
                this.map.addLayer({
                    id: pointLayerId,
                    type: 'circle',
                    source: pointSourceId,
                    paint: {
                        'circle-radius': 10,
                        'circle-color': ['get', 'markerColor'], // Match polygon color
                        'circle-stroke-width': 3,
                        'circle-stroke-color': '#ffffff',
                        'circle-opacity': 0.9
                    }
                });

                // Add click handler for KML points - show popup (same as polygons)
                this.map.on('click', pointLayerId, async (e) => {
                    console.log(`🖱️ Point marker clicked! Layer: ${pointLayerId}`);
                    if (e.features && e.features.length > 0) {
                        const feature = e.features[0];
                        console.log(`📍 Feature properties:`, feature.properties);
                        const name = feature.properties.name || feature.properties.Name;

                        if (name) {
                            // Convert name to location_id format (lowercase, no spaces)
                            const locationId = name.toLowerCase().replace(/\s+/g, '');
                            console.log(`🎯 KML point clicked: "${name}" → location_id: ${locationId}`);

                            // Show dynamic popup with current sensor data
                            await this.showDynamicPopup(e.lngLat, locationId, feature.properties);
                        } else {
                            console.warn('⚠️ No name property found in point feature');
                        }
                    } else {
                        console.warn('⚠️ No features found in point click event');
                    }
                });

                // Change cursor to pointer on hover
                this.map.on('mouseenter', pointLayerId, () => {
                    this.map.getCanvas().style.cursor = 'pointer';
                });

                this.map.on('mouseleave', pointLayerId, () => {
                    this.map.getCanvas().style.cursor = '';
                });

                this.kmlLayers.push({ layerId: pointLayerId, sourceId: pointSourceId, fileName });
                createdLayerIds.push(pointLayerId);

            } catch (error) {
                console.error(`❌ Error adding point layers:`, error.message);
            }
        }

        // Add LineString features (roads/boundaries)
        if (lines.length > 0) {
            try {
                const lineSourceId = `${sourceId}-lines`;
                const lineLayerId = `${layerId}-lines`;
                this.map.addSource(lineSourceId, {
                    type: 'geojson',
                    data: { ...geojson, features: lines }
                });
                this.map.addLayer({
                    id: lineLayerId,
                    type: 'line',
                    source: lineSourceId,
                    paint: {
                        'line-color': '#22c55e',
                        'line-width': 3,
                        'line-opacity': 0.8
                    }
                });
                this.kmlLayers.push({ layerId: lineLayerId, sourceId: lineSourceId, fileName });
                createdLayerIds.push(lineLayerId);

            } catch (error) {
                console.error(`❌ Error adding line layers:`, error.message);
            }
        }

        // Add Polygon features (areas/boundaries) with unique colors
        if (polygons.length > 0) {
            try {
                const polySourceId = `${sourceId}-polygons`;
                const polyLayerId = `${layerId}-polygons`;

                console.log(`🟢 Adding polygon layer: ${polyLayerId}`);

                // Fetch latest sensor data to apply color scale
                let sensorDataMap = {};
                if (window.getSupabaseClient) {
                    const client = window.getSupabaseClient();
                    if (client) {
                        try {
                            // ⭐ Get user's linked devices first
                            let linkedDevices = null;
                            if (typeof window.getUserLinkedDevices === 'function') {
                                linkedDevices = await window.getUserLinkedDevices();
                                console.log('🔒 Map polygon colors filtering by linked devices:', linkedDevices);
                            }
                            
                            // Build query with device filter
                            let query = client
                                .from('sensor_readings')
                                .select('sensor_id, value, timestamp, device_name');
                            
                            // Filter by linked devices if available
                            if (linkedDevices && linkedDevices.length > 0) {
                                query = query.in('device_name', linkedDevices);
                            } else if (linkedDevices && linkedDevices.length === 0) {
                                console.warn('⚠️ User has no linked devices - polygons will not be colored');
                                sensorDataMap = {};
                            } else {
                                // No filtering (admin or not logged in)
                                const { data: latestReadings } = await query
                                    .order('timestamp', { ascending: false })
                                    .limit(500);
                                
                                if (latestReadings) {
                                    latestReadings.forEach(r => {
                                        const locationId = r.sensor_id.split('_')[0];
                                        if (!sensorDataMap[locationId] || new Date(r.timestamp) > new Date(sensorDataMap[locationId].timestamp)) {
                                            sensorDataMap[locationId] = r;
                                        }
                                    });
                                    console.log('📊 Sensor data map for coloring:', sensorDataMap);
                                }
                            }
                            
                            // Only fetch if we have linked devices or no filter
                            if (!linkedDevices || linkedDevices.length > 0) {
                                const { data: latestReadings } = await query
                                    .order('timestamp', { ascending: false })
                                    .limit(500);
                                
                                if (latestReadings) {
                                    latestReadings.forEach(r => {
                                        const locationId = r.sensor_id.split('_')[0];
                                        if (!sensorDataMap[locationId] || new Date(r.timestamp) > new Date(sensorDataMap[locationId].timestamp)) {
                                            sensorDataMap[locationId] = r;
                                        }
                                    });
                                    console.log('📊 Sensor data map for coloring:', sensorDataMap);
                                }
                            }
                        } catch (err) {
                            console.warn('⚠️ Could not fetch sensor data for coloring:', err);
                        }
                    }
                }

                // Assign colors based on sensor values
                polygons.forEach((feature, index) => {
                    const name = (feature.properties.name || feature.properties.Name || '').toLowerCase();
                    const sensorData = sensorDataMap[name];
                    
                    // Color based on pH if available
                    if (sensorData && sensorData.sensor_id.includes('_ph')) {
                        const ph = sensorData.value;
                        if (ph < 6.5) feature.properties.fillColor = '#ef4444'; // Red - acidic
                        else if (ph < 7.0) feature.properties.fillColor = '#f59e0b'; // Orange
                        else if (ph < 7.5) feature.properties.fillColor = '#84cc16'; // Yellow-green
                        else if (ph < 8.5) feature.properties.fillColor = '#10b981'; // Green - good
                        else if (ph < 9.0) feature.properties.fillColor = '#3b82f6'; // Blue
                        else feature.properties.fillColor = '#8b5cf6'; // Purple
                    } else {
                        // Default colors
                        const colors = ['#22c55e', '#f97316', '#3b82f6', '#a855f7', '#eab308', '#ef4444', '#06b6d4', '#ec4899'];
                        feature.properties.fillColor = colors[index % colors.length];
                    }
                    
                    if (overlayId) {
                        feature.properties.kmlOverlayId = overlayId;
                    }
                });

                this.map.addSource(polySourceId, {
                    type: 'geojson',
                    data: { ...geojson, features: polygons }
                });

                console.log(`✅ Polygon source added: ${polySourceId}`);

                // Add polygon fill layer with data-driven styling
                this.map.addLayer({
                    id: polyLayerId,
                    type: 'fill',
                    source: polySourceId,
                    paint: {
                        'fill-color': ['get', 'fillColor'], // Use color from feature properties
                        'fill-opacity': 0.25 // Semi-transparent like district map
                    }
                });

                console.log(`✅ Polygon fill layer added: ${polyLayerId}`);

                // Add click handler for KML polygons - show dynamic popup
                this.map.on('click', polyLayerId, async (e) => {
                    console.log(`🖱️ Polygon clicked! Layer: ${polyLayerId}`);
                    if (e.features && e.features.length > 0) {
                        const feature = e.features[0];
                        console.log(`📍 Feature properties:`, feature.properties);
                        const name = feature.properties.name || feature.properties.Name;

                        if (name) {
                            // Convert name to location_id format (lowercase, no spaces)
                            const locationId = name.toLowerCase().replace(/\s+/g, '');
                            console.log(`🎯 KML polygon clicked: "${name}" → location_id: ${locationId}`);

                            // Pass KML overlay ID if available (stored in feature properties)
                            const kmlOverlayId = feature.properties.kmlOverlayId || feature.properties.overlay_id;
                            
                            // Show dynamic popup with current sensor data and device data
                            await this.showDynamicPopup(e.lngLat, locationId, { 
                                ...feature.properties,
                                kmlOverlayId: kmlOverlayId
                            });
                        } else {
                            console.warn('⚠️ No name property found in feature');
                        }
                    } else {
                        console.warn('⚠️ No features found in click event');
                    }
                });

                // Change cursor to pointer on hover
                this.map.on('mouseenter', polyLayerId, () => {
                    this.map.getCanvas().style.cursor = 'pointer';
                });

                this.map.on('mouseleave', polyLayerId, () => {
                    this.map.getCanvas().style.cursor = '';
                });

                // Add polygon outline with same color as fill
                this.map.addLayer({
                    id: `${polyLayerId}-outline`,
                    type: 'line',
                    source: polySourceId,
                    paint: {
                        'line-color': ['get', 'fillColor'], // Match fill color
                        'line-width': 3,
                        'line-opacity': 0.8
                    }
                });

                console.log(`✅ Polygon outline layer added: ${polyLayerId}-outline`);

                this.kmlLayers.push({ layerId: polyLayerId, sourceId: polySourceId, fileName });
                createdLayerIds.push(polyLayerId);
                createdLayerIds.push(`${polyLayerId}-outline`);

                console.log(`✅ Polygon layers successfully added for: ${fileName}`);

            } catch (error) {
                console.error(`❌ Error adding polygon layers:`, error);
                console.error(`   Error details:`, error.message);
            }
        }

        return createdLayerIds;
    }

    /**
     * Show popup using local window.allReadings data (fallback when Supabase unavailable)
     */
    showPopupFromLocalData(locationId, lngLat) {
        console.log(`📊 Building popup from local data for: ${locationId}`);
        
        const sensorTypes = ['ph', 'turbidity', 'temperature', 'tds'];
        const readings = {};
        
        // Filter readings for this location
        sensorTypes.forEach(type => {
            const sensorId = `${locationId}_${type}`;
            const sensorReadings = window.allReadings.filter(r => r.sensor_id === sensorId);
            
            if (sensorReadings.length > 0) {
                // Get latest reading
                const latest = sensorReadings[0];
                // Calculate average
                const avg = sensorReadings.reduce((sum, r) => sum + parseFloat(r.value), 0) / sensorReadings.length;
                
                readings[type] = {
                    current: parseFloat(latest.value),
                    average: avg,
                    timestamp: latest.timestamp,
                    rssi: latest.rssi
                };
            }
        });
        
        // Build HTML with compact design
        const locationName = locationId.charAt(0).toUpperCase() + locationId.slice(1);
        let html = `
            <div style="min-width: 300px; font-family: system-ui, -apple-system, sans-serif;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 12px 16px; margin: -15px -15px 12px -15px; border-radius: 8px 8px 0 0;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">📍 ${locationName}</h3>
                    <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Water Quality Monitoring Station</p>
                </div>
        `;
        
        const sensorInfo = {
            'ph': { name: 'pH Level', unit: '', icon: '💧', color: '#3b82f6' },
            'turbidity': { name: 'Turbidity', unit: 'NTU', icon: '🌊', color: '#10b981' },
            'temperature': { name: 'Temperature', unit: '°C', icon: '🌡️', color: '#f59e0b' },
            'tds': { name: 'TDS', unit: 'ppm', icon: '⚡', color: '#8b5cf6' }
        };
        
        if (Object.keys(readings).length > 0) {
            html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">';
            
            Object.entries(readings).forEach(([type, data]) => {
                const info = sensorInfo[type];
                const isNormal = this.checkSensorValue(type, data.current);
                const statusColor = isNormal ? '#10b981' : '#ef4444';
                
                html += `
                    <div style="background: #f8fafc; border-left: 3px solid ${info.color}; padding: 8px; border-radius: 4px;">
                        <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">${info.icon} ${info.name}</div>
                        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">${data.current.toFixed(2)}<span style="font-size: 11px; font-weight: 400; color: #64748b;"> ${info.unit}</span></div>
                        <div style="font-size: 10px; color: #94a3b8;">Avg: ${data.average.toFixed(2)} ${info.unit}</div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Status indicator
            const latestReading = Object.values(readings)[0];
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: #f1f5f9; border-radius: 4px; margin-bottom: 12px; font-size: 11px;">
                    <span style="color: #64748b;">
                        <span style="display: inline-block; width: 6px; height: 6px; background: #10b981; border-radius: 50%; margin-right: 6px;"></span>
                        Last updated: ${new Date(latestReading.timestamp).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </span>
                    ${latestReading.rssi ? `<span style="color: #94a3b8;">📶 ${latestReading.rssi} dBm</span>` : ''}
                </div>
            `;
            
            // View Dashboard Button
            html += `
                <button onclick="window.viewLocationDashboard('${locationId}')" 
                    style="width: 100%; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 10px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;"
                    onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.4)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    <span style="font-size: 16px;">📊</span>
                    View Complete Dashboard
                </button>
            `;
        } else {
            html += `
                <div style="text-align: center; padding: 20px; color: #64748b;">
                    <div style="font-size: 32px; margin-bottom: 8px;">📊</div>
                    <p style="margin: 0; font-size: 14px;">No sensor data available</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px;">Data will appear once sensors start transmitting</p>
                </div>
            `;
        }
        
        html += `</div>`;
        
        new mapboxgl.Popup({ closeButton: true, closeOnClick: false })
            .setLngLat(lngLat)
            .setHTML(html)
            .addTo(this.map);
            
        console.log(`✅ Popup created from local data`);
    }
    
    /**
     * Check if sensor value is within normal range
     */
    checkSensorValue(type, value) {
        const ranges = {
            'ph': { min: 6.5, max: 8.5 },
            'turbidity': { min: 0, max: 5 },
            'temperature': { min: 22, max: 32 },
            'tds': { min: 150, max: 2000 }
        };
        
        const range = ranges[type];
        if (!range) return true;
        
        return value >= range.min && value <= range.max;
    }

    /**
     * Show dynamic popup with live sensor data
     * Fetches popup config and current sensor readings from database
     * Also displays device data if a device is linked to this KML overlay
     */
    async showDynamicPopup(lngLat, locationId, kmlProperties = {}) {
        try {
            console.log(`📊 Building dynamic popup for: ${locationId}`);

            // Get or create Supabase client
            let supabase = null;
            
            // Try getting from data.js first
            if (window.getSupabaseClient) {
                supabase = window.getSupabaseClient();
                if (supabase) {
                    console.log(`✅ Got Supabase client from data.js`);
                } else {
                    console.warn(`⚠️ getSupabaseClient() returned null`);
                }
            }
            
            // If not available, try using the global supabase from CDN
            if (!supabase && typeof window.supabase !== 'undefined' && window.ENV_CONFIG) {
                console.log(`🔧 Creating Supabase client directly in popup`);
                console.log('   window.supabase type:', typeof window.supabase);
                console.log('   window.supabase.createClient:', typeof window.supabase?.createClient);
                
                try {
                    // The CDN exposes it as window.supabase.createClient
                    if (typeof window.supabase.createClient === 'function') {
                        supabase = window.supabase.createClient(
                            window.ENV_CONFIG.SUPABASE_URL,
                            window.ENV_CONFIG.SUPABASE_ANON_KEY
                        );
                        console.log(`✅ Supabase client created successfully`);
                    } else {
                        console.error('❌ window.supabase.createClient is not a function');
                    }
                } catch (err) {
                    console.error('❌ Error creating Supabase client:', err);
                }
            }

            if (!supabase) {
                console.error('❌ Cannot create Supabase client - using window.allReadings fallback');
                console.error('   window.supabase:', typeof window.supabase);
                console.error('   window.ENV_CONFIG:', window.ENV_CONFIG);
                console.error('   window.allReadings available:', window.allReadings?.length || 0);
                
                // Use window.allReadings as fallback
                if (window.allReadings && window.allReadings.length > 0) {
                    console.log('📊 Using window.allReadings fallback for popup');
                    this.showPopupFromLocalData(locationId, lngLat);
                    return;
                }
                
                // Show basic popup without database data
                new mapboxgl.Popup()
                    .setLngLat(lngLat)
                    .setHTML(`
                        <div style="padding:10px;">
                            <h3>${locationId}</h3>
                            <p>Database connection unavailable</p>
                            <p style="font-size:10px;">Check console for details</p>
                        </div>
                    `)
                    .addTo(this.map);
                return;
            }

            // Check if there's a device linked to this KML region (by matching name/location)
            let deviceData = null;
            if (kmlProperties.kmlOverlayId && window.getDeviceDataForKML) {
                console.log(`🔍 Checking for linked device to KML overlay: ${kmlProperties.kmlOverlayId}`);
                deviceData = await window.getDeviceDataForKML(kmlProperties.kmlOverlayId);
                if (deviceData && deviceData.hasData) {
                    console.log(`✅ Found linked device data:`, deviceData);
                }
            }

            // Fetch popup configuration from database
            const { data: popupConfig, error: configError } = await supabase
                .from('popup_config')
                .select('*')
                .eq('location_id', locationId)
                .single();

            if (configError && configError.code !== 'PGRST116') {
                console.warn('⚠️ No popup config found, using defaults:', configError.message);
            }

            // Try to fetch location details from database, but don't fail if not found
            const { data: location, error: locationError } = await supabase
                .from('locations')
                .select('*')
                .eq('location_id', locationId)
                .single();

            // Create default location if not in database (for ESP32 direct data)
            const locationData = location || {
                location_id: locationId,
                name: locationId.charAt(0).toUpperCase() + locationId.slice(1),
                description: `Water monitoring location`
            };

            console.log('📍 Location data:', locationData);

            // Fetch latest sensor readings
            let sensorsToShow = popupConfig?.show_sensors;

            // Handle if show_sensors is boolean instead of array
            if (typeof sensorsToShow === 'boolean') {
                sensorsToShow = sensorsToShow ? ['ph', 'turbidity', 'temperature', 'tds'] : [];
            } else if (!Array.isArray(sensorsToShow)) {
                sensorsToShow = ['ph', 'turbidity', 'temperature', 'tds'];
            }

            // ⭐ Get user's linked devices for filtering
            let linkedDevices = null;
            if (typeof window.getUserLinkedDevices === 'function') {
                linkedDevices = await window.getUserLinkedDevices();
                console.log('🔒 Popup data filtering by linked devices:', linkedDevices);
            }

            const sensorPromises = sensorsToShow.map(async (sensorType) => {
                const sensorId = `${locationId}_${sensorType}`;
                console.log(`📡 ========== Fetching sensor: ${sensorId} ==========`);

                // Fetch latest reading (recent value) - NO TIME FILTER
                console.log(`   Step 1: Fetching LATEST reading (no time filter)`);
                
                // Build query with device filter
                let latestQuery = supabase
                    .from('sensor_readings')
                    .select('value, timestamp, device_name')
                    .eq('sensor_id', sensorId);
                
                // Apply device filter if available
                if (linkedDevices && linkedDevices.length > 0) {
                    latestQuery = latestQuery.in('device_name', linkedDevices);
                } else if (linkedDevices && linkedDevices.length === 0) {
                    // User has no linked devices
                    console.warn('⚠️ User has no linked devices - no sensor data');
                    return null;
                }
                
                const { data: latestData, error: latestError } = await latestQuery
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .single();

                console.log(`   Latest query result:`, latestData);
                console.log(`   Latest query error:`, latestError);

                if (latestError && latestError.code !== 'PGRST116') {
                    console.warn(`⚠️ Error fetching latest ${sensorId}:`, latestError);
                }

                // If we have a latest reading, show when it was taken
                if (latestData) {
                    const age = Date.now() - new Date(latestData.timestamp).getTime();
                    const ageHours = (age / (1000 * 60 * 60)).toFixed(1);
                    console.log(`   ✅ Latest value: ${latestData.value} (${ageHours} hours ago)`);
                }

                // Fetch average value based on color scale time interval
                const timeInterval = this.colorscaleManager ? this.colorscaleManager.timeInterval : '24h';
                const now = new Date();
                const timeThresholds = {
                    '1h': new Date(now - 1 * 60 * 60 * 1000),
                    '6h': new Date(now - 6 * 60 * 60 * 1000),
                    '24h': new Date(now - 24 * 60 * 60 * 1000),
                    '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
                    '30d': new Date(now - 30 * 24 * 60 * 60 * 1000),
                    '3m': new Date(now - 90 * 24 * 60 * 60 * 1000),
                    '6m': new Date(now - 180 * 24 * 60 * 60 * 1000),
                    '1y': new Date(now - 365 * 24 * 60 * 60 * 1000)
                };
                const timeThreshold = timeThresholds[timeInterval];

                console.log(`   Step 2: Fetching AVERAGE for ${sensorId} over ${timeInterval}`);
                console.log(`   Time threshold: ${timeThreshold.toISOString()}`);
                console.log(`   Current time: ${now.toISOString()}`);

                // Build average query with device filter
                let avgQuery = supabase
                    .from('sensor_readings')
                    .select('value, timestamp')
                    .eq('sensor_id', sensorId)
                    .gte('timestamp', timeThreshold.toISOString());
                
                // Apply device filter if available
                if (linkedDevices && linkedDevices.length > 0) {
                    avgQuery = avgQuery.in('device_name', linkedDevices);
                }
                
                const { data: avgData, error: avgError } = await avgQuery
                    .order('timestamp', { ascending: false });

                console.log(`   Avg query returned ${avgData?.length || 0} readings`);
                console.log(`   Avg query error:`, avgError);
                if (avgData && avgData.length > 0) {
                    console.log(`   Sample timestamps:`, avgData.slice(0, 3).map(r => r.timestamp));
                }

                let avgValue = 'N/A';
                let readingCount = 0;
                if (avgData && avgData.length > 0) {
                    const sum = avgData.reduce((acc, reading) => acc + parseFloat(reading.value), 0);
                    avgValue = (sum / avgData.length).toFixed(2);
                    readingCount = avgData.length;
                    console.log(`   ✅ Average: ${avgValue} (${readingCount} readings)`);
                } else {
                    console.log(`   ⚠️ No data found within ${timeInterval}`);
                    // Try querying without time filter to see if any data exists
                    console.log(`   Step 3: Checking if ANY data exists for ${sensorId}`);
                    
                    // Build fallback query with device filter
                    let fallbackQuery = supabase
                        .from('sensor_readings')
                        .select('value, timestamp')
                        .eq('sensor_id', sensorId);
                    
                    // Apply device filter if available
                    if (linkedDevices && linkedDevices.length > 0) {
                        fallbackQuery = fallbackQuery.in('device_name', linkedDevices);
                    }
                    
                    const { data: allData } = await fallbackQuery
                        .order('timestamp', { ascending: false })
                        .limit(5);
                    console.log(`   All-time data (last 5):`, allData);
                    
                    // Use latest value for average if no data in time range
                    if (latestData) {
                        avgValue = parseFloat(latestData.value).toFixed(2);
                        readingCount = 1;
                        console.log(`   ℹ️ Using latest value as fallback: ${avgValue}`);
                    }
                }

                return {
                    type: sensorType,
                    recentValue: latestData?.value || 'N/A',
                    avgValue: avgValue,
                    timestamp: latestData?.timestamp || null,
                    timeInterval: timeInterval,
                    error: latestError
                };
            });

            const sensorReadings = await Promise.all(sensorPromises);

            // Build popup HTML with device data if available
            const popupHTML = this.buildPopupHTML(
                locationData,
                popupConfig,
                sensorReadings,
                kmlProperties,
                deviceData  // Pass device data to popup builder
            );

            // Create and show popup
            new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                maxWidth: '350px'
            })
                .setLngLat(lngLat)
                .setHTML(popupHTML)
                .addTo(this.map);

        } catch (error) {
            console.error('❌ Error showing dynamic popup:', error);
        }
    }

    /**
     * Build HTML for dynamic popup
     */
    buildPopupHTML(location, popupConfig, sensorReadings, kmlProperties, deviceData = null) {
        const title = popupConfig?.popup_title || location.name;
        const description = popupConfig?.popup_description || '';
        const customFields = popupConfig?.custom_fields || {};
        const showLastUpdated = popupConfig?.show_last_updated !== false;
        const showViewButton = popupConfig?.show_view_button !== false;

        // Device info section (if device is linked)
        let deviceInfoHTML = '';
        if (deviceData && deviceData.hasData) {
            deviceInfoHTML = `
                <div class="popup-device-section" style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 18px; margin-right: 6px;">🔗</span>
                        <span style="font-weight: bold; color: #0369a1; font-size: 14px;">Linked Device</span>
                    </div>
                    <div style="font-size: 12px; color: #0c4a6e; margin-bottom: 8px;">
                        <strong>Device ID:</strong> ${deviceData.deviceId}
                    </div>
            `;
            
            // Display latest device sensor readings
            if (deviceData.sensors && Object.keys(deviceData.sensors).length > 0) {
                deviceInfoHTML += '<div style="font-size: 11px; color: #075985; margin-top: 6px;"><strong>Latest Readings:</strong></div>';
                for (const [sensorId, reading] of Object.entries(deviceData.sensors)) {
                    const timestamp = new Date(reading.timestamp);
                    const timeAgo = this.getTimeAgo(timestamp);
                    deviceInfoHTML += `
                        <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; color: #0c4a6e;">
                            <span>${sensorId}:</span>
                            <span style="font-weight: bold; color: #0ea5e9;">${reading.value} ${reading.unit || ''}</span>
                        </div>
                    `;
                }
                deviceInfoHTML += `<div style="font-size: 10px; color: #64748b; margin-top: 4px;">Updated: ${timeAgo}</div>`;
            } else {
                deviceInfoHTML += '<div style="font-size: 11px; color: #64748b;">No sensor data received yet</div>';
            }
            
            deviceInfoHTML += '</div>';
        } else if (deviceData && !deviceData.hasData) {
            deviceInfoHTML = `
                <div class="popup-device-section" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 18px; margin-right: 6px;">⚠️</span>
                        <span style="font-weight: bold; color: #92400e; font-size: 13px;">Device Linked (No Data)</span>
                    </div>
                    <div style="font-size: 11px; color: #78350f;">
                        Device ${deviceData.deviceId} is linked but hasn't sent data yet.
                    </div>
                </div>
            `;
        }

        // Sensor icons mapping
        const sensorIcons = {
            'ph': '💧',
            'turbidity': '🌊',
            'temperature': '🌡️',
            'tds': '⚡',
            'dissolved_oxygen': '💨',
            'conductivity': '⚙️'
        };

        // Sensor display names
        const sensorNames = {
            'ph': 'pH Level',
            'turbidity': 'Turbidity',
            'temperature': 'Temperature',
            'tds': 'TDS',
            'dissolved_oxygen': 'Dissolved Oxygen',
            'conductivity': 'Conductivity'
        };

        // Sensor units
        const sensorUnits = {
            'ph': '',
            'turbidity': 'NTU',
            'temperature': '°C',
            'tds': 'ppm',
            'dissolved_oxygen': 'mg/L',
            'conductivity': 'µS/cm'
        };

        // Build sensor readings HTML with two columns (recent and average)
        let sensorsHTML = '';

        // Add header row for columns
        if (sensorReadings.length > 0) {
            const timeIntervalLabel = sensorReadings[0].timeInterval || '24h';
            const intervalMap = {
                '1h': 'Last Hour',
                '6h': 'Last 6 Hours',
                '24h': 'Last 24 Hours',
                '7d': 'Last 7 Days',
                '30d': 'Last 30 Days',
                '3m': 'Last 3 Months',
                '6m': 'Last 6 Months',
                '1y': 'Last Year'
            };

            sensorsHTML += `
                <div class="popup-sensor-header">
                    <div class="popup-sensor-header-row">
                        <span style="flex: 1; font-weight: bold; font-size: 11px; color: #64748b;">Parameter</span>
                        <span style="flex: 1; font-weight: bold; font-size: 11px; color: #64748b; text-align: center;">Recent</span>
                        <span style="flex: 1; font-weight: bold; font-size: 11px; color: #64748b; text-align: right;">Avg (${intervalMap[timeIntervalLabel] || timeIntervalLabel})</span>
                    </div>
                </div>
            `;
        }

        sensorReadings.forEach(sensor => {
            const icon = sensorIcons[sensor.type] || '📊';
            const name = sensorNames[sensor.type] || sensor.type.toUpperCase();
            const unit = sensorUnits[sensor.type] || '';
            const recentValue = sensor.recentValue !== 'N/A' ? `${sensor.recentValue} ${unit}`.trim() : 'N/A';
            const avgValue = sensor.avgValue !== 'N/A' ? `${sensor.avgValue} ${unit}`.trim() : 'N/A';

            sensorsHTML += `
                <div class="popup-sensor-row-dual">
                    <span style="flex: 1; font-size: 13px;">${icon} ${name}</span>
                    <span style="flex: 1; text-align: center; font-weight: bold; color: #0ea5e9;">${recentValue}</span>
                    <span style="flex: 1; text-align: right; font-weight: bold; color: #10b981;">${avgValue}</span>
                </div>
            `;
        });

        // Build custom fields HTML
        let customFieldsHTML = '';
        if (Object.keys(customFields).length > 0) {
            customFieldsHTML = '<div class="popup-divider"></div>';
            for (const [key, value] of Object.entries(customFields)) {
                customFieldsHTML += `
                    <div class="popup-info-row">
                        <span>${key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                        <span>${value}</span>
                    </div>
                `;
            }
        }

        // Get most recent timestamp
        const timestamps = sensorReadings
            .map(s => s.timestamp)
            .filter(t => t !== null);

        let lastUpdatedHTML = '';
        if (showLastUpdated && timestamps.length > 0) {
            const mostRecent = new Date(Math.max(...timestamps.map(t => new Date(t))));
            const timeAgo = this.getTimeAgo(mostRecent);
            lastUpdatedHTML = `
                <div class="popup-divider"></div>
                <div class="popup-timestamp">
                    📊 Last Updated: ${timeAgo}
                </div>
            `;
        }

        // Build view button HTML
        let viewButtonHTML = '';
        if (showViewButton) {
            viewButtonHTML = `
                <button 
                    class="popup-view-button"
                    onmousedown="event.preventDefault(); event.stopPropagation(); window.location.href='location.html?location=${location.location_id}';"
                >
                    🔍 View Full Dashboard
                </button>
            `;
        }

        return `
            <div class="dynamic-popup">
                <div class="popup-header">
                    <h3>📍 ${title}</h3>
                    ${description ? `<p class="popup-description">${description}</p>` : ''}
                </div>
                ${deviceInfoHTML}
                <div class="popup-content">
                    ${sensorsHTML}
                    ${customFieldsHTML}
                    ${lastUpdatedHTML}
                </div>
                ${viewButtonHTML}
            </div>
        `;
    }

    /**
     * Get human-readable time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return `${seconds} seconds ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    }

    async reloadKMLLayers() {
        // Reload all KML overlays after map style change (street ↔ satellite)
        console.log('🔄 Reloading KML layers after style change...');

        // Clear the layer tracking array (sources/layers are removed with style change)
        this.kmlLayers = [];

        // Reload all configured overlays
        await this.loadDefaultKMLOverlays();

        console.log('✅ KML layers reloaded successfully');
    }

    // Remove all KML/GeoJSON layers currently tracked
    async clearKMLLayers() {
        try {
            if (!Array.isArray(this.kmlLayers) || this.kmlLayers.length === 0) {
                this.kmlLayers = [];
                return;
            }

            // Iterate a copy since we'll modify the array
            const toRemove = this.kmlLayers.slice();
            for (const layerInfo of toRemove) {
                try {
                    if (layerInfo.layerId && this.map.getLayer && this.map.getLayer(layerInfo.layerId)) {
                        this.map.removeLayer(layerInfo.layerId);
                        console.log('Removed layer:', layerInfo.layerId);
                    }
                } catch (e) { /* ignore per-layer errors */ }

                try {
                    if (layerInfo.sourceId && this.map.getSource && this.map.getSource(layerInfo.sourceId)) {
                        this.map.removeSource(layerInfo.sourceId);
                        console.log('Removed source:', layerInfo.sourceId);
                    }
                } catch (e) { /* ignore per-source errors */ }
            }

            this.kmlLayers = [];
            console.log('✅ Cleared all tracked KML/GeoJSON layers');
        } catch (err) {
            console.warn('clearKMLLayers error', err);
        }
    }

    // Load overlay files given an array of rows (from DB). Each row may contain
    // `storage_path`, `file_name`, `name`, and an optional `source` (e.g. 'supabase'|'url'|'local').
    async loadOverlaysFromRows(rows = []) {
        if (!Array.isArray(rows) || rows.length === 0) return;

        const bucket = (this.overlayConfig && this.overlayConfig.storageBucket) || window.ENV_CONFIG?.KML_BUCKET || 'kml-overlays';
        const supabaseUrl = window.ENV_CONFIG?.SUPABASE_URL || '';

        for (const r of rows) {
            try {
                const storagePath = (r && (r.storage_path || r.file_name || r.file)) || '';
                if (!storagePath) continue;

                let fileUrl = storagePath;

                // Prefer explicit source hint
                if (r.source === 'supabase' || (supabaseUrl && storagePath && storagePath.indexOf('/') >= 0)) {
                    // Construct public url for Supabase storage
                    // Preserve path slashes while encoding unsafe chars
                    const safePath = encodeURIComponent(storagePath).replace(/%2F/g, '/');
                    fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${safePath}`;
                } else if (r.source === 'url') {
                    fileUrl = r.file || storagePath;
                } else if (!/^https?:\/\//i.test(storagePath) && supabaseUrl) {
                    // If it's a plain storage path (no protocol) assume supabase
                    const safePath = encodeURIComponent(storagePath).replace(/%2F/g, '/');
                    fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${safePath}`;
                }

                console.log('Loading overlay from row:', { fileUrl, name: r.name || r.file_name });
                const resp = await fetch(fileUrl);
                if (!resp.ok) {
                    console.warn('Could not fetch overlay:', fileUrl, resp.status);
                    continue;
                }

                const text = await resp.text();
                const filename = (r.file_name || r.name || storagePath || '').toString().toLowerCase();

                if (filename.endsWith('.kml') || fileUrl.toLowerCase().endsWith('.kml')) {
                    await this.loadKML(text, r.name || r.file_name || storagePath);
                } else {
                    try {
                        const geojson = JSON.parse(text);
                        await this.loadGeoJSON(geojson, r.name || r.file_name || storagePath);
                    } catch (e) {
                        console.warn('Unknown overlay format for', fileUrl, e.message || e);
                    }
                }
            } catch (err) {
                console.warn('loadOverlaysFromRows error for row', r, err);
            }
        }
    }

    updateUploadedFilesList() {
        const container = document.getElementById('uploadedFilesList');
        if (!container) return;

        if (this.uploadedFiles.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.uploadedFiles.map((file, index) => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fas fa-file-alt text-water-blue"></i>
                    <span class="truncate" title="${file.name}">${file.name}</span>
                </div>
                <button onclick="mapManager.deleteUploadedFile(${index})" 
                    class="ml-2 text-red-500 hover:text-red-700 transition-colors"
                    title="Delete overlay">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    deleteUploadedFile(index) {
        const file = this.uploadedFiles[index];
        if (!file) return;

        console.log(`🗑️ Deleting overlay: ${file.name}`);

        // Remove all layers associated with this file
        file.layerIds.forEach(layerId => {
            if (this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
                console.log(`  ✅ Removed layer: ${layerId}`);
            }
        });

        // Remove from kmlLayers tracking
        this.kmlLayers = this.kmlLayers.filter(layer =>
            !file.layerIds.includes(layer.layerId)
        );

        // Remove sources
        const sourceIds = new Set();
        this.kmlLayers.forEach(layer => {
            if (layer.fileName === file.name) {
                sourceIds.add(layer.sourceId);
            }
        });

        sourceIds.forEach(sourceId => {
            if (this.map.getSource(sourceId)) {
                this.map.removeSource(sourceId);
                console.log(`  ✅ Removed source: ${sourceId}`);
            }
        });

        // Remove from uploadedFiles array
        this.uploadedFiles.splice(index, 1);
        this.updateUploadedFilesList();

        this.showSuccess(`${file.name} removed`);
    }

    showError(msg) {
        const div = document.createElement('div');
        div.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }

    showSuccess(msg) {
        const div = document.createElement('div');
        div.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
}

// Global function to view location dashboard (called from popup button)
window.viewLocationDashboard = function(locationId) {
    console.log('📊 Opening dashboard for location:', locationId);
    
    // Navigate to location.html with the location ID as a query parameter
    window.location.href = `location.html?location=${locationId}`;
};

// Alias for openLocationDashboard (called from popup)
window.openLocationDashboard = function() {
    console.log('📊 openLocationDashboard called');
    
    // Get location from last clicked marker
    if (window.mapManager && window.mapManager.lastClickedLocation) {
        const locationId = window.mapManager.lastClickedLocation;
        console.log('  Navigating to location dashboard:', locationId);
        window.location.href = `location.html?location=${locationId}`;
        return;
    }
    
    console.warn('❌ No location found');
    alert('Please click on a location marker first.');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.mapManager = new MapManager());
} else {
    window.mapManager = new MapManager();
}
