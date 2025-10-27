// Map Manager for Water Quality Monitoring Dashboard
class MapManager {
    constructor() {
        this.map = null;
        this.currentStyle = 'street';
        this.markers = [];
        this.kmlLayers = [];
        this.heatmapLayer = null;
        this.overlayConfig = window.OVERLAY_CONFIG || { autoLoad: false, overlays: [] };
        this.layersVisible = {
            sensors: true,
            heatmap: false,
            overlays: true
        };
        
        this.villages = {
            coimbatore: [
                { name: 'Ukkadam', coords: [76.9558, 10.9987], id: 'ukkadam' },
                { name: 'Singanallur', coords: [77.0011, 10.9835], id: 'singanallur' }
            ],
            chennai: [
                { name: 'Red Hills', coords: [80.1167, 13.1594], id: 'redhills' },
                { name: 'Porur', coords: [80.1564, 13.0358], id: 'porur' }
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
            this.restoreMapState();
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
                
                const response = await fetch(fileUrl);
                if (response.ok) {
                    const text = await response.text();
                    
                    // Determine file type and load
                    if (overlay.file.endsWith('.kml')) {
                        await this.loadKML(text, overlay.name);
                        console.log(`✅ Loaded KML: ${overlay.name} (${overlay.source})`);
                    } else if (overlay.file.endsWith('.geojson') || overlay.file.endsWith('.json')) {
                        const geojson = JSON.parse(text);
                        await this.loadGeoJSON(geojson, overlay.name);
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
        this.map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: ' OpenStreetMap contributors'
                    }
                },
                layers: [{
                    id: 'osm-tiles',
                    type: 'raster',
                    source: 'osm',
                    minzoom: 0,
                    maxzoom: 19
                }]
            },
            center: [78.9629, 20.5937],
            zoom: 5
        });

        this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
        this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

