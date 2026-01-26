-- ============================================================================
-- PASSWORD-BASED DEVICE CLAIMING SYSTEM
-- ============================================================================
-- Instead of pre-assigning devices, users "claim" devices using a password
-- ESP32 devices register themselves with a secret, users claim with that secret
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE DEVICE REGISTRY TABLE
-- ============================================================================
-- This table stores ALL devices that have registered themselves
-- Device auto-registers on first data transmission

CREATE TABLE IF NOT EXISTS device_registry (
    id BIGSERIAL PRIMARY KEY,
    device_secret TEXT NOT NULL UNIQUE,  -- Secret password (like "SALEM2024XYZ")
    device_mac TEXT UNIQUE,               -- MAC address (auto-populated by ESP32)
    device_name TEXT,                     -- Friendly name (optional, can be updated)
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    latitude DOUBLE PRECISION,            -- Last known location
    longitude DOUBLE PRECISION,
    status TEXT DEFAULT 'active',
    notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_registry_secret 
    ON device_registry(device_secret);
CREATE INDEX IF NOT EXISTS idx_device_registry_mac 
    ON device_registry(device_mac);
CREATE INDEX IF NOT EXISTS idx_device_registry_claimed_by 
    ON device_registry(claimed_by);
CREATE INDEX IF NOT EXISTS idx_device_registry_is_claimed 
    ON device_registry(is_claimed);

-- Enable RLS
ALTER TABLE device_registry ENABLE ROW LEVEL SECURITY;

-- Users can view unclaimed devices (to claim them)
CREATE POLICY "Users can view unclaimed devices"
ON device_registry
FOR SELECT
TO authenticated
USING (is_claimed = FALSE OR claimed_by = auth.uid());

-- Users can view their own claimed devices
CREATE POLICY "Users can view own claimed devices"
ON device_registry
FOR SELECT
TO authenticated
USING (claimed_by = auth.uid());

-- Admins can view all devices
CREATE POLICY "Admins can view all devices"
ON device_registry
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- ESP32 devices (anon) can register themselves
CREATE POLICY "Devices can register themselves"
ON device_registry
FOR INSERT
TO anon
WITH CHECK (true);

-- ESP32 devices can update their last_seen timestamp
CREATE POLICY "Devices can update themselves"
ON device_registry
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

COMMENT ON TABLE device_registry IS 
'Registry of all ESP32 devices. Devices auto-register with their secret. Users claim devices using the secret.';

-- ============================================================================
-- STEP 2: UPDATE SENSOR_READINGS TABLE
-- ============================================================================
-- Now device_id is the device_secret (or MAC address)

-- Check if table exists and migrate schema
DO $$
BEGIN
    -- Create table if doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sensor_readings') THEN
        CREATE TABLE sensor_readings (
            id BIGSERIAL PRIMARY KEY,
            device_secret TEXT NOT NULL,
            device_mac TEXT,
            device_name TEXT,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
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
        RAISE NOTICE 'Created sensor_readings table';
    ELSE
        -- Table exists, check if we need to migrate from device_id to device_secret
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'sensor_readings' 
            AND column_name = 'device_id'
            AND table_schema = 'public'
        ) AND NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'sensor_readings' 
            AND column_name = 'device_secret'
            AND table_schema = 'public'
        ) THEN
            -- Rename device_id to device_secret
            ALTER TABLE sensor_readings RENAME COLUMN device_id TO device_secret;
            RAISE NOTICE 'Migrated device_id column to device_secret';
        END IF;
        
        -- Add device_secret column if it doesn't exist (shouldn't happen after rename)
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'sensor_readings' 
            AND column_name = 'device_secret'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE sensor_readings ADD COLUMN device_secret TEXT;
            RAISE NOTICE 'Added device_secret column';
        END IF;
        
        -- Add other columns if they don't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'sensor_readings' AND column_name = 'device_mac'
        ) THEN
            ALTER TABLE sensor_readings ADD COLUMN device_mac TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'sensor_readings' AND column_name = 'device_name'
        ) THEN
            ALTER TABLE sensor_readings ADD COLUMN device_name TEXT;
        END IF;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_secret 
    ON sensor_readings(device_secret);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_mac 
    ON sensor_readings(device_mac);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp 
    ON sensor_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_secret_timestamp 
    ON sensor_readings(device_secret, timestamp DESC);

-- Enable RLS
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "ESP32 devices can insert readings" ON sensor_readings;
DROP POLICY IF EXISTS "Users see only their device data" ON sensor_readings;
DROP POLICY IF EXISTS "Admins see all device data" ON sensor_readings;

-- NEW POLICY 1: ESP32 devices (anon) can INSERT readings
CREATE POLICY "Devices can insert readings"
ON sensor_readings
FOR INSERT
TO anon
WITH CHECK (true);

-- NEW POLICY 2: Users can SELECT readings from their CLAIMED devices
CREATE POLICY "Users see their claimed device data"
ON sensor_readings
FOR SELECT
TO authenticated
USING (
    device_secret IN (
        SELECT device_secret 
        FROM device_registry 
        WHERE claimed_by = auth.uid()
        AND is_claimed = TRUE
    )
);

-- NEW POLICY 3: Admins can see ALL readings
CREATE POLICY "Admins see all readings"
ON sensor_readings
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

