-- ============================================================================
-- CLEAN RESET FOR PASSWORD-BASED DEVICE CLAIMING SYSTEM
-- ============================================================================
-- This script will:
-- 1. Drop old tables and conflicts
-- 2. Create fresh device_registry and sensor_readings tables
-- 3. Set up RLS policies
-- 4. Create claiming functions
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP OLD TABLES AND POLICIES
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view unclaimed devices" ON device_registry;
DROP POLICY IF EXISTS "Users can view own claimed devices" ON device_registry;
DROP POLICY IF EXISTS "Admins can view all devices" ON device_registry;
DROP POLICY IF EXISTS "Devices can register themselves" ON device_registry;
DROP POLICY IF EXISTS "Devices can update themselves" ON device_registry;
DROP POLICY IF EXISTS "Devices can insert readings" ON sensor_readings;
DROP POLICY IF EXISTS "Users see their claimed device data" ON sensor_readings;
DROP POLICY IF EXISTS "Admins see all readings" ON sensor_readings;
DROP POLICY IF EXISTS "ESP32 devices can insert readings" ON sensor_readings;
DROP POLICY IF EXISTS "Users see only their device data" ON sensor_readings;
DROP POLICY IF EXISTS "Admins see all device data" ON sensor_readings;

-- Drop old functions (with all possible signatures)
DROP FUNCTION IF EXISTS claim_device(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS claim_device(TEXT) CASCADE;
DROP FUNCTION IF EXISTS unclaim_device(TEXT) CASCADE;
DROP FUNCTION IF EXISTS register_device(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) CASCADE;
DROP FUNCTION IF EXISTS register_device(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) CASCADE;
DROP FUNCTION IF EXISTS register_device(TEXT, TEXT) CASCADE;

-- Drop old views
DROP VIEW IF EXISTS my_devices;

-- Drop old tables (CASCADE removes all dependent objects)
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS device_registry CASCADE;
DROP TABLE IF EXISTS device_assignments CASCADE;

-- ============================================================================
-- STEP 2: CREATE DEVICE REGISTRY TABLE
-- ============================================================================

CREATE TABLE device_registry (
    id BIGSERIAL PRIMARY KEY,
    device_secret TEXT NOT NULL UNIQUE,
    device_mac TEXT UNIQUE,
    device_name TEXT,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    notes TEXT
);

-- Indexes
CREATE INDEX idx_device_registry_secret ON device_registry(device_secret);
CREATE INDEX idx_device_registry_mac ON device_registry(device_mac);
CREATE INDEX idx_device_registry_claimed_by ON device_registry(claimed_by);
CREATE INDEX idx_device_registry_is_claimed ON device_registry(is_claimed);

-- Enable RLS
ALTER TABLE device_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view unclaimed devices"
ON device_registry FOR SELECT TO authenticated
USING (is_claimed = FALSE OR claimed_by = auth.uid());

CREATE POLICY "Admins can view all devices"
ON device_registry FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Devices can register themselves"
ON device_registry FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Devices can update themselves"
ON device_registry FOR UPDATE TO anon
USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 3: CREATE SENSOR READINGS TABLE
-- ============================================================================

CREATE TABLE sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_secret TEXT NOT NULL,
    device_mac TEXT,
    device_name TEXT,
    sensor_id TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    value DOUBLE PRECISION,
    rssi INTEGER,
    water_level DOUBLE PRECISION,
    flow_rate DOUBLE PRECISION,
    ph DOUBLE PRECISION,
    turbidity DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    tds INTEGER,
    status TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sensor_readings_device_secret ON sensor_readings(device_secret);
CREATE INDEX idx_sensor_readings_device_mac ON sensor_readings(device_mac);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);
CREATE INDEX idx_sensor_readings_secret_timestamp ON sensor_readings(device_secret, timestamp DESC);
CREATE INDEX idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);

-- Enable RLS
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Devices can insert readings"
ON sensor_readings FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Users see their claimed device data"
ON sensor_readings FOR SELECT TO authenticated
USING (
    device_secret IN (
        SELECT device_secret 
        FROM device_registry 
        WHERE claimed_by = auth.uid() AND is_claimed = TRUE
    )
);

