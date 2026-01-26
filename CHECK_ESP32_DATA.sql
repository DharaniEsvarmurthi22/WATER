-- ============================================
-- ESP32 DATA VERIFICATION SCRIPT
-- Check if ESP32 data is being received correctly
-- ============================================

DO $$
DECLARE
    v_count INTEGER;
    v_device_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '   ESP32 DATA VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- 1. CHECK SENSOR READINGS TABLE
    RAISE NOTICE '1. CHECKING SENSOR_READINGS TABLE...';
    
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sensor_readings';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ sensor_readings table exists';
        
        -- Count total records
        SELECT COUNT(*) INTO v_count FROM public.sensor_readings;
        RAISE NOTICE '      Total records: %', v_count;
        
        IF v_count > 0 THEN
            RAISE NOTICE '      ✅ Data is being received!';
        ELSE
            RAISE NOTICE '      ⚠️  No data found - ESP32 may not be transmitting';
        END IF;
    ELSE
        RAISE NOTICE '   ❌ sensor_readings table NOT found';
        RAISE NOTICE '      Run create_sensor_readings_table.sql first!';
    END IF;
    
    RAISE NOTICE '';

    -- 2. CHECK DEVICES
    RAISE NOTICE '2. CHECKING DEVICES...';
    
    SELECT COUNT(DISTINCT device_id) INTO v_device_count 
    FROM public.sensor_readings;
    
    RAISE NOTICE '   📱 Unique devices transmitting: %', v_device_count;
    
    RAISE NOTICE '';

    -- 3. SHOW LATEST DATA FROM EACH DEVICE
    RAISE NOTICE '3. LATEST DATA FROM EACH DEVICE...';
    RAISE NOTICE '';
    
    FOR v_count IN 1..v_device_count LOOP
        DECLARE
            v_device_id TEXT;
            v_device_name TEXT;
            v_lat DOUBLE PRECISION;
            v_lon DOUBLE PRECISION;
            v_water_level DOUBLE PRECISION;
            v_timestamp TIMESTAMPTZ;
            v_age_minutes INTEGER;
        BEGIN
            SELECT 
                device_id,
                device_name,
                latitude,
                longitude,
                water_level,
                timestamp,
                EXTRACT(EPOCH FROM (NOW() - timestamp))/60
            INTO 
                v_device_id,
                v_device_name,
                v_lat,
                v_lon,
                v_water_level,
                v_timestamp,
                v_age_minutes
            FROM public.sensor_readings
            ORDER BY timestamp DESC
            LIMIT 1 OFFSET v_count - 1;
            
            IF v_device_id IS NOT NULL THEN
                RAISE NOTICE '   Device: %', v_device_id;
                RAISE NOTICE '   Name: %', COALESCE(v_device_name, 'Not set');
                RAISE NOTICE '   Location: [%, %]', v_lat, v_lon;
                RAISE NOTICE '   Water Level: % cm', COALESCE(v_water_level, 0);
                RAISE NOTICE '   Last Update: % (% minutes ago)', v_timestamp, v_age_minutes;
                
                IF v_age_minutes < 5 THEN
                    RAISE NOTICE '   Status: ✅ ACTIVE (recently transmitted)';
                ELSIF v_age_minutes < 60 THEN
                    RAISE NOTICE '   Status: ⚠️  INACTIVE (last seen % minutes ago)', v_age_minutes;
                ELSE
                    RAISE NOTICE '   Status: ❌ OFFLINE (last seen % minutes ago)', v_age_minutes;
                END IF;
                
                RAISE NOTICE '';
            END IF;
        END;
    END LOOP;

    -- 4. CHECK DEVICE LINKING
    RAISE NOTICE '4. CHECKING DEVICE LINKING...';
    RAISE NOTICE '';
    
    SELECT COUNT(*) INTO v_count
    FROM public.devices;
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ % device(s) registered in devices table', v_count;
        
        -- Check if transmitting devices are claimed
        DECLARE
            v_device_id TEXT;
            v_is_claimed BOOLEAN;
            v_user_id UUID;
            v_kml_linked BOOLEAN;
        BEGIN
            FOR v_device_id IN 
                SELECT DISTINCT device_id FROM public.sensor_readings LOOP
                
                SELECT 
                    user_id IS NOT NULL,
                    user_id,
                    kml_overlay_id IS NOT NULL
                INTO 
                    v_is_claimed,
                    v_user_id,
                    v_kml_linked
                FROM public.devices
                WHERE device_identifier = v_device_id;
                
                IF v_is_claimed THEN
                    RAISE NOTICE '   ✅ Device % is CLAIMED', v_device_id;
                    IF v_kml_linked THEN
                        RAISE NOTICE '      ✅ Linked to KML overlay';
                    ELSE
                        RAISE NOTICE '      ⚠️  NOT linked to KML - link it via dashboard';
                    END IF;
                ELSE
                    RAISE NOTICE '   ⚠️  Device % is UNCLAIMED', v_device_id;
                    RAISE NOTICE '      Action: Claim this device via dashboard';
                END IF;
                RAISE NOTICE '';
            END LOOP;
        END;
    ELSE
        RAISE NOTICE '   ⚠️  No devices in devices table';
        RAISE NOTICE '      Devices need to be claimed via dashboard';
    END IF;

    -- 5. DATA QUALITY CHECK
    RAISE NOTICE '5. DATA QUALITY CHECK...';
    RAISE NOTICE '';
    
    SELECT COUNT(*) INTO v_count
    FROM public.sensor_readings
    WHERE latitude IS NULL OR longitude IS NULL;
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ⚠️  % records missing GPS coordinates', v_count;
    ELSE
        RAISE NOTICE '   ✅ All records have GPS coordinates';
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM public.sensor_readings
    WHERE water_level IS NULL 
      AND flow_rate IS NULL 
      AND ph IS NULL 
      AND turbidity IS NULL;
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ⚠️  % records have no sensor data', v_count;
    ELSE
        RAISE NOTICE '   ✅ All records have sensor data';
    END IF;
    
    RAISE NOTICE '';

    -- 6. SUMMARY
    RAISE NOTICE '========================================';
    RAISE NOTICE '   VERIFICATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
