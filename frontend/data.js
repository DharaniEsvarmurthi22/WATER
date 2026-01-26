// data.js - Handles sensor data and statistics

// Supabase client (renamed to avoid conflicts with other scripts)
let dataSupabaseClient = null;

// Getter function for Supabase client (for use in other modules)
function getSupabaseClient() {
    return dataSupabaseClient;
}

// Expose globally for map.js to use
window.getSupabaseClient = getSupabaseClient;

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
    console.log('🔧 Initializing Supabase...');
    console.log('  window.supabase:', typeof window.supabase);
    console.log('  window.ENV:', window.ENV);
    console.log('  window.ENV_CONFIG:', window.ENV_CONFIG);
    
    const url = window.ENV?.SUPABASE_URL || window.ENV_CONFIG?.SUPABASE_URL;
    const key = window.ENV?.SUPABASE_ANON_KEY || window.ENV_CONFIG?.SUPABASE_ANON_KEY;
    
    console.log('  URL:', url);
    console.log('  Key:', key ? 'exists' : 'missing');
    
    if (!window.supabase) {
        console.error('❌ Supabase library not loaded!');
        return false;
    }
    
    if (!url || !key) {
        console.error('❌ Supabase credentials not found!');
        return false;
    }
    
    supabase = window.supabase.createClient(url, key);
    console.log('✅ Supabase client created:', supabase);
    return true;
}

// Dynamic locations - loaded from database
let sampleLocations = [];

// Get current user's claimed devices from device_registry table
async function getUserLinkedDevices() {
    console.log('🔍 Getting user claimed devices...');
    
    // Get current user from authManager
    const authManager = window.authManager;
    if (!authManager || !authManager.currentUser) {
        console.warn('⚠️ No authenticated user - returning empty (redirect to login should happen)');
        return []; // Return empty array - no data for unauthenticated users
    }
    
    const userId = authManager.currentUser.id;
    console.log('👤 Current user ID:', userId);
    
    // Check if user is admin (admins can see all devices)
    const userProfile = authManager.userProfile;
    if (userProfile && userProfile.role === 'admin') {
        console.log('👑 Admin user detected - returning null to show all devices');
        return null; // null means no filter (admin sees everything)
    }
    
    try {
        // Query device_registry to get this user's claimed devices
        const { data, error } = await supabase
            .from('device_registry')
            .select('device_secret, device_name, device_mac, claimed_at')
            .eq('claimed_by', userId)
            .eq('is_claimed', true);
        
        console.log('📊 Device registry query result:', { data, error, userId });
        
        if (error) {
            console.error('❌ Error fetching user claimed devices:', error);
            return [];
        }
        
        const deviceSecrets = data.map(row => row.device_secret).filter(Boolean);
        console.log('✅ User claimed devices:', deviceSecrets);
        console.log('📋 Full device data:', data);
        
        if (deviceSecrets.length === 0) {
            console.warn('⚠️ User has no claimed devices yet - dashboard will be empty');
            console.warn('   Go to claim-device.html to claim a device using its secret code');
        }
        
        return deviceSecrets;
    } catch (err) {
        console.error('❌ Exception getting claimed devices:', err);
        return [];
    }
}

// Get table name for a device
function getDeviceTableName(deviceId) {
    // Sanitize device ID to match backend table naming
    return 'device_' + deviceId.replace(/[^a-zA-Z0-9_]/g, '_') + '_readings';
}

