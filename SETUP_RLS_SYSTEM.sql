-- ============================================================================
-- COMPLETE ROW LEVEL SECURITY (RLS) SYSTEM SETUP
-- ============================================================================
-- This implements a scalable "Lock and Key" system where:
-- 1. device_assignments = "Key Table" (who owns which device)
-- 2. sensor_readings = "Storage Table" (all data in one place)
-- 3. RLS = "Security Guard" (enforces access rules automatically)
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE THE "KEY" TABLE (Device Assignments)
-- ============================================================================
-- This is a lightweight directory that maps users to their devices
-- Only admins can modify this table

CREATE TABLE IF NOT EXISTS device_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    
    -- Ensure one device can only be assigned to one user at a time
    UNIQUE(device_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_device_assignments_user_id 
    ON device_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_device_id 
    ON device_assignments(device_id);

-- Enable RLS on the assignments table itself
ALTER TABLE device_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view their own device assignments
CREATE POLICY "Users can view own device assignments"
ON device_assignments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can insert/update/delete assignments
-- (We'll handle admin checks through a separate function)
CREATE POLICY "Admins manage device assignments"
ON device_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

COMMENT ON TABLE device_assignments IS 
'Maps users to their assigned devices. Acts as the authorization directory for RLS on sensor_readings.';

-- ============================================================================
-- STEP 2: CREATE/UPDATE THE CENTRALIZED "STORAGE" TABLE
-- ============================================================================
-- All ESP32 devices write to this ONE table
-- The device_id column is the "key" that links to device_assignments

-- Drop the existing table if it exists (WARNING: This deletes all data!)
-- Comment out this line if you want to preserve existing data
-- DROP TABLE IF EXISTS sensor_readings CASCADE;

CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,  -- CRITICAL: This is our "lock" column
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id 
    ON sensor_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp 
    ON sensor_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_timestamp 
    ON sensor_readings(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_coordinates 
    ON sensor_readings(latitude, longitude);

COMMENT ON TABLE sensor_readings IS 
'Centralized storage for all ESP32 sensor data. Access controlled by RLS based on device_assignments.';

-- ============================================================================
-- STEP 3: TURN ON THE "DATABASE LOCK" (Enable RLS)
-- ============================================================================
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anon insert sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Allow authenticated read sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "Allow anon read sensor readings" ON sensor_readings;
DROP POLICY IF EXISTS "ESP32 devices can insert readings" ON sensor_readings;
DROP POLICY IF EXISTS "Users see only their device data" ON sensor_readings;
DROP POLICY IF EXISTS "Admins see all device data" ON sensor_readings;

-- ============================================================================
-- STEP 4: GIVE THE GUARD THE "RULES" (Create RLS Policies)
-- ============================================================================

-- RULE 1: ESP32 devices (using anon key) can INSERT data
-- They can write to any device_id (we trust the ESP32 code to use correct ID)
CREATE POLICY "ESP32 devices can insert readings"
ON sensor_readings
FOR INSERT
TO anon
WITH CHECK (true);

-- RULE 2: Authenticated users can only SELECT data for THEIR assigned devices
-- This is the core security rule - it checks the device_assignments table
CREATE POLICY "Users see only their device data"
ON sensor_readings
FOR SELECT
TO authenticated
USING (
    -- Show this row ONLY IF the device_id exists in device_assignments for this user
    device_id IN (
        SELECT device_id 
        FROM device_assignments 
        WHERE user_id = auth.uid()
    )
);

-- RULE 3: Admins can see EVERYTHING (bypass device assignment check)
CREATE POLICY "Admins see all device data"
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
-- STEP 5: HELPER FUNCTIONS FOR DEVICE MANAGEMENT
-- ============================================================================

-- Function to assign a device to a user
CREATE OR REPLACE FUNCTION assign_device_to_user(
    p_user_id UUID,
    p_device_id TEXT,
    p_device_name TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if current user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only admins can assign devices'
        );
    END IF;
    
    -- Insert or update the assignment
    INSERT INTO device_assignments (user_id, device_id, device_name, notes)
    VALUES (p_user_id, p_device_id, p_device_name, p_notes)
    ON CONFLICT (device_id) 
    DO UPDATE SET 
        user_id = p_user_id,
        device_name = COALESCE(p_device_name, device_assignments.device_name),
        notes = COALESCE(p_notes, device_assignments.notes),
        assigned_at = NOW();
    
    RETURN json_build_object(
        'success', true,
        'message', 'Device assigned successfully',
        'device_id', p_device_id,
        'user_id', p_user_id
    );
END;
$$;

-- Function to remove a device assignment
CREATE OR REPLACE FUNCTION unassign_device(
    p_device_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if current user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    ) INTO v_is_admin;
    
    IF NOT v_is_admin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Only admins can unassign devices'
        );
    END IF;
    
    -- Delete the assignment
    DELETE FROM device_assignments
    WHERE device_id = p_device_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Device unassigned successfully',
        'device_id', p_device_id
    );
END;
$$;

-- Function to get all devices assigned to a user
CREATE OR REPLACE FUNCTION get_user_devices(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    device_id TEXT,
    device_name TEXT,
    assigned_at TIMESTAMPTZ,
    notes TEXT,
    latest_reading_time TIMESTAMPTZ,
    total_readings BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_user_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Determine target user (defaults to current user)
    v_target_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Check if current user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    ) INTO v_is_admin;
    
    -- Non-admins can only query their own devices
    IF NOT v_is_admin AND v_target_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: can only view own devices';
    END IF;
    
    -- Return device information with statistics
    RETURN QUERY
    SELECT 
        da.device_id,
        da.device_name,
        da.assigned_at,
        da.notes,
        MAX(sr.timestamp) as latest_reading_time,
        COUNT(sr.id) as total_readings
    FROM device_assignments da
    LEFT JOIN sensor_readings sr ON da.device_id = sr.device_id
    WHERE da.user_id = v_target_user_id
    GROUP BY da.device_id, da.device_name, da.assigned_at, da.notes
    ORDER BY da.assigned_at DESC;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to test the setup)
