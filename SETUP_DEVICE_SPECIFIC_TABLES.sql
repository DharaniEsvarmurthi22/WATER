-- ============================================
-- DEVICE-SPECIFIC TABLES SYSTEM
-- Each device gets its own readings table
-- Auto-creates table on first transmission
-- ============================================

-- 1. Create/update devices table FIRST (before functions that reference it)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,
    device_password TEXT NOT NULL,
    device_name TEXT,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    kml_overlay_id UUID REFERENCES public.kml_overlays(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
    -- Add device_id column (nullable first, will set NOT NULL after populating)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='device_id') THEN
        ALTER TABLE public.devices ADD COLUMN device_id TEXT;
        -- Populate from id column for existing rows
        UPDATE public.devices SET device_id = 'DEVICE_' || id::TEXT WHERE device_id IS NULL;
        -- Now make it unique and not null if all rows have values
        ALTER TABLE public.devices ALTER COLUMN device_id SET NOT NULL;
        ALTER TABLE public.devices ADD CONSTRAINT devices_device_id_unique UNIQUE (device_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='device_password') THEN
        ALTER TABLE public.devices ADD COLUMN device_password TEXT DEFAULT 'changeme';
        ALTER TABLE public.devices ALTER COLUMN device_password SET NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='device_name') THEN
        ALTER TABLE public.devices ADD COLUMN device_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='owner_user_id') THEN
        ALTER TABLE public.devices ADD COLUMN owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='kml_overlay_id') THEN
        ALTER TABLE public.devices ADD COLUMN kml_overlay_id UUID REFERENCES public.kml_overlays(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='is_active') THEN
        ALTER TABLE public.devices ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='devices' AND column_name='claimed_at') THEN
        ALTER TABLE public.devices ADD COLUMN claimed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON public.devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_owner ON public.devices(owner_user_id);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow read own devices" ON public.devices;
CREATE POLICY "Allow read own devices" ON public.devices
    FOR SELECT USING (owner_user_id = auth.uid() OR owner_user_id IS NULL);

DROP POLICY IF EXISTS "Allow insert devices" ON public.devices;
CREATE POLICY "Allow insert devices" ON public.devices
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update own devices" ON public.devices;
CREATE POLICY "Allow update own devices" ON public.devices
    FOR UPDATE USING (owner_user_id = auth.uid());

-- 2. Function to insert sensor reading (auto-creates table if needed)
CREATE OR REPLACE FUNCTION public.insert_device_reading(
    p_device_id TEXT,
    p_device_password TEXT,
    p_sensor_id TEXT,
    p_value NUMERIC,
    p_timestamp TIMESTAMPTZ DEFAULT NOW(),
    p_rssi INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_table_name TEXT;
    v_device_exists BOOLEAN;
    v_password_valid BOOLEAN;
    v_table_exists BOOLEAN;
    v_sql TEXT;
BEGIN
    -- Sanitize device_id to create valid table name
    v_table_name := 'device_' || regexp_replace(p_device_id, '[^a-zA-Z0-9_]', '_', 'g') || '_readings';
    
    -- Check if device exists in devices table
    SELECT EXISTS(
        SELECT 1 FROM public.devices 
        WHERE device_id = p_device_id
    ) INTO v_device_exists;
    
    -- If device doesn't exist, create it
    IF NOT v_device_exists THEN
        INSERT INTO public.devices (device_id, device_password, device_name, is_active)
        VALUES (p_device_id, p_device_password, p_device_id, true);
        
        RAISE NOTICE 'Created new device: %', p_device_id;
    ELSE
        -- Validate password
        SELECT EXISTS(
            SELECT 1 FROM public.devices 
            WHERE device_id = p_device_id 
            AND device_password = p_device_password
        ) INTO v_password_valid;
        
        IF NOT v_password_valid THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Invalid device password'
            );
        END IF;
    END IF;
    
    -- Check if device-specific table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = v_table_name
    ) INTO v_table_exists;
    
    -- Create table if it doesn't exist
    IF NOT v_table_exists THEN
        v_sql := format('
            CREATE TABLE public.%I (
                id BIGSERIAL PRIMARY KEY,
                sensor_id TEXT NOT NULL,
                value NUMERIC NOT NULL,
                timestamp TIMESTAMPTZ DEFAULT NOW(),
                rssi INTEGER,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )', v_table_name);
        
        EXECUTE v_sql;
        
        -- Create index for faster queries
        EXECUTE format('CREATE INDEX idx_%I_timestamp ON public.%I(timestamp DESC)', v_table_name, v_table_name);
        EXECUTE format('CREATE INDEX idx_%I_sensor_id ON public.%I(sensor_id)', v_table_name, v_table_name);
        
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);
        
        -- Allow anyone to read (we'll filter by device linking in frontend)
        EXECUTE format('
            CREATE POLICY "Allow read access" ON public.%I
            FOR SELECT USING (true)
        ', v_table_name);
        
        -- Allow inserts (ESP32 writes here)
        EXECUTE format('
            CREATE POLICY "Allow insert" ON public.%I
            FOR INSERT WITH CHECK (true)
        ', v_table_name);
        
        RAISE NOTICE 'Created table: %', v_table_name;
    END IF;
    
    -- Insert the reading
    EXECUTE format('
        INSERT INTO public.%I (sensor_id, value, timestamp, rssi)
        VALUES ($1, $2, $3, $4)
    ', v_table_name)
    USING p_sensor_id, p_value, p_timestamp, p_rssi;
    
    RETURN json_build_object(
        'success', true,
        'table', v_table_name,
        'device_id', p_device_id,
        'message', 'Reading inserted successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_device_reading TO anon;
GRANT EXECUTE ON FUNCTION public.insert_device_reading TO authenticated;

-- 3. Function to get device table name from device_id
CREATE OR REPLACE FUNCTION public.get_device_table_name(p_device_id TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN 'device_' || regexp_replace(p_device_id, '[^a-zA-Z0-9_]', '_', 'g') || '_readings';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION public.get_device_table_name TO anon;
GRANT EXECUTE ON FUNCTION public.get_device_table_name TO authenticated;

-- 4. Function to list all device tables
CREATE OR REPLACE FUNCTION public.list_device_tables()
RETURNS TABLE(table_name TEXT, device_id TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        regexp_replace(regexp_replace(t.table_name, '^device_', ''), '_readings$', '')::TEXT as device_id
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_name LIKE 'device_%_readings'
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.list_device_tables TO authenticated;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- The insert_device_reading() function is now ready.
-- Your ESP32 can call it to auto-create device tables.
--
-- To test manually, run this in a separate query:
--
-- SELECT public.insert_device_reading(
--     'SALEM_ESP32_001',    -- your device ID
--     'your_password_here',  -- set a password
--     'ph_sensor',
--     7.2,
--     NOW(),
--     -65
-- );
--
-- Then check: SELECT * FROM device_salem_esp32_001_readings;
-- ============================================