// Fetch real sensor data from centralized sensor_readings table (RLS-filtered)
async function fetchSensorData() {
    console.log('🔄 fetchSensorData() called');
    
    // If no supabase client, try to create one
    if (!supabase) {
        console.warn('⚠️ Supabase not initialized, attempting to create client...');
        if (window.ENV_CONFIG && window.supabase) {
            try {
                supabase = window.supabase.createClient(
                    window.ENV_CONFIG.SUPABASE_URL,
                    window.ENV_CONFIG.SUPABASE_ANON_KEY
                );
                console.log('✅ Supabase client created in fetchSensorData');
            } catch (err) {
                console.error('❌ Failed to create Supabase client:', err);
                return;
            }
        } else {
            console.error('❌ Cannot create Supabase client - missing dependencies');
            return;
        }
    }

    try {
        // ⭐ SIMPLIFIED: Query sensor_readings directly - RLS handles filtering!
        console.log('📡 Fetching from sensor_readings table (RLS will filter by claimed devices)');
        
        const { data, error } = await supabase
            .from('sensor_readings')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(200);
        
        if (error) {
            console.error('❌ Error querying sensor_readings:', error);
            // If user has no claimed devices, RLS may return no data.
            // Do NOT clear existing client-side data here to avoid overwriting
            // user-applied color scales or UI state; just warn and exit.
            if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
                console.warn('⚠️ No data returned (user may have no claimed devices) - keeping local data intact');
                return;
            }
            throw error;
        }
        
        // RLS ensures we only see data for our claimed devices
        console.log(`✅ Got ${data?.length || 0} readings from sensor_readings (filtered by RLS)`);
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No sensor readings available - keeping existing client-side data and UI state');
            console.warn('   Possible reasons:');
            console.warn('   1. User has no claimed devices (go to claim-device.html)');
            console.warn('   2. ESP32 devices haven\'t sent data yet');
            console.warn('   3. RLS policies are blocking access');
            // Do not overwrite `allReadings`/`sensorData.locations` to avoid
            // unintentionally resetting color scales or other UI state.
            return;
        }
        
        console.log('📊 Sample reading:', data[0]);
        
        // Store readings globally
        let allDeviceReadings = data;
        allReadings = allDeviceReadings;
        window.allReadings = allReadings;
        
        // Calculate statistics from data
        const uniqueSensors = new Set(data.map(r => r.sensor_id));
        sensorData.statistics.activeSensors = uniqueSensors.size;
        sensorData.statistics.avgReading = data.length > 0
            ? data.reduce((sum, r) => sum + parseFloat(r.value || 0), 0) / data.length
            : 0;
        sensorData.lastUpdate = data[0]?.timestamp || new Date().toISOString();
        
        console.log('📊 Statistics calculated:', sensorData.statistics);
        
        // Update statistics
        updateStatistics();
        
        // Update recent readings panel
        updateRecentReadings(data.slice(0, 10)); // Show latest 10 readings
        
        // Update location filter dropdowns
        updateLocationFilters();
        
        // Group readings by device_secret to create location markers
        const deviceGroups = {};
        data.forEach(reading => {
            const deviceSecret = reading.device_secret || reading.device_id; // Fallback for compatibility
            if (!deviceGroups[deviceSecret]) {
                deviceGroups[deviceSecret] = [];
            }
            deviceGroups[deviceSecret].push(reading);
        });
        
        console.log('📋 Devices with data:', Object.keys(deviceGroups));
        
        // Process each device's latest reading to create map markers
        const locationMap = new Map();
        
        Object.entries(deviceGroups).forEach(([deviceSecret, readings]) => {
            // Get the most recent reading for this device
            const latestReading = readings[0]; // Already sorted by timestamp DESC
            
            // Use device_secret as location identifier
            const locationId = deviceSecret;
            
            if (!locationMap.has(locationId)) {
                locationMap.set(locationId, {
                    id: locationId,
                    name: latestReading.device_name || deviceId,
                    coordinates: [latestReading.latitude, latestReading.longitude],
                    readings: readings,
                    latestReading: latestReading,
                    lastUpdate: latestReading.timestamp,
                    sensorCount: 1,
                    status: latestReading.status || 'active'
                });
            }
        });
        
        // Update locations array
        sensorData.locations = Array.from(locationMap.values());
        updateLocationsList();
        
        console.log(`📍 Displaying ${locationMap.size} device(s) from sensor data`);
        
        // Update map markers
        if (window.mapManager) {
            locationMap.forEach((locationData, locationId) => {
                addESP32MarkerByLocation(locationId, locationData);
            });
        }

        // Also fetch old format locations for compatibility (if table exists)
        console.log('📍 Fetching locations table for backward compatibility...');
        const { data: locations, error: locError } = await supabase
            .from('locations')
            .select('*')
            .order('name');

        if (locError && locError.code !== '42P01') { // Ignore if table doesn't exist
            console.warn('Locations table error:', locError);
        } else if (locations && locations.length > 0) {
            console.log('📍 Fetched legacy locations from database:', locations?.length, 'rows');
        }

        // Fetch old format readings for backward compatibility  
        console.log('📊 Checking for old format sensor_readings...');
        const { data: readings, error: readError } = await supabase
            .from('sensor_readings')
            .select(`
                sensor_id,
                value,
                rssi,
                device_name,
                timestamp
            `)
            .order('timestamp', { ascending: false })
            .limit(200);

        if (readError && readError.code !== 'PGRST116') { // Ignore if no results
            console.warn('Old format readings query info:', readError);
        } else if (readings && readings.length > 0) {
            console.log('📊 Found old format sensor readings:', readings?.length, 'rows');
            console.log('   Sample:', readings?.[0]);
            
            // Process old format data if needed
            updateLocationsWithData(readings);
            filterReadings();
        }

    } catch (error) {
        console.error('❌ Error fetching sensor data:', error);
    }
}

