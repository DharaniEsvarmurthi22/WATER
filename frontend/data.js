// data.js - Handles sensor data and statistics

// Supabase client
let supabase = null;

// Sample sensor data structure
const sensorData = {
    sensors: new Map(),
    locations: [],
    lastUpdate: null,
    statistics: {
        activeSensors: 0,
        avgReading: 0
    }
};

// Initialize Supabase
function initializeSupabase() {
    if (window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
        supabase = window.supabase.createClient(
            window.ENV.SUPABASE_URL,
            window.ENV.SUPABASE_ANON_KEY
        );
        console.log('✅ Supabase initialized');
        return true;
    }
    console.error('❌ Supabase credentials not found');
    return false;
}

// Actual monitoring locations - Chennai and Coimbatore villages
const sampleLocations = [
    {
        id: 'ukkadam',
        name: "Ukkadam",
        description: "Coimbatore water quality monitoring station",
        coordinates: [76.9558, 10.9987],
        status: "active",
        lastReading: 85.2,
        sensors: ["ESP32_UK_001", "ESP32_UK_002"]
    },
    {
        id: 'singanallur',
        name: "Singanallur",
        description: "Coimbatore water quality monitoring station",
        coordinates: [77.0011, 10.9835],
        status: "active",
        lastReading: 88.5,
        sensors: ["ESP32_SG_001", "ESP32_SG_002"]
    },
    {
        id: 'redhills',
        name: "Red Hills",
        description: "Chennai water reservoir monitoring station",
        coordinates: [80.1167, 13.1594],
        status: "active",
        lastReading: 82.3,
        sensors: ["ESP32_RH_001", "ESP32_RH_002"]
    },
    {
        id: 'porur',
        name: "Porur",
        description: "Chennai water quality monitoring station",
        coordinates: [80.1564, 13.0358],
        status: "active",
        lastReading: 79.6,
        sensors: ["ESP32_PR_001", "ESP32_PR_002"]
    }
];

// Fetch real sensor data from Supabase
async function fetchSensorData() {
    if (!supabase) {
        console.error('Supabase not initialized');
        return;
    }

    try {
        // Fetch latest readings for each sensor
        const { data: readings, error } = await supabase
            .from('sensor_readings')
            .select(`
                sensor_id,
                value,
                rssi,
                timestamp
            `)
            .order('timestamp', { ascending: false })
            .limit(100);

        if (error) throw error;

        console.log('📊 Fetched sensor readings:', readings);

        // Process and update location data
        if (readings && readings.length > 0) {
            allReadings = readings; // Store all readings for filtering
            updateLocationsWithData(readings);
            filterReadings(); // Apply current filters
            sensorData.lastUpdate = new Date();
            updateStatistics();
        }

    } catch (error) {
        console.error('Error fetching sensor data:', error);
    }
}

// Update locations with real sensor data
function updateLocationsWithData(readings) {
    // Group readings by location
    const locationReadings = {};
    
    readings.forEach(reading => {
        // Extract location from sensor_id (e.g., "ukkadam_ph" -> "ukkadam")
        const parts = reading.sensor_id.split('_');
        const locationId = parts[0];
        
        if (!locationReadings[locationId]) {
            locationReadings[locationId] = [];
        }
        locationReadings[locationId].push(reading);
    });

    // Update each location with its readings
    sampleLocations.forEach(location => {
        const readings = locationReadings[location.id] || [];
        if (readings.length > 0) {
            // Calculate average reading value for the location
            const avgValue = readings.reduce((sum, r) => sum + parseFloat(r.value), 0) / readings.length;
            location.lastReading = avgValue;
            location.status = "active";
            location.sensors = [...new Set(readings.map(r => r.sensor_id))];
            location.latestTimestamp = readings[0].timestamp;
        } else {
            location.status = "inactive";
        }
    });

    sensorData.locations = sampleLocations;
    sensorData.statistics.activeSensors = Object.keys(locationReadings).length * 4; // 4 sensors per location
    sensorData.statistics.avgReading = readings.length > 0 
        ? readings.reduce((sum, r) => sum + parseFloat(r.value), 0) / readings.length 
        : 0;

    updateLocationsList();
}