        await new Promise((resolve) => this.map.on('load', resolve));
        console.log('Map initialized successfully');
    }

    setupEventListeners() {
        // Fix button IDs to match HTML
        const satelliteBtn = document.getElementById('satelliteViewBtn');
        const streetBtn = document.getElementById('streetViewBtn');
        
        if (satelliteBtn) satelliteBtn.addEventListener('click', () => this.switchToSatellite());
        if (streetBtn) streetBtn.addEventListener('click', () => this.switchToStreet());
        
        // Layer toggles
        const sensorsLayerToggle = document.getElementById('sensorsLayer');
        const heatmapLayerToggle = document.getElementById('heatmapLayer');
        const overlaysLayerToggle = document.getElementById('overlaysLayer');
        
        if (sensorsLayerToggle) {
            sensorsLayerToggle.addEventListener('change', (e) => {
                this.toggleSensorsLayer(e.target.checked);
            });
        }
        
        if (heatmapLayerToggle) {
            heatmapLayerToggle.addEventListener('change', (e) => {
                this.toggleHeatmapLayer(e.target.checked);
            });
        }
        
        if (overlaysLayerToggle) {
            overlaysLayerToggle.addEventListener('change', (e) => {
                this.toggleOverlaysLayer(e.target.checked);
            });
        }
        
        // File upload
        const fileUpload = document.getElementById('fileUpload');
        if (fileUpload) {
            fileUpload.addEventListener('change', async (e) => {
                const files = e.target.files;
                for (let file of files) {
                    try {
                        const text = await file.text();
                        if (file.name.endsWith('.kml')) {
                            await this.loadKML(text, file.name);
                        } else if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
                            await this.loadGeoJSON(JSON.parse(text), file.name);
                        }
                        this.showSuccess(`${file.name} loaded successfully`);
                    } catch (error) {
                        this.showError(`Failed to load ${file.name}`);
                    }
                }
                fileUpload.value = '';
            });
        }
    }
    
    toggleSensorsLayer(visible) {
        console.log('🔘 Toggling sensors layer:', visible);
        this.layersVisible.sensors = visible;
        this.markers.forEach(marker => {
            if (visible) {
                marker.getElement().style.display = 'block';
            } else {
                marker.getElement().style.display = 'none';
            }
        });
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
        console.log('📐 Toggling overlays layer:', visible);
        this.layersVisible.overlays = visible;
        this.kmlLayers.forEach(layerId => {
            if (this.map.getLayer(layerId)) {
                this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
            }
        });
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
        
        this.map.setStyle({
            version: 8,
            sources: {
                satellite: {
                    type: 'raster',
                    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                    tileSize: 256
                }
            },
            layers: [{ id: 'satellite-tiles', type: 'raster', source: 'satellite' }]
        });
        
        this.currentStyle = 'satellite';
        this.map.once('styledata', () => {
            this.addVillageMarkers();
            this.reloadKMLLayers();
        });
        
        // Update button styles
        document.getElementById('satelliteViewBtn')?.classList.add('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('satelliteViewBtn')?.classList.remove('text-gray-600', 'hover:text-gray-900');
        document.getElementById('streetViewBtn')?.classList.remove('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('streetViewBtn')?.classList.add('text-gray-600', 'hover:text-gray-900');
    }

    switchToStreet() {
        if (this.currentStyle === 'street') return;
        
        this.map.setStyle({
            version: 8,
            sources: {
                osm: {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256
                }
            },
            layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }]
        });
        
        this.currentStyle = 'street';
        this.map.once('styledata', () => {
            this.addVillageMarkers();
            this.reloadKMLLayers();
        });
        
        // Update button styles
        document.getElementById('streetViewBtn')?.classList.add('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('streetViewBtn')?.classList.remove('text-gray-600', 'hover:text-gray-900');
        document.getElementById('satelliteViewBtn')?.classList.remove('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('satelliteViewBtn')?.classList.add('text-gray-600', 'hover:text-gray-900');
    }

    addVillageMarkers() {
        this.markers.forEach(m => m.remove());
        this.markers = [];
        
        // Use sensorData.locations if available (dynamic from database)
        const locations = window.sensorData?.locations || [];
        
        if (locations.length > 0) {
            console.log('📍 Adding markers from database locations:', locations);
            locations.forEach(location => {
                this.addMarkerForLocation(location);
            });
        } else {
            // Fallback to hardcoded villages if no data loaded yet
            console.log('📍 Using fallback hardcoded villages');
            Object.entries(this.villages).forEach(([city, villages]) => {
                villages.forEach(v => {
                    this.addMarkerForLocation({
                        id: v.id,
                        name: v.name,
                        coordinates: v.coords
                    });
                });
            });
        }
    }
    
    addMarkerForLocation(location) {
        const coords = location.coordinates || location.coords;
        if (!coords || coords.length < 2) {
            console.warn('⚠️ Skipping location without valid coordinates:', location);
            return;
        }
        
        const el = document.createElement('div');
        el.className = 'village-marker';
        el.innerHTML = '<div style="background:blue;width:20px;height:20px;border-radius:50%;border:2px solid white;"></div>';
        el.style.cursor = 'pointer';
        
        const marker = new maplibregl.Marker({ element: el })
            .setLngLat(coords)
            .addTo(this.map);
        
        el.addEventListener('click', () => {
            this.saveMapState();
            window.location.href = `location.html?location=${location.id}`;
        });
        
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div style="padding:8px;">
                <h3 style="font-weight:bold;margin-bottom:4px;">${location.name}</h3>
                <p style="color:#666;font-size:12px;">Water quality monitoring</p>
                <button onclick="window.mapManager.saveMapState(); window.location.href='location.html?location=${location.id}'" 
                        style="margin-top:8px;padding:4px 12px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;">
                    View Dashboard
                </button>
            </div>
        `);
        
        marker.setPopup(popup);
        this.markers.push(marker);
    }

    async loadKML(kmlText, fileName) {
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlText, 'text/xml');
        const geojson = toGeoJSON.kml(kml);
        await this.loadGeoJSON(geojson, fileName);
    }

    async loadGeoJSON(geojson, fileName) {
        const layerId = `layer-${Date.now()}`;
        const sourceId = `source-${Date.now()}`;
        
        if (!this.map.isStyleLoaded()) {
            await new Promise(resolve => this.map.once('styledata', resolve));
        }
        
        // Separate features by geometry type
        const points = geojson.features.filter(f => f.geometry.type === 'Point');
        const lines = geojson.features.filter(f => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
        const polygons = geojson.features.filter(f => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon');
        
        // Add Point features (villages/markers)
        if (points.length > 0) {
            const pointSourceId = `${sourceId}-points`;
            const pointLayerId = `${layerId}-points`;
            this.map.addSource(pointSourceId, { 
                type: 'geojson', 
                data: { ...geojson, features: points } 
            });
            this.map.addLayer({
                id: pointLayerId,
                type: 'circle',
                source: pointSourceId,
                paint: { 
                    'circle-radius': 8, 
                    'circle-color': '#ef4444',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
            this.kmlLayers.push({ layerId: pointLayerId, sourceId: pointSourceId, fileName });
        }
        
        // Add LineString features (roads/boundaries)
        if (lines.length > 0) {
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
        }
        
        // Add Polygon features (areas/boundaries)
        if (polygons.length > 0) {
            const polySourceId = `${sourceId}-polygons`;
            const polyLayerId = `${layerId}-polygons`;
            this.map.addSource(polySourceId, { 
                type: 'geojson', 
                data: { ...geojson, features: polygons } 
            });
            this.map.addLayer({
                id: polyLayerId,
                type: 'fill',
                source: polySourceId,
                paint: { 
                    'fill-color': '#22c55e', 
                    'fill-opacity': 0.2 
                }
            });
            // Add polygon outline
            this.map.addLayer({
                id: `${polyLayerId}-outline`,
                type: 'line',
                source: polySourceId,
                paint: { 
                    'line-color': '#22c55e', 
                    'line-width': 2 
                }
            });
            this.kmlLayers.push({ layerId: polyLayerId, sourceId: polySourceId, fileName });
        }
    }

    reloadKMLLayers() {
        // Layers will be reloaded after style change
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.mapManager = new MapManager());
} else {
    window.mapManager = new MapManager();
}
