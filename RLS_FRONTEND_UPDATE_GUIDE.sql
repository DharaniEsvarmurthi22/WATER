-- ============================================================================
-- FRONTEND UPDATE GUIDE FOR RLS SYSTEM
-- ============================================================================
-- This guide shows how to update your frontend to work with the new RLS system
-- ============================================================================

/*
CRITICAL CHANGES NEEDED IN frontend/data.js:

1. REPLACE the getUserLinkedDevices() function to query device_assignments instead of kml_overlays
2. UPDATE fetchSensorData() to query sensor_readings table instead of device-specific tables
3. FIX subscribeToRealtimeUpdates() to filter by device_id

Here's the complete updated code for these functions:
*/

-- ============================================================================
-- UPDATED FUNCTION 1: getUserLinkedDevices()
-- ============================================================================

/*
// Get current user's assigned devices from device_assignments table
async function getUserLinkedDevices() {
    console.log('🔍 Getting user assigned devices...');
    
    // Get current user from authManager
    const authManager = window.authManager;
    if (!authManager || !authManager.currentUser) {
        console.warn('⚠️ No authenticated user - returning empty');
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
        // Query device_assignments to get this user's devices
        const { data, error } = await supabase
            .from('device_assignments')
            .select('device_id, device_name')
            .eq('user_id', userId);
        
        console.log('📊 Device assignments query result:', { data, error, userId });
        
        if (error) {
            console.error('❌ Error fetching user assigned devices:', error);
            return [];
        }
        
        const deviceIds = data.map(row => row.device_id).filter(Boolean);
        console.log('✅ User assigned devices:', deviceIds);
        
        if (deviceIds.length === 0) {
            console.warn('⚠️ User has no assigned devices yet - dashboard will be empty');
        }
        
        return deviceIds;
    } catch (err) {
        console.error('❌ Exception getting assigned devices:', err);
        return [];
    }
}
*/

-- ============================================================================
-- UPDATED FUNCTION 2: fetchSensorData()
-- ============================================================================

/*
// Fetch real sensor data from centralized sensor_readings table
// RLS automatically filters data based on device_assignments
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
        // ⭐ SIMPLIFIED: Just query sensor_readings - RLS handles the filtering!
        console.log('📡 Fetching from sensor_readings table (RLS will filter)');
        
        const { data, error } = await supabase
            .from('sensor_readings')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(200);
        
        if (error) {
            console.error('❌ Error querying sensor_readings:', error);
            // If user has no devices, show empty dashboard gracefully
            if (error.code === 'PGRST116') {
                console.warn('⚠️ No data returned (user may have no assigned devices)');
                allReadings = [];
                window.allReadings = [];
                sensorData.locations = [];
                updateLocationsList();
                updateStatistics();
                return;
            }
            throw error;
        }
        
        // RLS ensures we only see data for our assigned devices
        console.log(`✅ Got ${data?.length || 0} readings from sensor_readings (filtered by RLS)`);
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No sensor readings available (user has no assigned devices or no data yet)');
            allReadings = [];
            window.allReadings = [];
            sensorData.locations = [];
            updateLocationsList();
            updateStatistics();
            return;
        }
        
        // Store readings globally
        allReadings = data;
        window.allReadings = allReadings;
        
        console.log('📊 Sample reading:', data[0]);
        
        // Update statistics
        updateStatistics();
        
        // Group readings by device_id
        const deviceGroups = {};
        data.forEach(reading => {
            const deviceId = reading.device_id;
            if (!deviceGroups[deviceId]) {
                deviceGroups[deviceId] = [];
            }
            deviceGroups[deviceId].push(reading);
        });
        
        console.log('📋 Devices with data:', Object.keys(deviceGroups));
        
        // Process each device's latest reading
        const locationMap = new Map();
        
        Object.entries(deviceGroups).forEach(([deviceId, readings]) => {
            // Get the most recent reading
            const latestReading = readings[0]; // Already sorted by timestamp DESC
            
            // Use device_id as location identifier
            const locationId = deviceId;
            
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
        
        // Update locations
        sensorData.locations = Array.from(locationMap.values());
        updateLocationsList();
        
        console.log(`📍 Displaying ${locationMap.size} device(s) from sensor data`);
        
        // Update map markers
        locationMap.forEach((locationData, locationId) => {
            addESP32MarkerByLocation(locationId, locationData);
        });
        
    } catch (error) {
        console.error('❌ Error fetching sensor data:', error);
    }
}
*/