// Subscribe to real-time updates
function subscribeToRealtimeUpdates() {
    if (!supabase) return;

    const channel = supabase
        .channel('sensor_readings_changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'sensor_readings'
            },
            (payload) => {
                console.log('🔔 New sensor reading:', payload.new);
                // Refresh data when new reading arrives
                fetchSensorData();
                
                // Also add the new reading to recent readings immediately
                const container = document.getElementById('recentReadings');
                if (container && container.firstChild) {
                    // Add new reading to the top and remove last one if more than 10
                    const readings = [payload.new];
                    updateRecentReadings(readings);
                }
            }
        )
        .subscribe();

    console.log('✅ Subscribed to real-time updates');
}

// Initialize locations
function initializeLocations() {
    sensorData.locations = sampleLocations;
    updateLocationsList();
    
    // Fetch real data from Supabase
    if (supabase) {
        fetchSensorData();
        subscribeToRealtimeUpdates();
        
        // Auto-refresh every 30 seconds
        setInterval(fetchSensorData, 30000);
    }
}

// Update locations list in the UI
function updateLocationsList() {
    const locationsList = document.getElementById('locationsList');
    if (!locationsList) return;

    locationsList.innerHTML = sensorData.locations.map(location => `
        <div class="location-item" data-id="${location.id}">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-medium text-gray-900">${location.name}</h3>
                <div class="status-dot status-${location.status} animate"></div>
            </div>
            <p class="text-sm text-gray-600 mb-2">${location.description}</p>
            <div class="flex justify-between items-center text-sm">
                <span class="text-gray-500">${location.sensors.length} sensors</span>
                <span class="font-medium ${location.lastReading >= 80 ? 'text-green-600' : location.lastReading >= 60 ? 'text-yellow-600' : 'text-red-600'}">
                    ${location.lastReading.toFixed(1)}%
                </span>
            </div>
        </div>
    `).join('');

    // Add click event listeners to location items
    const locationItems = document.querySelectorAll('.location-item');
    locationItems.forEach(item => {
        item.addEventListener('click', () => {
            const locationId = parseInt(item.dataset.id);
            const location = sensorData.locations.find(loc => loc.id === locationId);
            if (location) {
                // Remove active class from all items
                locationItems.forEach(i => i.classList.remove('active'));
                // Add active class to clicked item
                item.classList.add('active');
                // Center map on location
                centerMapOnLocation(location.coordinates);
                // Show location details
                showLocationDetails(location);
            }
        });
    });
}

// Filter locations based on search
function filterLocations(searchText) {
    const filteredLocations = sensorData.locations.filter(location => 
        location.name.toLowerCase().includes(searchText.toLowerCase()) ||
        location.description.toLowerCase().includes(searchText.toLowerCase())
    );
    sensorData.locations = filteredLocations;
    updateLocationsList();
}