// Update locations with real sensor data
function updateLocationsWithData(readings) {
    // Group readings by location
    const locationReadings = {};

    readings.forEach(reading => {
        // Validate pH values - only accept pH between 0.1 and 14
        if (reading.sensor_id.includes('_ph')) {
            const phValue = parseFloat(reading.value);
            if (phValue < 0.1 || phValue > 14) {
                console.warn(`Invalid pH value ${phValue} for sensor ${reading.sensor_id} - skipping`);
                return; // Skip invalid pH readings
            }
        }

        // Extract location from sensor_id (e.g., "ukkadam_ph" -> "ukkadam")
        const parts = reading.sensor_id.split('_');
        const locationId = parts[0];

        if (!locationReadings[locationId]) {
            locationReadings[locationId] = [];
        }
        locationReadings[locationId].push(reading);
    });

    // Make sure sensorData.locations exists before trying to update it
    if (!sensorData.locations || sensorData.locations.length === 0) {
        sensorData.locations = sampleLocations;
    }

    // Update each location with its readings
    sensorData.locations.forEach(location => {
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

    // Count actual unique sensors from readings (not assumed 4 per location)
    const uniqueSensors = new Set(readings.map(r => r.sensor_id));
    sensorData.statistics.activeSensors = uniqueSensors.size;
    sensorData.statistics.avgReading = readings.length > 0
        ? readings.reduce((sum, r) => sum + parseFloat(r.value), 0) / readings.length
        : 0;

    updateLocationsList();

    // Refresh map markers with new locations
    if (window.mapManager && window.mapManager.addVillageMarkers) {
        console.log('🗺️ Refreshing map markers with new locations');
        window.mapManager.addVillageMarkers();
    }
}

// Display ESP32 sensor data as markers on the map
function displayESP32Markers(esp32Readings) {
    if (!window.mapManager || !window.mapManager.map) {
        console.warn('Map not ready for ESP32 markers');
        return;
    }

    // Group readings by location (extracted from sensor_id)
    const locationMap = new Map();

    esp32Readings.forEach(reading => {
        // Extract location from sensor_id (e.g., "sankari_ph" -> "sankari")
        const location = reading.sensor_id ? reading.sensor_id.split('_')[0] : null;
        if (!location) return;

        if (!locationMap.has(location)) {
            locationMap.set(location, {
                location_id: location,
                device_name: reading.device_name || reading.device_identifier || null,
                timestamp: reading.timestamp,
                readings: {}
            });
        }

        const locationData = locationMap.get(location);
        // Store sensor type and value (e.g., "ph" -> 8.97)
        const sensorType = reading.sensor_id.split('_')[1];
        locationData.readings[sensorType] = parseFloat(reading.value);
        locationData.rssi = reading.rssi;
        
        // Update timestamp if newer
        if (new Date(reading.timestamp) > new Date(locationData.timestamp)) {
            locationData.timestamp = reading.timestamp;
        }
    });

    console.log(`📍 Displaying ${locationMap.size} location(s) from ESP32 data:`, Array.from(locationMap.keys()));

    // Add marker for each location (using KML overlay centroids)
    locationMap.forEach((locationData, locationId) => {
        addESP32MarkerByLocation(locationId, locationData);
    });
}

// Add a single ESP32 marker to the map
function addESP32Marker(reading) {
    if (!window.mapManager || !window.mapManager.map) return;

    const { device_id, device_name, latitude, longitude, status, ph, turbidity, temperature, water_level, flow_rate, tds, timestamp } = reading;

    // Determine marker color based on status
    let markerColor = '#10b981'; // Green for Good
    if (status === 'Warning') markerColor = '#f59e0b'; // Orange
    if (status === 'Critical') markerColor = '#ef4444'; // Red

    // Create popup content
    const popupContent = `
        <div style="min-width: 200px;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">
                ${device_name || device_id}
            </h3>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                <strong>Device ID:</strong> ${device_id}
            </div>
            <div style="background: ${markerColor}20; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                <div style="color: ${markerColor}; font-weight: bold; font-size: 14px;">
                    Status: ${status || 'Unknown'}
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                ${ph ? `<div><strong>pH:</strong> ${ph.toFixed(2)}</div>` : ''}
                ${temperature ? `<div><strong>Temp:</strong> ${temperature.toFixed(1)}°C</div>` : ''}
                ${turbidity ? `<div><strong>Turbidity:</strong> ${turbidity.toFixed(2)} NTU</div>` : ''}
                ${tds ? `<div><strong>TDS:</strong> ${tds} ppm</div>` : ''}
                ${water_level ? `<div><strong>Water Level:</strong> ${water_level.toFixed(1)} cm</div>` : ''}
                ${flow_rate ? `<div><strong>Flow Rate:</strong> ${flow_rate.toFixed(1)} L/min</div>` : ''}
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #666;">
                <div><strong>GPS:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</div>
                <div><strong>Last Update:</strong> ${new Date(timestamp).toLocaleString()}</div>
            </div>
        </div>
    `;

    // Create marker
    const marker = new mapboxgl.Marker({
        color: markerColor
    })
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
        .addTo(window.mapManager.map);

    // Store marker reference for cleanup
    if (!window.mapManager.esp32Markers) {
        window.mapManager.esp32Markers = [];
    }
    window.mapManager.esp32Markers.push(marker);

    console.log(`✅ Added ESP32 marker for ${device_id} at [${longitude}, ${latitude}]`);
}

// Add ESP32 marker using KML overlay centroid for location
function addESP32MarkerByLocation(locationId, locationData) {
    if (!window.mapManager || !window.mapManager.map) return;

    // Find matching KML overlay to get coordinates
    let coordinates = null;
    if (window.mapManager.kmlOverlays) {
        for (const [overlayId, overlay] of Object.entries(window.mapManager.kmlOverlays)) {
            if (overlay.name && overlay.name.toLowerCase() === locationId.toLowerCase()) {
                coordinates = overlay.centroid;
                break;
            }
        }
    }

    if (!coordinates || !coordinates.lat || !coordinates.lng) {
        console.warn(`No KML overlay found for location: ${locationId}`);
        return;
    }

    const { ph, turbidity, temperature, tds } = locationData.readings;
    const { device_name, rssi, timestamp } = locationData;

    // Determine status based on pH
    let status = 'Good';
    let markerColor = '#10b981'; // Green
    if (ph) {
        if (ph < 6.5 || ph > 8.5) {
            status = 'Warning';
            markerColor = '#f59e0b'; // Orange
        }
        if (ph < 6.0 || ph > 9.0) {
            status = 'Critical';
            markerColor = '#ef4444'; // Red
        }
    }

    // Create popup content
    const popupContent = `
        <div style="min-width: 220px;">
            <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px; text-transform: capitalize;">
                ${locationId}
            </h3>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                <strong>Device:</strong> ${device_name || 'Unknown'}<br>
                <strong>Signal:</strong> ${rssi} dBm
            </div>
            <div style="background: ${markerColor}20; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                <div style="color: ${markerColor}; font-weight: bold; font-size: 14px;">
                    Status: ${status}
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                ${ph ? `<div><strong>pH:</strong> ${ph.toFixed(2)}</div>` : ''}
                ${temperature ? `<div><strong>Temp:</strong> ${temperature.toFixed(1)}°C</div>` : ''}
                ${turbidity ? `<div><strong>Turbidity:</strong> ${turbidity.toFixed(2)} NTU</div>` : ''}
                ${tds ? `<div><strong>TDS:</strong> ${tds.toFixed(0)} ppm</div>` : ''}
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #999;">
                Updated: ${new Date(timestamp).toLocaleString()}
            </div>
        </div>
    `;

    // Create custom marker icon
    const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background: ${markerColor};
                width: 32px;
                height: 32px;
                border-radius: 50% 50% 50% 0;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <span style="
                    transform: rotate(45deg);
                    color: white;
                    font-weight: bold;
                    font-size: 16px;
                ">💧</span>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    // Add marker to map
    const marker = L.marker([coordinates.lat, coordinates.lng], { icon: markerIcon })
        .addTo(window.mapManager.map)
        .bindPopup(popupContent);

    console.log(`✅ Added ESP32 marker for ${locationId} at`, coordinates);
}


// Subscribe to real-time updates with proper device filtering
async function subscribeToRealtimeUpdates() {
    if (!supabase) return;

    console.log('🔔 Setting up real-time subscription...');
    
    // Get user's claimed devices to filter subscriptions
    const claimedDevices = await getUserLinkedDevices();
    
    // If user has no devices, don't subscribe
    if (claimedDevices && claimedDevices.length === 0) {
        console.warn('⚠️ No devices claimed - skipping real-time subscription');
        console.warn('   Go to claim-device.html to claim a device');
        return;
    }
    
    // Create subscription with device filter
    const channel = supabase
        .channel('sensor_readings_changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'sensor_readings',
                // CRITICAL: Filter by device_secret on the subscription itself
                filter: claimedDevices && claimedDevices.length > 0 
                    ? `device_secret=in.(${claimedDevices.join(',')})`
                    : undefined
            },
            (payload) => {
                console.log('🔔 New sensor reading:', payload.new);
                
                // Extra safety check: verify device_secret is in our list
                const deviceSecret = payload.new.device_secret || payload.new.device_id;
                if (!claimedDevices || claimedDevices.includes(deviceSecret)) {
                    console.log('✅ Reading is for our device, refreshing...');
                    // Refresh data when new reading arrives
                    fetchSensorData();

                    // Also add the new reading to recent readings immediately
                    const container = document.getElementById('recentReadings');
                    if (container && container.firstChild) {
                        const readings = [payload.new];
                        updateRecentReadings(readings);
                    }
                } else {
                    console.log('⚠️ Reading is not for our device, ignoring');
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Subscribed to real-time updates');
                if (claimedDevices && claimedDevices.length > 0) {
                    console.log('📡 Listening for devices:', claimedDevices);
                } else {
                    console.log('📡 Listening for all devices (admin mode)');
                }
            }
        });
}

// Subscribe to backend changes for locations, popup config, and overlay metadata
function subscribeToBackendChanges() {
    if (!supabase) return;

    try {
        const dbChannel = supabase.channel('db_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'locations' }, payload => {
                console.log('🔁 locations INSERT detected, refreshing data');
                fetchSensorData();
                if (window.mapManager && window.mapManager.reloadKMLLayers) window.mapManager.reloadKMLLayers();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'locations' }, payload => {
                console.log('🔁 locations UPDATE detected, refreshing data');
                fetchSensorData();
                if (window.mapManager && window.mapManager.reloadKMLLayers) window.mapManager.reloadKMLLayers();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'locations' }, payload => {
                console.log('🔁 locations DELETE detected, refreshing data');
                fetchSensorData();
                if (window.mapManager && window.mapManager.reloadKMLLayers) window.mapManager.reloadKMLLayers();
            })
            // popup_config changes may alter which sensors/popups are shown
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'popup_config' }, payload => {
                console.log('🔁 popup_config INSERT detected, refreshing popups');
                if (window.mapManager && window.mapManager.reloadKMLLayers) window.mapManager.reloadKMLLayers();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'popup_config' }, payload => {
                console.log('🔁 popup_config UPDATE detected, refreshing popups');
                if (window.mapManager && window.mapManager.reloadKMLLayers) window.mapManager.reloadKMLLayers();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'popup_config' }, payload => {
                console.log('🔁 popup_config DELETE detected, refreshing popups');
                if (window.mapManager && window.mapManager.reloadKMLLayers) window.mapManager.reloadKMLLayers();
            })
            // Best-effort: if you store overlay metadata in a table such as `kml_overlays` or `overlays`
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kml_overlays' }, payload => {
                console.log('🔁 kml_overlays INSERT detected, reloading overlays');
                if (window.mapManager && window.mapManager.reloadKMLLayers) window.mapManager.reloadKMLLayers();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kml_overlays' }, payload => {
                console.log('🔁 kml_overlays UPDATE detected, reloading overlays');
                if (window.mapManager && window.mapManager.reloadKMLLayers) window.mapManager.reloadKMLLayers();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'kml_overlays' }, payload => {
                console.log('🔁 kml_overlays DELETE detected, reloading overlays');
                if (window.mapManager && window.mapManager.reloadKMLLayers) window.mapManager.reloadKMLLayers();
            })
            .subscribe();

        console.log('✅ Subscribed to backend DB changes (locations/popup_config/kml_overlays)');
    } catch (err) {
        console.warn('⚠️ Failed to subscribe to backend changes:', err.message || err);
    }
}