-- ============================================================================

-- Check device assignments
-- SELECT * FROM device_assignments;

-- Check RLS policies on sensor_readings
-- SELECT * FROM pg_policies WHERE tablename = 'sensor_readings';

-- Check RLS policies on device_assignments
-- SELECT * FROM pg_policies WHERE tablename = 'device_assignments';

-- Test getting devices for current user
-- SELECT * FROM get_user_devices();

-- ============================================================================
-- MIGRATION: Populate device_assignments from existing KML overlays
-- ============================================================================
-- This helps migrate existing users who have devices linked via kml_overlays

-- Uncomment and run this if you have existing kml_overlays with linked_device_id
/*
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
*/

-- ============================================================================
-- EXAMPLE: How to assign a device (Admin only)
-- ============================================================================
/*
-- Get a user's ID first:
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Assign a device to that user:
SELECT assign_device_to_user(
    'user-uuid-here'::UUID,
    'ESP32_SALEM_01',
    'Salem Taluk Monitor',
    'Assigned for testing'
);
*/

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Allow authenticated users to execute helper functions
GRANT EXECUTE ON FUNCTION assign_device_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION unassign_device TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_devices TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ RLS System setup complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run the migration query to populate device_assignments from kml_overlays';
    RAISE NOTICE '2. Update your ESP32 code to use the correct device_id';
    RAISE NOTICE '3. Update your frontend to filter realtime subscriptions by device_id';
    RAISE NOTICE '4. Test with a non-admin user to verify RLS is working';
    RAISE NOTICE '';
    RAISE NOTICE '📋 To assign a device, admins can run:';
    RAISE NOTICE '   SELECT assign_device_to_user(''user-uuid'', ''ESP32_DEVICE_01'', ''Device Name'');';
END $$;
