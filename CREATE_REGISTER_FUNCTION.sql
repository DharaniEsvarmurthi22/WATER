-- Create register_device function for ESP32 auto-registration
CREATE OR REPLACE FUNCTION register_device(
    p_device_secret TEXT,
    p_device_mac TEXT,
    p_latitude DECIMAL DEFAULT NULL,
    p_longitude DECIMAL DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Allows ESP32 to call without authentication
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Check if device already exists
    IF EXISTS (SELECT 1 FROM device_registry WHERE device_secret = p_device_secret) THEN
        -- Device already registered, just return success
        SELECT json_build_object(
            'success', true,
            'message', 'Device already registered',
            'device_secret', p_device_secret
        ) INTO v_result;
        RETURN v_result;
    END IF;
    
    -- Insert new device
    INSERT INTO device_registry (
        device_secret,
        device_mac,
        device_name,
        is_claimed
    )
    VALUES (
        p_device_secret,
        p_device_mac,
        COALESCE(p_device_name, 'ESP32 Device'),
        false
    );
    
    -- Return success
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

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION register_device TO anon, authenticated;

-- Verify function was created
SELECT 'register_device function created successfully' as status;