-- ============================================================================
-- STEP 3: CREATE DEVICE CLAIMING FUNCTION
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS claim_device(TEXT, TEXT);
DROP FUNCTION IF EXISTS claim_device(TEXT);

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
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Check if device exists with this secret
    SELECT * INTO v_device
    FROM device_registry
    WHERE device_secret = p_device_secret;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid device secret. Device not found or has not transmitted data yet.'
        );
    END IF;
    
    -- Check if device is already claimed
    IF v_device.is_claimed = TRUE AND v_device.claimed_by != v_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Device already claimed by another user'
        );
    END IF;
    
    -- Check if device is already claimed by this user
    IF v_device.is_claimed = TRUE AND v_device.claimed_by = v_user_id THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Device already claimed by you',
            'device_secret', p_device_secret,
            'device_name', v_device.device_name
        );
    END IF;
    
    -- Claim the device
    UPDATE device_registry
    SET 
        is_claimed = TRUE,
        claimed_by = v_user_id,
        claimed_at = NOW(),
        device_name = COALESCE(p_device_name, device_name, 'ESP32 Water Monitor')
    WHERE device_secret = p_device_secret;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Device claimed successfully!',
        'device_secret', p_device_secret,
        'device_name', COALESCE(p_device_name, v_device.device_name)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION claim_device TO authenticated;

-- ============================================================================
-- STEP 4: CREATE DEVICE UNCLAIM FUNCTION
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS unclaim_device(TEXT);

CREATE OR REPLACE FUNCTION unclaim_device(
    p_device_secret TEXT
)
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
    
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = v_user_id
        AND role = 'admin'
    ) INTO v_is_admin;
    
    -- Get device info
    SELECT * INTO v_device
    FROM device_registry
    WHERE device_secret = p_device_secret;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Device not found'
        );
    END IF;
    
    -- Check permissions (owner or admin)
    IF v_device.claimed_by != v_user_id AND NOT v_is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You do not own this device'
        );
    END IF;
    
    -- Unclaim the device
    UPDATE device_registry
    SET 
        is_claimed = FALSE,
        claimed_by = NULL,
        claimed_at = NULL
    WHERE device_secret = p_device_secret;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Device unclaimed successfully'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION unclaim_device TO authenticated;

-- ============================================================================
-- STEP 5: CREATE AUTO-REGISTRATION FUNCTION
-- ============================================================================
-- ESP32 calls this on first transmission to register itself

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS register_device(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT);
DROP FUNCTION IF EXISTS register_device(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS register_device(TEXT, TEXT);

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
    -- Check if device already exists
    SELECT * INTO v_existing
    FROM device_registry
    WHERE device_secret = p_device_secret OR device_mac = p_device_mac;
    
    IF FOUND THEN
        -- Update last_seen and location
        UPDATE device_registry
        SET 
            last_seen = NOW(),
            latitude = COALESCE(p_latitude, latitude),
            longitude = COALESCE(p_longitude, longitude),
            device_mac = COALESCE(p_device_mac, device_mac)
        WHERE device_secret = p_device_secret OR device_mac = p_device_mac;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Device updated',
            'device_secret', p_device_secret,
            'is_claimed', v_existing.is_claimed
        );
    ELSE
        -- Register new device
        INSERT INTO device_registry (
            device_secret, 
            device_mac, 
            device_name, 
            latitude, 
            longitude
        ) VALUES (
            p_device_secret,
            p_device_mac,
            COALESCE(p_device_name, 'ESP32-' || LEFT(p_device_mac, 8)),
            p_latitude,
            p_longitude
        );
        
        RETURN json_build_object(
            'success', true,
            'message', 'Device registered successfully',
            'device_secret', p_device_secret,
            'is_claimed', false
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION register_device TO anon;

-- ============================================================================
-- STEP 6: CREATE HELPER VIEW FOR USER'S DEVICES
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
WHERE dr.claimed_by = auth.uid()
  AND dr.is_claimed = TRUE
ORDER BY dr.claimed_at DESC;

-- ============================================================================
-- STEP 7: CLEANUP OLD TABLES (OPTIONAL)
-- ============================================================================
-- Only run this after verifying the new system works!

-- DROP TABLE IF EXISTS device_assignments CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check device registry
-- SELECT * FROM device_registry;

-- Check claimed devices for current user
-- SELECT * FROM my_devices;

-- Test claiming a device
-- SELECT claim_device('YOUR_DEVICE_SECRET', 'My Water Monitor');

-- Test unclaiming a device
-- SELECT unclaim_device('YOUR_DEVICE_SECRET');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Password-based device claiming system setup complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'How it works:';
    RAISE NOTICE '1. ESP32 boots up with DEVICE_SECRET hardcoded';
    RAISE NOTICE '2. ESP32 sends data → auto-registers in device_registry';
    RAISE NOTICE '3. User enters DEVICE_SECRET in dashboard → claims device';
    RAISE NOTICE '4. User can now see data from that device';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update ESP32 code to use DEVICE_SECRET';
    RAISE NOTICE '2. Add "Claim Device" UI to dashboard';
    RAISE NOTICE '3. Test claiming flow';
END $$;