// Initialize locations
function initializeLocations() {
    sensorData.locations = sampleLocations;
    updateLocationsList();

    // Always try to fetch real data from Supabase
    console.log('🚀 initializeLocations() - attempting to fetch sensor data...');
    fetchSensorData();
    
    // Subscribe to realtime updates if supabase is available
    if (supabase) {
        subscribeToRealtimeUpdates();
    }

    // Auto-refresh every 30 seconds
    setInterval(fetchSensorData, 30000);
}

// Update locations list in the UI (helper function that accepts custom data)
function updateLocationsListWithData(locations) {
    const locationsList = document.getElementById('locationsList');
    if (!locationsList) return;

    locationsList.innerHTML = locations.map(location => {
        // Handle both old format (sensors array) and new format (readings array)
        const sensorsCount = location.sensors?.length || location.sensorCount || 0;
        const description = location.description || (location.latestReading ? `Device: ${location.name}` : 'No description');
        const lastReadingValue = location.lastReading || (location.latestReading?.value) || 0;
        
        return `
        <div class="location-item" data-id="${location.id}">
            <div class="flex items-center justify-between mb-2">
                <h3 class="font-medium text-gray-900">${location.name}</h3>
                <div class="status-dot status-${location.status || 'active'} animate"></div>
            </div>
            <p class="text-sm text-gray-600 mb-2">${description}</p>
            <div class="flex justify-between items-center text-sm">
                <span class="text-gray-500">${sensorsCount} sensors</span>
                <span class="font-medium ${lastReadingValue >= 80 ? 'text-green-600' : lastReadingValue >= 60 ? 'text-yellow-600' : 'text-red-600'}">
                    ${typeof lastReadingValue === 'number' ? lastReadingValue.toFixed(1) : '0.0'}%
                </span>
            </div>
        </div>
        `;
    }).join('');

    // Add click event listeners to location items
    const locationItems = document.querySelectorAll('.location-item');
    locationItems.forEach(item => {
        item.addEventListener('click', () => {
            const locationId = item.dataset.id;
            const location = sampleLocations.find(loc => loc.id === locationId);
            if (location) {
                // Remove active class from all items
                locationItems.forEach(i => i.classList.remove('active'));
                // Add active class to clicked item
                item.classList.add('active');
                // Center map on location
                centerMapOnLocation(location.coordinates);
                // Show location details
                showLocationDetails(location);

                // Hide the search results list after clicking
                const searchInput = document.getElementById('locationSearch');
                const locationsList = document.getElementById('locationsList');
                if (searchInput) searchInput.value = '';
                if (locationsList) locationsList.classList.add('hidden');
            }
        });
    });

    // Update location filter dropdowns dynamically
    updateLocationFilters();
}