-- ============================================================================
-- UPDATED FUNCTION 3: subscribeToRealtimeUpdates()
-- ============================================================================

/*
// Subscribe to real-time updates with proper device filtering
async function subscribeToRealtimeUpdates() {
    if (!supabase) return;

    console.log('🔔 Setting up real-time subscription...');
    
    // Get user's assigned devices
    const linkedDevices = await getUserLinkedDevices();
    
    // If user has no devices, don't subscribe
    if (linkedDevices && linkedDevices.length === 0) {
        console.warn('⚠️ No devices assigned - skipping real-time subscription');
        return;
    }
    
    // Create subscription with device filter
    let subscription = supabase
        .channel('sensor_readings_changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'sensor_readings',
                // ⭐ CRITICAL FIX: Filter by device_id on the subscription itself
                filter: linkedDevices && linkedDevices.length > 0 
                    ? `device_id=in.(${linkedDevices.join(',')})` 
                    : undefined
            },
            (payload) => {
                console.log('🔔 New sensor reading:', payload.new);
                
                // Verify the device_id is in our list (extra safety check)
                if (!linkedDevices || linkedDevices.includes(payload.new.device_id)) {
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
                if (linkedDevices && linkedDevices.length > 0) {
                    console.log('📡 Listening for devices:', linkedDevices);
                } else {
                    console.log('📡 Listening for all devices (admin mode)');
                }
            }
        });
}
*/

-- ============================================================================
-- MIGRATION STEPS
-- ============================================================================

/*
STEP-BY-STEP MIGRATION:

1. Run SETUP_RLS_SYSTEM.sql in your Supabase SQL Editor
   - This creates device_assignments table
   - Sets up RLS policies on sensor_readings
   - Creates helper functions

2. Migrate existing device-KML links to device_assignments:
   
   INSERT INTO device_assignments (user_id, device_id, device_name, notes)
   SELECT DISTINCT
       owner_user_id,
       linked_device_id,
       'Migrated from KML: ' || file_name,
       'Auto-migrated from kml_overlays table'
   FROM kml_overlays
   WHERE linked_device_id IS NOT NULL
     AND owner_user_id IS NOT NULL
   ON CONFLICT (device_id) DO NOTHING;

3. Update frontend/data.js:
   - Replace getUserLinkedDevices() function
   - Replace fetchSensorData() function
   - Replace subscribeToRealtimeUpdates() function

4. Test with non-admin user:
   - Log in as regular user
   - Verify you only see your assigned devices
   - Check that real-time updates only show your device data

5. Test with admin user:
   - Log in as admin
   - Verify you see all devices
   - Check that real-time works for all devices

6. Remove old device-specific tables (optional):
   - Once you're confident the new system works
   - Drop tables matching pattern: device_*_readings

7. Update ESP32 code:
   - Ensure all ESP32s are writing to sensor_readings table
   - Verify they include correct device_id in every reading
*/

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

-- Check what devices a user has
SELECT * FROM device_assignments WHERE user_id = 'your-user-uuid-here';

-- Check what data a user should see (simulates RLS)
SELECT sr.* 
FROM sensor_readings sr
WHERE sr.device_id IN (
    SELECT device_id 
    FROM device_assignments 
    WHERE user_id = 'your-user-uuid-here'
)
ORDER BY sr.timestamp DESC
LIMIT 10;

-- Assign a device to a user (as admin)
SELECT assign_device_to_user(
    'user-uuid-here'::UUID,
    'ESP32_SALEM_01',
    'Salem Taluk Monitor',
    'Assigned for testing'
);

-- Get all devices for a user with statistics
SELECT * FROM get_user_devices('user-uuid-here'::UUID);

-- ============================================================================
-- ADVANTAGES OF THIS SYSTEM
-- ============================================================================

/*
✅ SCALABILITY:
   - One table for all devices (not 1000 tables)
   - Easy to add new devices (just one row in device_assignments)
   - Database indexes work efficiently

✅ SECURITY:
   - RLS enforced at database level
   - Impossible to bypass (even if frontend has bugs)
   - No need to filter in frontend code

✅ PERFORMANCE:
   - Single table = better query optimization
   - Proper indexes on device_id and timestamp
   - Realtime subscriptions can be filtered server-side

✅ MAINTAINABILITY:
   - All data in one place
   - Easy to backup/restore
   - Simple schema changes

✅ FLEXIBILITY:
   - Easy to reassign devices
   - Support multiple users per device (just add more rows)
   - Support multiple devices per user (already works)
*/