// Update statistics in the UI
function updateStatistics(locationFilter = 'all') {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;
    
    if (locationFilter === 'all') {
        // Show overall statistics
        statsContainer.innerHTML = `
            <div class="bg-gradient-to-r from-water-blue to-water-cyan rounded-lg p-3 text-white">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs opacity-90">Active Sensors</p>
                        <p class="text-lg font-bold">${sensorData.statistics.activeSensors}</p>
                    </div>
                    <i class="fas fa-broadcast-tower text-xl opacity-80"></i>
                </div>
            </div>
            <div class="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-3 text-white">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs opacity-90">Avg Reading</p>
                        <p class="text-lg font-bold">${sensorData.statistics.avgReading.toFixed(2)}</p>
                    </div>
                    <i class="fas fa-chart-bar text-xl opacity-80"></i>
                </div>
            </div>
            <div class="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-3 text-white">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs opacity-90">Last Update</p>
                        <p class="text-xs font-medium">${sensorData.lastUpdate ? new Date(sensorData.lastUpdate).toLocaleString() : '--'}</p>
                    </div>
                    <i class="fas fa-clock text-xl opacity-80"></i>
                </div>
            </div>
        `;
    } else {
        // Show location-specific statistics with sensor breakdown
        const locationReadings = allReadings.filter(r => r.sensor_id.startsWith(locationFilter));
        
        // Group by sensor type
        const sensorTypes = ['ph', 'turbidity', 'temperature', 'tds'];
        const sensorStats = {};
        
        sensorTypes.forEach(type => {
            const typeReadings = locationReadings.filter(r => r.sensor_id.endsWith(type));
            if (typeReadings.length > 0) {
                const avgValue = typeReadings.reduce((sum, r) => sum + parseFloat(r.value), 0) / typeReadings.length;
                const lastReading = typeReadings[0];
                sensorStats[type] = {
                    avg: avgValue,
                    last: parseFloat(lastReading.value),
                    timestamp: lastReading.timestamp,
                    unit: getUnitForSensor(type)
                };
            }
        });
        
        const locationNames = {
            'ukkadam': 'Ukkadam',
            'singanallur': 'Singanallur',
            'redhills': 'Red Hills',
            'porur': 'Porur'
        };
        
        statsContainer.innerHTML = `
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-3 text-white mb-3">
                <div class="text-center">
                    <p class="text-xs opacity-90">Location</p>
                    <p class="text-lg font-bold">${locationNames[locationFilter] || locationFilter}</p>
                    <p class="text-xs opacity-75">${Object.keys(sensorStats).length} Active Sensors</p>
                </div>
            </div>
            ${Object.entries(sensorStats).map(([type, stats]) => {
                const sensorInfo = getSensorDisplayInfo(type);
                return `
                    <div class="bg-gradient-to-r ${sensorInfo.gradient} rounded-lg p-3 text-white">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <i class="fas ${sensorInfo.icon}"></i>
                                <p class="text-xs font-medium">${sensorInfo.name}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <p class="opacity-75">Current</p>
                                <p class="font-bold">${stats.last.toFixed(1)} ${stats.unit}</p>
                            </div>
                            <div>
                                <p class="opacity-75">Avg 24h</p>
                                <p class="font-bold">${stats.avg.toFixed(1)} ${stats.unit}</p>
                            </div>
                        </div>
                        <div class="mt-1 text-xs opacity-75">
                            Updated: ${new Date(stats.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    }
}

function getUnitForSensor(type) {
    const units = {
        'ph': 'pH',
        'turbidity': 'NTU',
        'temperature': '°C',
        'tds': 'ppm'
    };
    return units[type] || '';
}

function getSensorDisplayInfo(type) {
    const info = {
        'ph': { name: 'pH Level', icon: 'fa-flask', gradient: 'from-blue-500 to-cyan-500' },
        'turbidity': { name: 'Turbidity', icon: 'fa-eye', gradient: 'from-amber-500 to-yellow-500' },
        'temperature': { name: 'Temperature', icon: 'fa-thermometer-half', gradient: 'from-red-500 to-orange-500' },
        'tds': { name: 'TDS', icon: 'fa-water', gradient: 'from-teal-500 to-green-500' }
    };
    return info[type] || { name: type, icon: 'fa-tachometer-alt', gradient: 'from-gray-500 to-gray-600' };
}

// Update recent readings display
function updateRecentReadings(readings) {
    const container = document.getElementById('recentReadings');
    if (!container) return;
    
    container.innerHTML = readings.map(reading => {
        // Extract sensor type from sensor_id (e.g., "ukkadam_ph" -> "ph")
        const parts = reading.sensor_id.split('_');
        const location = parts[0];
        const sensorType = parts[1];
        
        // Format sensor type nicely
        const sensorNames = {
            'ph': 'pH',
            'turbidity': 'Turbidity',
            'temperature': 'Temp',
            'tds': 'TDS'
        };
        
        const sensorUnits = {
            'ph': 'pH',
            'turbidity': 'NTU',
            'temperature': '°C',
            'tds': 'ppm'
        };
        
        const displayName = sensorNames[sensorType] || sensorType;
        const unit = sensorUnits[sensorType] || '';
        const locationName = location.charAt(0).toUpperCase() + location.slice(1);
        
        return `
            <div class="bg-gray-50 p-2 rounded hover:bg-gray-100 transition-colors">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">${locationName} - ${displayName}</span>
                    <span class="text-sm font-medium text-gray-900">${parseFloat(reading.value).toFixed(1)} ${unit}</span>
                </div>
                <div class="flex justify-between items-center mt-1">
                    <div class="text-xs text-gray-500">${new Date(reading.timestamp).toLocaleTimeString()}</div>
                    ${reading.rssi ? `<div class="text-xs text-gray-400">RSSI: ${reading.rssi} dBm</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Show location details
function showLocationDetails(location) {
    // In the future, we can add a sliding panel here
    console.log('Showing details for location:', location);
}

// Function to center map on a location (called from location list)
function centerMapOnLocation(coordinates) {
    if (window.mapManager && window.mapManager.centerOnLocation) {
        window.mapManager.centerOnLocation(coordinates);
    }
}

// Make sensorData globally available
window.sensorData = sensorData;

// Store all readings for filtering
let allReadings = [];
let currentLocationFilter = 'all';
let currentSensorFilter = 'all';

// Filter readings based on selected filters
function filterReadings() {
    let filtered = allReadings;
    
    if (currentLocationFilter !== 'all') {
        filtered = filtered.filter(r => r.sensor_id.startsWith(currentLocationFilter));
    }
    
    if (currentSensorFilter !== 'all') {
        filtered = filtered.filter(r => r.sensor_id.endsWith(currentSensorFilter));
    }
    
    updateRecentReadings(filtered.slice(0, 10));
}

// Initialize data handling
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase first
    if (initializeSupabase()) {
        // Initialize locations with real data
        initializeLocations();
    } else {
        // Fallback to sample data if Supabase fails
        console.warn('⚠️ Using sample data - Supabase not available');
        sensorData.locations = sampleLocations;
        updateLocationsList();
    }

    // Set up location search
    const searchInput = document.getElementById('locationSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchText = e.target.value;
            if (searchText.length > 0) {
                filterLocations(searchText);
            } else {
                // Reset to all locations
                sensorData.locations = sampleLocations;
                updateLocationsList();
            }
        });
    }

    // Set up data refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Refreshing data...');
            if (supabase) {
                fetchSensorData();
            }
        });
    }

    // Set up filter dropdowns for recent readings
    const locationFilter = document.getElementById('locationFilter');
    const sensorFilter = document.getElementById('sensorFilter');
    
    if (locationFilter) {
        locationFilter.addEventListener('change', (e) => {
            currentLocationFilter = e.target.value;
            filterReadings();
        });
    }
    
    if (sensorFilter) {
        sensorFilter.addEventListener('change', (e) => {
            currentSensorFilter = e.target.value;
            filterReadings();
        });
    }
    
    // Set up statistics location filter
    const statsLocationFilter = document.getElementById('statsLocationFilter');
    if (statsLocationFilter) {
        statsLocationFilter.addEventListener('change', (e) => {
            updateStatistics(e.target.value);
        });
    }
    
    // Set up data range filters
    const minValue = document.getElementById('minValue');
    const maxValue = document.getElementById('maxValue');
    
    if (minValue) {
        minValue.addEventListener('input', () => {
            applyDataRangeFilter();
        });
        minValue.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyDataRangeFilter();
            }
        });
    }
    
    if (maxValue) {
        maxValue.addEventListener('input', () => {
            applyDataRangeFilter();
        });
        maxValue.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyDataRangeFilter();
            }
        });
    }

    // Initial statistics update
    updateStatistics();
});