// Update locations list in the UI (main function using sensorData)
function updateLocationsList() {
    updateLocationsListWithData(sensorData.locations);
}

// Filter locations based on search
function filterLocations(searchText) {
    const locationsList = document.getElementById('locationsList');

    if (searchText.length === 0) {
        // Hide list when search is empty
        locationsList.classList.add('hidden');
        return;
    }

    // Show list and filter locations
    locationsList.classList.remove('hidden');

    const filteredLocations = sampleLocations.filter(location =>
        location.name.toLowerCase().includes(searchText.toLowerCase()) ||
        location.description.toLowerCase().includes(searchText.toLowerCase())
    );

    // Update list with filtered locations only
    updateLocationsListWithData(filteredLocations);
}

// Update location filter dropdowns dynamically
function updateLocationFilters() {
    const statsLocationFilter = document.getElementById('statsLocationFilter');
    const locationFilter = document.getElementById('locationFilter');

    // Get unique locations from actual sensor data
    const uniqueLocationIds = new Set();
    if (allReadings && allReadings.length > 0) {
        allReadings.forEach(reading => {
            if (reading.sensor_id) {
                // Extract location from sensor_id (e.g., "salemsouth_ph" -> "salemsouth")
                const locationId = reading.sensor_id.split('_')[0];
                uniqueLocationIds.add(locationId);
            }
        });
    }

    // Map location IDs to friendly names
    const locationNames = {
        'salemsouth': 'Salem South',
        'yercaud': 'Yercaud',
        'sankari': 'Sankari',
        'edappadi': 'Edappadi',
        'omalur': 'Omalur',
        'mettur': 'Mettur'
    };

    const uniqueLocations = Array.from(uniqueLocationIds).map(id => ({
        id: id,
        name: locationNames[id] || id.charAt(0).toUpperCase() + id.slice(1)
    }));

    // Build options HTML
    const locationOptions = `
        <option value="all">All Locations</option>
        ${uniqueLocations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('')}
    `;

    console.log('📍 Updating location filters with', uniqueLocations.length, 'locations:', uniqueLocations);

    // Update both dropdowns
    if (statsLocationFilter) {
        const currentValue = statsLocationFilter.value;
        statsLocationFilter.innerHTML = locationOptions;
        // Restore selection if it still exists
        if ([...statsLocationFilter.options].some(opt => opt.value === currentValue)) {
            statsLocationFilter.value = currentValue;
        }
    }

    if (locationFilter) {
        const currentValue = locationFilter.value;
        locationFilter.innerHTML = locationOptions;
        // Restore selection if it still exists
        if ([...locationFilter.options].some(opt => opt.value === currentValue)) {
            locationFilter.value = currentValue;
        }
    }
}

