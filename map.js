// Map management module for Water Dashboard
class MapManager {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.overlays = new Map();
        this.currentPopup = null;
        this.isFullscreen = false;
        this.currentStyle = 'street';
        
        this.init();
    }

    async init() {
        try {
            await this.initializeMap();
            this.setupEventListeners();
            this.hideLoadingOverlay();
        } catch (error) {
            console.error('Failed to initialize map:', error);
            this.showError('Failed to load map. Please refresh the page.');
        }
    }

    async initializeMap() {
        // Initialize MapLibre GL JS map
        this.map = new maplibregl.Map({
            container: 'map',
            style: window.config.map.styles.street,
            center: window.config.map.defaultCenter,
            zoom: window.config.map.defaultZoom,
            attributionControl: true
        });

        // Add navigation controls
        this.map.addControl(new maplibregl.NavigationControl(), 'top-left');

        // Add scale control
        this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

        // Wait for map to load
        await new Promise((resolve) => {
            this.map.on('load', resolve);
        });

        // Set up map event listeners
        this.setupMapEventListeners();
        
        console.log('Map initialized successfully');
    }

    setupEventListeners() {
        // Map style toggle buttons
        document.getElementById('streetViewBtn').addEventListener('click', () => {
            this.switchMapStyle('street');
        });

        document.getElementById('satelliteViewBtn').addEventListener('click', () => {
            this.switchMapStyle('satellite');
        });

        // Layer toggle checkboxes
        document.getElementById('sensorsLayer').addEventListener('change', (e) => {
            this.toggleLayer('sensors', e.target.checked);
        });

        document.getElementById('heatmapLayer').addEventListener('change', (e) => {
            this.toggleLayer('heatmap', e.target.checked);
        });

        document.getElementById('overlaysLayer').addEventListener('change', (e) => {
            this.toggleLayer('overlays', e.target.checked);
        });

        // File upload
        document.getElementById('fileUpload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // URL load
        document.getElementById('loadUrlBtn').addEventListener('click', () => {
            const url = document.getElementById('urlInput').value;
            if (url) {
                this.loadFromUrl(url);
            }
        });

        // Map control buttons
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        document.getElementById('locateBtn').addEventListener('click', () => {
            this.locateUser();
        });

        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Filter controls
        document.getElementById('minValue').addEventListener('input', () => {
            this.applyFilters();
        });

        document.getElementById('maxValue').addEventListener('input', () => {
            this.applyFilters();
        });

        document.getElementById('timeRange').addEventListener('change', () => {
            this.applyFilters();
        });
    }

    setupMapEventListeners() {
        // Update zoom level indicator
        this.map.on('zoom', () => {
            document.getElementById('zoomLevel').textContent = Math.round(this.map.getZoom());
        });

        // Handle map clicks
        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });

        // Handle marker clicks
        this.map.on('click', 'sensor-markers', (e) => {
            this.handleMarkerClick(e);
        });

        // Change cursor on marker hover
        this.map.on('mouseenter', 'sensor-markers', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', 'sensor-markers', () => {
            this.map.getCanvas().style.cursor = '';
        });
    }

    switchMapStyle(style) {
        const streetBtn = document.getElementById('streetViewBtn');
        const satelliteBtn = document.getElementById('satelliteViewBtn');

        if (style === 'street') {
            this.map.setStyle(window.config.map.styles.street);
            streetBtn.className = 'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-white text-water-blue shadow-sm';
            satelliteBtn.className = 'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors text-gray-600 hover:text-gray-900';
        } else {
            this.map.setStyle(window.config.map.styles.satellite);
            satelliteBtn.className = 'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-white text-water-blue shadow-sm';
            streetBtn.className = 'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors text-gray-600 hover:text-gray-900';
        }

        this.currentStyle = style;

        // Re-add layers after style change
        this.map.once('styledata', () => {
            this.readdLayers();
        });
    }

    toggleLayer(layerType, visible) {
        switch (layerType) {
            case 'sensors':
                if (this.map.getLayer('sensor-markers')) {
                    this.map.setLayoutProperty('sensor-markers', 'visibility', visible ? 'visible' : 'none');
                }
                break;
            case 'heatmap':
                if (this.map.getLayer('sensor-heatmap')) {
                    this.map.setLayoutProperty('sensor-heatmap', 'visibility', visible ? 'visible' : 'none');
                }
                break;
            case 'overlays':
                this.overlays.forEach((overlay, id) => {
                    if (this.map.getLayer(id)) {
                        this.map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
                    }
                });
                break;
        }
    }

    async handleFileUpload(files) {
        for (const file of files) {
            try {
                const text = await this.readFile(file);
                const data = this.parseGeospatialData(text, file.name);
                if (data) {
                    this.addOverlay(file.name, data);
                }
            } catch (error) {
                console.error('Error processing file:', file.name, error);
                this.showError(`Failed to process file: ${file.name}`);
            }
        }
    }

    async loadFromUrl(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            const data = this.parseGeospatialData(text, url);
            if (data) {
                this.addOverlay(url, data);
                document.getElementById('urlInput').value = '';
            }
        } catch (error) {
            console.error('Error loading from URL:', error);
            this.showError('Failed to load data from URL');
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseGeospatialData(text, filename) {
        try {
            // Try parsing as GeoJSON first
            const data = JSON.parse(text);
            if (data.type === 'FeatureCollection' || data.type === 'Feature') {
                return data;
            }
        } catch (e) {
            // If JSON parsing fails, check if it's KML
            if (text.includes('<kml') || text.includes('<KML')) {
                // For KML, we'd need a KML parser library
                // For now, show a message that KML support is coming
                this.showError('KML support coming soon. Please use GeoJSON format.');
                return null;
            }
        }
        
        throw new Error('Unsupported file format');
    }

    addOverlay(id, geojsonData) {
        // Remove existing overlay if it exists
        if (this.overlays.has(id)) {
            this.removeOverlay(id);
        }

        // Add source
        this.map.addSource(id, {
            type: 'geojson',
            data: geojsonData
        });

        // Add layer based on geometry type
        const firstFeature = geojsonData.features?.[0];
        if (firstFeature) {
            const geometryType = firstFeature.geometry.type;
            
            if (geometryType === 'Point' || geometryType === 'MultiPoint') {
                this.map.addLayer({
                    id: id,
                    type: 'circle',
                    source: id,
                    paint: {
                        'circle-radius': 6,
                        'circle-color': '#ff6b6b',
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-width': 2
                    }
                });
            } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
                this.map.addLayer({
                    id: id,
                    type: 'line',
                    source: id,
                    paint: {
                        'line-color': '#ff6b6b',
                        'line-width': 3
                    }
                });
            } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
                this.map.addLayer({
                    id: id,
                    type: 'fill',
                    source: id,
                    paint: {
                        'fill-color': '#ff6b6b',
                        'fill-opacity': 0.3,
                        'fill-outline-color': '#ff6b6b'
                    }
                });
            }
        }

        this.overlays.set(id, geojsonData);
        console.log(`Added overlay: ${id}`);
    }

    removeOverlay(id) {
        if (this.map.getLayer(id)) {
            this.map.removeLayer(id);
        }
        if (this.map.getSource(id)) {
            this.map.removeSource(id);
        }
        this.overlays.delete(id);
    }

    addSensorMarkers(sensors) {
        // Create GeoJSON feature collection from sensor data
        const features = sensors.map(sensor => ({
            type: 'Feature',
            properties: {
                id: sensor.id,
                name: sensor.name || `Sensor ${sensor.id}`,
                value: sensor.value,
                timestamp: sensor.timestamp,
                status: sensor.status || 'active'
            },
            geometry: {
                type: 'Point',
                coordinates: [sensor.longitude, sensor.latitude]
            }
        }));

        const geojson = {
            type: 'FeatureCollection',
            features: features
        };

        // Add or update source
        if (this.map.getSource('sensors')) {
            this.map.getSource('sensors').setData(geojson);
        } else {
            this.map.addSource('sensors', {
                type: 'geojson',
                data: geojson
            });

            // Add marker layer
            this.map.addLayer({
                id: 'sensor-markers',
                type: 'circle',
                source: 'sensors',
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        5, 4,
                        10, 8,
                        15, 12
                    ],
                    'circle-color': [
                        'case',
                        ['==', ['get', 'status'], 'offline'], '#ef4444',
                        ['==', ['get', 'status'], 'warning'], '#f59e0b',
                        '#10b981'
                    ],
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-width': 2,
                    'circle-opacity': 0.8
                }
            });

            // Add heatmap layer
            this.map.addLayer({
                id: 'sensor-heatmap',
                type: 'heatmap',
                source: 'sensors',
                layout: {
                    'visibility': 'none'
                },
                paint: {
                    'heatmap-weight': [
                        'interpolate',
                        ['linear'],
                        ['get', 'value'],
                        0, 0,
                        100, 1
                    ],
                    'heatmap-intensity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, 1,
                        9, 3
                    ],
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
                    'heatmap-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0, 2,
                        9, 20
                    ]
                }
            });
        }

        console.log(`Updated ${sensors.length} sensor markers`);
    }

    handleMarkerClick(e) {
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice();
        const properties = feature.properties;

        // Ensure popup appears over the feature
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        this.showMarkerPopup(coordinates, properties);
    }

    showMarkerPopup(coordinates, properties) {
        // Close existing popup
        if (this.currentPopup) {
            this.currentPopup.remove();
        }

        // Create popup content
        const popupContent = `
            <div class="p-3 min-w-64">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-gray-900">${properties.name}</h3>
                    <span class="px-2 py-1 text-xs rounded-full ${this.getStatusColor(properties.status)}">
                        ${properties.status}
                    </span>
                </div>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Current Value:</span>
                        <span class="font-medium text-lg">${properties.value}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Last Update:</span>
                        <span class="text-gray-900">${this.formatTimestamp(properties.timestamp)}</span>
                    </div>
                </div>
                <button 
                    class="w-full mt-3 px-3 py-2 bg-water-blue text-white rounded-lg hover:bg-water-cyan transition-colors text-sm"
                    onclick="window.mapManager.openLocationDashboard('${properties.id}')"
                >
                    <i class="fas fa-chart-line mr-2"></i>View Details
                </button>
            </div>
        `;

        // Create and show popup
        this.currentPopup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true
        })
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(this.map);
    }

    openLocationDashboard(sensorId) {
        window.location.href = `location.html?id=${sensorId}`;
    }

    getStatusColor(status) {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800';
            case 'offline':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    toggleFullscreen() {
        const mapContainer = document.getElementById('map').parentElement;
        
        if (!this.isFullscreen) {
            if (mapContainer.requestFullscreen) {
                mapContainer.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    async locateUser() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            const { latitude, longitude } = position.coords;
            
            this.map.flyTo({
                center: [longitude, latitude],
                zoom: 12,
                duration: 2000
            });

            // Add user location marker
            if (this.map.getSource('user-location')) {
                this.map.getSource('user-location').setData({
                    type: 'Point',
                    coordinates: [longitude, latitude]
                });
            } else {
                this.map.addSource('user-location', {
                    type: 'geojson',
                    data: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    }
                });

                this.map.addLayer({
                    id: 'user-location',
                    type: 'circle',
                    source: 'user-location',
                    paint: {
                        'circle-radius': 8,
                        'circle-color': '#4285f4',
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-width': 2
                    }
                });
            }

        } catch (error) {
            console.error('Geolocation error:', error);
            this.showError('Unable to get your location');
        }
    }

    refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');
        const icon = refreshBtn.querySelector('i');
        
        // Add spinning animation
        icon.classList.add('animate-spin');
        
        // Trigger data refresh
        if (window.dataManager) {
            window.dataManager.refreshData();
        }
        
        // Remove animation after 2 seconds
        setTimeout(() => {
            icon.classList.remove('animate-spin');
        }, 2000);
    }

    applyFilters() {
        const minValue = parseFloat(document.getElementById('minValue').value) || 0;
        const maxValue = parseFloat(document.getElementById('maxValue').value) || 100;
        const timeRange = document.getElementById('timeRange').value;

        // Apply filters to sensor markers
        if (this.map.getLayer('sensor-markers')) {
            this.map.setFilter('sensor-markers', [
                'all',
                ['>=', ['get', 'value'], minValue],
                ['<=', ['get', 'value'], maxValue]
            ]);
        }

        console.log(`Applied filters: value ${minValue}-${maxValue}, time ${timeRange}`);
    }

    readdLayers() {
        // Re-add all custom layers after style change
        if (window.dataManager && window.dataManager.sensors) {
            this.addSensorMarkers(window.dataManager.sensors);
        }

        // Re-add overlays
        this.overlays.forEach((data, id) => {
            this.addOverlay(id, data);
        });
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('mapLoading');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showError(message) {
        console.error(message);
        // You could add a toast notification here
    }

    handleMapClick(e) {
        // Handle general map clicks (not on markers)
        if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
        }
    }
}

// Initialize map manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mapManager = new MapManager();
});