// Apply data range filter to map markers
function applyDataRangeFilter() {
    const minInput = document.getElementById('minValue');
    const maxInput = document.getElementById('maxValue');
    
    const min = minInput && minInput.value !== '' ? parseFloat(minInput.value) : -Infinity;
    const max = maxInput && maxInput.value !== '' ? parseFloat(maxInput.value) : Infinity;
    
    console.log('🔍 Applying data range filter:', { min, max });
    
    // If both are empty, show all locations
    if (min === -Infinity && max === Infinity) {
        console.log('📊 No filter applied - showing all locations');
        sensorData.locations = sampleLocations;
        updateLocationsList();
        if (window.mapManager && window.mapManager.updateMarkersWithFilter) {
            window.mapManager.updateMarkersWithFilter(sampleLocations);
        }
        return;
    }
    
    // Filter locations based on their last reading (average of all sensors)
    const filteredLocations = sampleLocations.filter(location => {
        if (!location.lastReading && location.lastReading !== 0) {
            console.log(`⚠️ Location ${location.name} has no lastReading`);
            return true; // Include locations without data
        }
        const inRange = location.lastReading >= min && location.lastReading <= max;
        console.log(`📍 ${location.name}: ${location.lastReading.toFixed(1)} - ${inRange ? '✅ IN' : '❌ OUT'} of range [${min}, ${max}]`);
        return inRange;
    });
    
    console.log(`✅ Filtered: ${filteredLocations.length} of ${sampleLocations.length} locations`);
    
    // Update map markers
    if (window.mapManager && window.mapManager.updateMarkersWithFilter) {
        window.mapManager.updateMarkersWithFilter(filteredLocations);
    } else {
        console.warn('⚠️ mapManager.updateMarkersWithFilter not available');
    }
    
    // Update location list
    sensorData.locations = filteredLocations;
    updateLocationsList();
    
    // Show feedback message
    if (filteredLocations.length === 0) {
        console.warn('⚠️ No locations match the filter range');
    }
}