// Update statistics in the UI
function updateStatistics(locationFilter = 'all') {
    console.log('📊 ========== updateStatistics() called ==========');
    console.log('   locationFilter:', locationFilter);
    console.log('   allReadings.length:', allReadings?.length || 0);
    console.log('   sensorData.statistics:', sensorData.statistics);
    
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) {
        console.error('❌ statsContainer element not found!');
        return;
    }
    console.log('✅ statsContainer found');

    // Show message if no data available
    if (!allReadings || allReadings.length === 0) {
        statsContainer.innerHTML = `
            <div class="col-span-3 bg-gray-50 rounded-lg p-4 text-center">
                <i class="fas fa-chart-line text-gray-300 text-3xl mb-2"></i>
                <p class="text-sm text-gray-600">No statistics available</p>
                <p class="text-xs text-gray-500 mt-1">Link a device to see live statistics</p>
            </div>
        `;
        return;
    }

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
            'salemsouth': 'Salem South',
            'yercaud': 'Yercaud',
            'sankari': 'Sankari',
            'edappadi': 'Edappadi',
            'omalur': 'Omalur',
            'mettur': 'Mettur'
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
    console.log('📋 ========== updateRecentReadings() called ==========');
    console.log('   readings.length:', readings?.length || 0);
    if (readings && readings.length > 0) {
        console.log('   Sample reading:', readings[0]);
    }
    
    const container = document.getElementById('recentReadings');
    if (!container) {
        console.error('❌ recentReadings container not found!');
        return;
    }
    console.log('✅ recentReadings container found');

    // Show helpful message if no readings
    if (!readings || readings.length === 0) {
        container.innerHTML = `
            <div class="p-4 text-center">
                <div class="text-gray-400 mb-2">
                    <i class="fas fa-info-circle text-2xl"></i>
                </div>
                <p class="text-sm text-gray-600 font-medium">No sensor data available</p>
                <p class="text-xs text-gray-500 mt-1">Upload a KML file and link a device to see data</p>
            </div>
        `;
        return;
    }

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
// Expose globally for colorscale and other modules
window.allReadings = allReadings;

