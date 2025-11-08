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
            
            // Initialize colorscale manager after map is ready
            if (window.ColorscaleManager) {
                this.colorscaleManager = new window.ColorscaleManager(this);
                console.log('✅ Colorscale manager initialized');
            }
            
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
                
                console.log(`🔍 Attempting to load from: ${fileUrl}`);
                const response = await fetch(fileUrl);
                console.log(`📡 Response status: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const text = await response.text();
                    console.log(`📄 File size: ${text.length} bytes`);
                    
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
                        this.showSuccess(`${file.name} loaded`);
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
        
        console.log('🛰️ Switching to satellite view...');
        
        // Store current map state
        const currentCenter = this.map.getCenter();
        const currentZoom = this.map.getZoom();
        
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
        
        // Use setTimeout to ensure style change completes first
        setTimeout(async () => {
            console.log('🎨 Reloading layers for satellite view...');
            
            // Restore map position
            this.map.jumpTo({ center: currentCenter, zoom: currentZoom });
            
            // Reload markers and KML
            this.addVillageMarkers();
            await this.reloadKMLLayers();
            
            console.log('✅ Satellite view complete');
        }, 500); // Small delay to let style fully initialize
        
        // Update button styles
        document.getElementById('satelliteViewBtn')?.classList.add('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('satelliteViewBtn')?.classList.remove('text-gray-600', 'hover:text-gray-900');
        document.getElementById('streetViewBtn')?.classList.remove('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('streetViewBtn')?.classList.add('text-gray-600', 'hover:text-gray-900');
    }

    switchToStreet() {
        if (this.currentStyle === 'street') return;
        
        console.log('🗺️ Switching to street view...');
        
        // Store current map state
        const currentCenter = this.map.getCenter();
        const currentZoom = this.map.getZoom();
        
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
        
        // Use setTimeout to ensure style change completes first
        setTimeout(async () => {
            console.log('🎨 Reloading layers for street view...');
            
            // Restore map position
            this.map.jumpTo({ center: currentCenter, zoom: currentZoom });
            
            // Reload markers and KML
            this.addVillageMarkers();
            await this.reloadKMLLayers();
            
            console.log('✅ Street view complete');
        }, 500); // Small delay to let style fully initialize
        
        // Update button styles
        document.getElementById('streetViewBtn')?.classList.add('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('streetViewBtn')?.classList.remove('text-gray-600', 'hover:text-gray-900');
        document.getElementById('satelliteViewBtn')?.classList.remove('bg-white', 'text-water-blue', 'shadow-sm');
        document.getElementById('satelliteViewBtn')?.classList.add('text-gray-600', 'hover:text-gray-900');
    }

    addVillageMarkers() {
        this.markers.forEach(m => m.remove());
        this.markers = [];
        
        // Only use sensorData.locations from database
        const locations = window.sensorData?.locations || [];
        
        if (locations.length > 0) {
            console.log('📍 Adding markers from database locations:', locations);
            locations.forEach(location => {
                this.addMarkerForLocation(location);
            });
        } else {
            console.log('⚠️ No locations loaded from database yet');
            // Don't show fallback markers - wait for database to load
        }
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
        
        console.log(`🎯 Creating marker for location: ${locationId}`);
        
        const marker = new maplibregl.Marker({ element: el })
            .setLngLat(coords)
            .addTo(this.map);
        
        el.addEventListener('click', () => {
            this.saveMapState();
            window.location.href = `location.html?location=${locationId}`;
        });
        
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
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

    async loadKML(kmlText, fileName) {
        console.log(`🔄 Converting KML to GeoJSON: ${fileName}`);
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmlText, 'text/xml');
        
        // Check for parsing errors
        const parserError = kml.querySelector('parsererror');
        if (parserError) {
            console.error('❌ KML parsing error:', parserError.textContent);
            return;
        }
        
        const geojson = toGeoJSON.kml(kml);
        console.log(`📊 GeoJSON features found: ${geojson.features?.length || 0}`);
        console.log('📍 GeoJSON data:', JSON.stringify(geojson, null, 2));
        
        if (geojson.features && geojson.features.length > 0) {
            await this.loadGeoJSON(geojson, fileName);
        } else {
            console.error('❌ No features found in KML file');
        }
    }

    async loadGeoJSON(geojson, fileName) {
        console.log(`📥 Loading GeoJSON: ${fileName}`);
        const layerId = `layer-${Date.now()}`;
        const sourceId = `source-${Date.now()}`;
        
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
                
                // Define village colors (matching Andhra Pradesh district map style)
                const villageColors = [
                    '#22c55e', // Green (Nallampatti)
                    '#f97316', // Orange (Poolampatti)
                    '#3b82f6', // Blue (Thumbalpatti)
                    '#a855f7', // Purple (Karipatti)
                    '#eab308', // Yellow (Mallamooppampatti)
                    '#ef4444', // Red
                    '#06b6d4', // Cyan
                    '#ec4899', // Pink
                    '#84cc16', // Lime
                    '#f59e0b'  // Amber
                ];
                
                // Assign colors to each polygon feature
                polygons.forEach((feature, index) => {
                    feature.properties.fillColor = villageColors[index % villageColors.length];
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
                        
                        // Show dynamic popup with current sensor data
                        await this.showDynamicPopup(e.lngLat, locationId, feature.properties);
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
            
            console.log(`✅ Polygon layers successfully added for: ${fileName}`);
            
            } catch (error) {
                console.error(`❌ Error adding polygon layers:`, error);
                console.error(`   Error details:`, error.message);
            }
        }
    }

    /**
     * Show dynamic popup with live sensor data
     * Fetches popup config and current sensor readings from database
     */
    async showDynamicPopup(lngLat, locationId, kmlProperties = {}) {
        try {
            console.log(`📊 Building dynamic popup for: ${locationId}`);

            // Get Supabase client
            console.log(`🔍 Checking for getSupabaseClient...`, typeof window.getSupabaseClient);
            const supabase = window.getSupabaseClient ? window.getSupabaseClient() : null;
            console.log(`🔍 Supabase client:`, supabase);
            
            if (!supabase) {
                console.error('❌ Supabase client not available');
                console.error('   window.getSupabaseClient exists?', !!window.getSupabaseClient);
                // Show basic popup without database data
                new maplibregl.Popup()
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
            
            console.log(`✅ Supabase client retrieved successfully`);

            // Fetch popup configuration from database
            const { data: popupConfig, error: configError } = await supabase
                .from('popup_config')
                .select('*')
                .eq('location_id', locationId)
                .single();

            if (configError) {
                console.warn('⚠️ No popup config found, using defaults:', configError.message);
            }

            // Fetch location details
            const { data: location, error: locationError } = await supabase
                .from('locations')
                .select('*')
                .eq('location_id', locationId)
                .single();

            if (locationError) {
                console.error('❌ Location not found:', locationError);
                return;
            }

            // Fetch latest sensor readings
            let sensorsToShow = popupConfig?.show_sensors;
            
            // Handle if show_sensors is boolean instead of array
            if (typeof sensorsToShow === 'boolean') {
                sensorsToShow = sensorsToShow ? ['ph', 'turbidity', 'temperature', 'tds'] : [];
            } else if (!Array.isArray(sensorsToShow)) {
                sensorsToShow = ['ph', 'turbidity', 'temperature', 'tds'];
            }
            
            const sensorPromises = sensorsToShow.map(async (sensorType) => {
                const sensorId = `${locationId}_${sensorType}`;
                console.log(`📡 Fetching sensor: ${sensorId}`);
                const { data, error } = await supabase
                    .from('sensor_readings')
                    .select('value, timestamp')
                    .eq('sensor_id', sensorId)
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.warn(`⚠️ Error fetching ${sensorId}:`, error);
                }

                return {
                    type: sensorType,
                    value: data?.value || 'N/A',
                    timestamp: data?.timestamp || null,
                    error: error
                };
            });

            const sensorReadings = await Promise.all(sensorPromises);

            // Build popup HTML
            const popupHTML = this.buildPopupHTML(
                location,
                popupConfig,
                sensorReadings,
                kmlProperties
            );

            // Create and show popup
            new maplibregl.Popup({ 
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
    buildPopupHTML(location, popupConfig, sensorReadings, kmlProperties) {
        const title = popupConfig?.popup_title || location.name;
        const description = popupConfig?.popup_description || '';
        const customFields = popupConfig?.custom_fields || {};
        const showLastUpdated = popupConfig?.show_last_updated !== false;
        const showViewButton = popupConfig?.show_view_button !== false;

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

        // Build sensor readings HTML
        let sensorsHTML = '';
        sensorReadings.forEach(sensor => {
            const icon = sensorIcons[sensor.type] || '📊';
            const name = sensorNames[sensor.type] || sensor.type.toUpperCase();
            const unit = sensorUnits[sensor.type] || '';
            const value = sensor.value !== 'N/A' ? `${sensor.value} ${unit}`.trim() : 'No data';
            
            sensorsHTML += `
                <div class="popup-sensor-row">
                    <span>${icon} ${name}:</span>
                    <strong>${value}</strong>
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