CREATE POLICY "Admins see all readings"
ON sensor_readings FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- ============================================================================
-- STEP 4: CREATE CLAIMING FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_device(
    p_device_secret TEXT,
    p_device_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_device RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    SELECT * INTO v_device FROM device_registry WHERE device_secret = p_device_secret;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Invalid device secret. Device not found.');
    END IF;
    
    IF v_device.is_claimed = TRUE AND v_device.claimed_by != v_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Device already claimed by another user');
    END IF;
    
    IF v_device.is_claimed = TRUE AND v_device.claimed_by = v_user_id THEN
        RETURN json_build_object('success', true, 'message', 'Device already claimed by you');
    END IF;
    
    UPDATE device_registry
    SET is_claimed = TRUE, claimed_by = v_user_id, claimed_at = NOW(),
        device_name = COALESCE(p_device_name, device_name, 'ESP32 Water Monitor')
    WHERE device_secret = p_device_secret;
    
    RETURN json_build_object('success', true, 'message', 'Device claimed successfully!');
END;
$$;

GRANT EXECUTE ON FUNCTION claim_device TO authenticated;

-- ============================================================================

CREATE OR REPLACE FUNCTION unclaim_device(p_device_secret TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_device RECORD;
    v_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    SELECT EXISTS (
        SELECT 1 FROM user_profiles WHERE user_id = v_user_id AND role = 'admin'
    ) INTO v_is_admin;
    
    SELECT * INTO v_device FROM device_registry WHERE device_secret = p_device_secret;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Device not found');
    END IF;
    
    IF v_device.claimed_by != v_user_id AND NOT v_is_admin THEN
        RETURN json_build_object('success', false, 'error', 'You do not own this device');
    END IF;
    
    UPDATE device_registry
    SET is_claimed = FALSE, claimed_by = NULL, claimed_at = NULL
    WHERE device_secret = p_device_secret;
    
    RETURN json_build_object('success', true, 'message', 'Device unclaimed successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION unclaim_device TO authenticated;

-- ============================================================================

CREATE OR REPLACE FUNCTION register_device(
    p_device_secret TEXT,
    p_device_mac TEXT,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing RECORD;
BEGIN
    SELECT * INTO v_existing FROM device_registry
    WHERE device_secret = p_device_secret OR device_mac = p_device_mac;
    
    IF FOUND THEN
        UPDATE device_registry
        SET last_seen = NOW(),
            latitude = COALESCE(p_latitude, latitude),
            longitude = COALESCE(p_longitude, longitude),
            device_mac = COALESCE(p_device_mac, device_mac)
        WHERE device_secret = p_device_secret OR device_mac = p_device_mac;
        
        RETURN json_build_object('success', true, 'message', 'Device updated');
    ELSE
        INSERT INTO device_registry (device_secret, device_mac, device_name, latitude, longitude)
        VALUES (p_device_secret, p_device_mac, 
                COALESCE(p_device_name, 'ESP32-' || LEFT(p_device_mac, 8)),
                p_latitude, p_longitude);
        
        RETURN json_build_object('success', true, 'message', 'Device registered successfully');
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION register_device TO anon;

-- ============================================================================
-- STEP 5: CREATE HELPER VIEW
-- ============================================================================

CREATE OR REPLACE VIEW my_devices AS
SELECT 
    dr.device_secret,
    dr.device_mac,
    dr.device_name,
    dr.claimed_at,
    dr.latitude,
    dr.longitude,
    dr.status,
    dr.last_seen,
    (SELECT COUNT(*) FROM sensor_readings WHERE device_secret = dr.device_secret) as reading_count,
    (SELECT MAX(timestamp) FROM sensor_readings WHERE device_secret = dr.device_secret) as latest_reading
FROM device_registry dr
WHERE dr.claimed_by = auth.uid() AND dr.is_claimed = TRUE
ORDER BY dr.claimed_at DESC;

-- ============================================================================
-- SUCCESS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Clean reset complete!';
    RAISE NOTICE 'Tables created: device_registry, sensor_readings';
    RAISE NOTICE 'Functions created: claim_device, unclaim_device, register_device';
    RAISE NOTICE 'Ready for ESP32 data transmission!';
END $$;