let currentLocationFilter = 'all';
let currentSensorFilter = 'all';

// Filter readings based on selected filters
function filterReadings() {
    console.log('🔍 ========== filterReadings() called ==========');
    console.log('   allReadings available:', allReadings?.length || 0);
    console.log('   currentLocationFilter:', currentLocationFilter);
    console.log('   currentSensorFilter:', currentSensorFilter);
    
    let filtered = allReadings;

    if (currentLocationFilter !== 'all') {
        filtered = filtered.filter(r => r.sensor_id.startsWith(currentLocationFilter));
        console.log('   After location filter:', filtered.length);
    }

    if (currentSensorFilter !== 'all') {
        filtered = filtered.filter(r => r.sensor_id.endsWith(currentSensorFilter));
        console.log('   After sensor filter:', filtered.length);
    }

    console.log('   Calling updateRecentReadings with', filtered.slice(0, 10).length, 'readings');
    updateRecentReadings(filtered.slice(0, 10));
}

// Initialize data handling
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 DOMContentLoaded - Starting data.js initialization...');
    
    // Try to initialize Supabase first
    const supabaseInitialized = initializeSupabase();
    console.log('   Supabase initialization result:', supabaseInitialized);
    
    // Always initialize locations (fetchSensorData will create client if needed)
    initializeLocations();
    
    // Subscribe to backend changes if Supabase is ready
    if (supabaseInitialized) {
        subscribeToBackendChanges();
    } else {
        console.warn('⚠️ Supabase not initialized in DOMContentLoaded, but fetchSensorData will retry');
    }

    // Set up location search
    const searchInput = document.getElementById('locationSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchText = e.target.value.trim();
            filterLocations(searchText);
        });
        // Jump to location on Enter
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const searchText = e.target.value.trim();
                if (!searchText) return;

                // Try exact match first, then partial match
                const textLower = searchText.toLowerCase();
                let target = sampleLocations.find(loc => loc.name.toLowerCase() === textLower);
                if (!target) {
                    target = sampleLocations.find(loc => loc.name.toLowerCase().includes(textLower));
                }

                if (target) {
                    // Center map on found location and request popup opening (works for HTML markers and KML points)
                    if (window.mapManager && window.mapManager.centerOnLocation) {
                        window.mapManager.centerOnLocation(target.coordinates, 14, { openPopupFor: target.id });
                    } else {
                        centerMapOnLocation(target.coordinates);
                    }
                    // Optionally show details
                    showLocationDetails(target);
                    // Clear search and hide list
                    e.target.value = '';
                    const locationsList = document.getElementById('locationsList');
                    if (locationsList) locationsList.classList.add('hidden');
                } else {
                    // No exact/partial match: fall back to filter (shows list)
                    filterLocations(searchText);
                }
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