END $$;

-- ============================================
-- DETAILED DATA VIEWS
-- ============================================

-- LATEST 10 SENSOR READINGS:
SELECT 
    device_id,
    device_name,
    ROUND(latitude::numeric, 4) as lat,
    ROUND(longitude::numeric, 4) as lon,
    ROUND(COALESCE(water_level, 0)::numeric, 2) as water_lvl,
    ROUND(COALESCE(flow_rate, 0)::numeric, 2) as flow,
    ROUND(COALESCE(ph, 0)::numeric, 2) as ph,
    timestamp,
    EXTRACT(EPOCH FROM (NOW() - timestamp))/60 as minutes_ago
FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 10;

-- DEVICE STATISTICS (Last 24 hours):
SELECT 
    device_id,
    COUNT(*) as total_readings,
    ROUND(AVG(COALESCE(water_level, 0))::numeric, 2) as avg_water_level,
    ROUND(AVG(COALESCE(flow_rate, 0))::numeric, 2) as avg_flow_rate,
    ROUND(AVG(COALESCE(ph, 7))::numeric, 2) as avg_ph,
    MAX(timestamp) as last_reading,
    EXTRACT(EPOCH FROM (NOW() - MAX(timestamp)))/60 as minutes_since_last
FROM sensor_readings
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY device_id
ORDER BY last_reading DESC;

-- DEVICE CLAIMING STATUS:
SELECT 
    d.device_identifier,
    d.name as device_name,
    CASE 
        WHEN d.user_id IS NULL THEN '❌ UNCLAIMED'
        ELSE '✅ CLAIMED'
    END as claim_status,
    CASE 
        WHEN d.kml_overlay_id IS NULL THEN '⚠️  No KML Link'
        ELSE '✅ KML Linked'
    END as kml_status,
    d.claimed_at,
    (SELECT COUNT(*) FROM sensor_readings WHERE device_id = d.device_identifier) as total_readings
FROM devices d
ORDER BY d.claimed_at DESC NULLS LAST;
