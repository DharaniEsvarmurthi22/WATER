-- Fix register_device function to match current device_registry table
DROP FUNCTION IF EXISTS register_device(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) CASCADE;

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
    v_result JSON;
BEGIN
    -- Check if device already exists
    IF EXISTS (SELECT 1 FROM device_registry WHERE device_secret = p_device_secret) THEN
        -- Device already registered, return success
        SELECT json_build_object(
            'success', true,
            'message', 'Device already registered',
            'device_secret', p_device_secret
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- Insert new device (latitude/longitude ignored - not stored in this table)
    INSERT INTO device_registry (
        device_secret,
        device_mac,
        device_name,
        is_claimed
    )
    VALUES (
        p_device_secret,
        p_device_mac,
        COALESCE(p_device_name, 'ESP32-' || LEFT(p_device_mac, 8)),
        false
    );
    
    SELECT json_build_object(
        'success', true,
        'message', 'Device registered successfully',
        'device_secret', p_device_secret,
        'device_mac', p_device_mac
    ) INTO v_result;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    SELECT json_build_object(
        'success', false,
        'error', SQLERRM
    ) INTO v_result;
    RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION register_device TO anon, authenticated;

SELECT 'register_device function fixed - now matches device_registry table' as status;