// Get latest sensor data for a device linked to KML overlay
async function getDeviceDataForKML(kmlOverlayId) {
    if (!supabase) {
        console.error('Supabase not initialized');
        return null;
    }

    try {
        // Get the device identifier linked to this KML overlay
        const { data: kmlData, error: kmlError } = await supabase
            .from('kml_overlays')
            .select('device_identifier')
            .eq('id', kmlOverlayId)
            .single();

        if (kmlError || !kmlData || !kmlData.device_identifier) {
            console.log('No device linked to this KML overlay');
            return null;
        }

        const deviceId = kmlData.device_identifier;
        console.log(`📱 Found device ${deviceId} linked to KML overlay`);

        // Get the latest sensor readings for this device
        const { data: readings, error: readError } = await supabase
            .from('sensor_readings')
            .select('*')
            .eq('device_identifier', deviceId)
            .order('timestamp', { ascending: false })
            .limit(10);

        if (readError) {
            console.error('Error fetching device readings:', readError);
            return null;
        }

        if (!readings || readings.length === 0) {
            console.log(`No sensor data found for device ${deviceId}`);
            return {
                deviceId,
                hasData: false,
                message: 'No data received yet'
            };
        }

        // Group by sensor_id and get the latest for each
        const latestBySensor = {};
        readings.forEach(reading => {
            const sensorId = reading.sensor_id || 'unknown';
            if (!latestBySensor[sensorId]) {
                latestBySensor[sensorId] = reading;
            }
        });

        console.log(`✅ Got sensor data for device ${deviceId}:`, latestBySensor);

        return {
            deviceId,
            hasData: true,
            sensors: latestBySensor,
            latestReading: readings[0],
            allReadings: readings
        };

    } catch (error) {
        console.error('Error getting device data for KML:', error);
        return null;
    }
}

// Expose globally for map.js to use
window.getDeviceDataForKML = getDeviceDataForKML;
window.getUserLinkedDevices = getUserLinkedDevices;
window.getDeviceTableName = getDeviceTableName;