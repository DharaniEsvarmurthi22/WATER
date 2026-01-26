-- ============================================
-- Device Claiming System with RLS
-- ADAPTED TO EXISTING SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================
-- This version uses: device_identifier, name (not device_id, device_name)

-- Ensure required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Disable RLS while making schema/policy changes
ALTER TABLE IF EXISTS public.sensor_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.devices DISABLE ROW LEVEL SECURITY;

-- 2) Drop policies that might reference device_identifier (idempotent)
DROP POLICY IF EXISTS "Users see own device readings" ON public.sensor_readings;
DROP POLICY IF EXISTS "Users can insert for their device" ON public.sensor_readings;
DROP POLICY IF EXISTS "Service can insert readings" ON public.sensor_readings;

DROP POLICY IF EXISTS "Users see own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can claim devices" ON public.devices;

-- 3) Ensure device_identifier column exists in sensor_readings (safe check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sensor_readings' AND column_name = 'device_identifier'
  ) THEN
    ALTER TABLE public.sensor_readings ADD COLUMN device_identifier text;
    RAISE NOTICE 'Added device_identifier column to public.sensor_readings';
  ELSE
    RAISE NOTICE 'device_identifier column already exists in public.sensor_readings';
  END IF;
END
$$;

-- 4) Ensure locations table has location_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.locations ADD COLUMN location_id text UNIQUE;
    RAISE NOTICE 'Added location_id column to public.locations';
  END IF;
END
$$;

-- 4b) Ensure devices table has location_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'devices' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.devices ADD COLUMN location_id text;
    RAISE NOTICE 'Added location_id column to public.devices';
  ELSE
    RAISE NOTICE 'location_id column already exists in public.devices';
  END IF;
END
$$;

-- 4c) Ensure devices table has updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'devices' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.devices ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE 'Added updated_at column to public.devices';
  ELSE
    RAISE NOTICE 'updated_at column already exists in public.devices';
  END IF;
END
$$;

-- 4d) Ensure devices table has claimed_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'devices' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE public.devices ADD COLUMN claimed_at timestamptz;
    RAISE NOTICE 'Added claimed_at column to public.devices';
  ELSE
    RAISE NOTICE 'claimed_at column already exists in public.devices';
  END IF;
END
$$;

-- 4e) Remove NOT NULL constraint from user_id (devices can be unclaimed)
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'devices' 
      AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.devices ALTER COLUMN user_id DROP NOT NULL;
    RAISE NOTICE 'Removed NOT NULL constraint from devices.user_id';
  ELSE
    RAISE NOTICE 'devices.user_id already allows NULL';
  END IF;
END
$$;

-- 5) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_identifier ON public.sensor_readings(device_identifier);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON public.sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_identifier ON public.devices(device_identifier);
CREATE INDEX IF NOT EXISTS idx_devices_location_id ON public.devices(location_id);

-- 6) Devices table RLS policies (users only see/claim their own devices)
ALTER TABLE IF EXISTS public.devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own devices" ON public.devices;
CREATE POLICY "Users see own devices" ON public.devices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can claim devices" ON public.devices;
CREATE POLICY "Users can claim devices" ON public.devices
  FOR UPDATE TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7) sensor_readings policies
-- SELECT: users only see readings from devices they own
DROP POLICY IF EXISTS "Users see own device readings" ON public.sensor_readings;
CREATE POLICY "Users see own device readings" ON public.sensor_readings
  FOR SELECT TO authenticated
  USING (
    device_identifier IS NOT NULL
    AND device_identifier IN (
      SELECT device_identifier FROM public.devices WHERE user_id = auth.uid()
    )
  );

-- INSERT (client-side) policy: allow authenticated users to insert only for devices they own.
DROP POLICY IF EXISTS "Users can insert for their device" ON public.sensor_readings;
CREATE POLICY "Users can insert for their device" ON public.sensor_readings
  FOR INSERT TO authenticated
  WITH CHECK (
    device_identifier IS NOT NULL
    AND device_identifier IN (SELECT device_identifier FROM public.devices WHERE user_id = auth.uid())
  );

-- 8) Re-enable RLS on sensor_readings
ALTER TABLE IF EXISTS public.sensor_readings ENABLE ROW LEVEL SECURITY;

-- 9) Helper functions

-- 9a) claim_device: called by an authenticated user to claim a device with its secret
-- NOTE: Frontend passes p_device_id, but we match against device_identifier column
CREATE OR REPLACE FUNCTION public.claim_device(p_device_id text, p_secret text)
RETURNS TABLE(id uuid, device_identifier text, device_name text, location_id text) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE v_device RECORD;
BEGIN
  -- find device and validate secret; allow claim only if unclaimed or already owned by caller
  SELECT d.id, d.device_identifier, d.name, d.location_id
  INTO v_device
  FROM public.devices d
  WHERE d.device_identifier = p_device_id AND d.secret = p_secret
    AND (d.user_id IS NULL OR d.user_id = auth.uid())
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid device ID or password or device already claimed';
  END IF;

  UPDATE public.devices
  SET user_id = auth.uid(), claimed_at = now(), updated_at = now()
  WHERE device_identifier = p_device_id
  RETURNING id, device_identifier, name, location_id INTO v_device;

  RETURN QUERY SELECT v_device.id, v_device.device_identifier, v_device.name, v_device.location_id;
END;
$$;

-- 9b) get_user_devices: returns devices for current authenticated user
-- NOTE: Returns device_identifier as "device_identifier" and name as "device_name" for frontend compatibility
CREATE OR REPLACE FUNCTION public.get_user_devices()
RETURNS TABLE(id uuid, device_identifier text, device_name text, location_id text, claimed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.device_identifier, d.name, d.location_id, d.claimed_at
  FROM public.devices d
  WHERE d.user_id = auth.uid()
  ORDER BY d.claimed_at DESC NULLS LAST;
END;
$$;

-- 9c) insert_reading: SECURITY DEFINER function for server-side ingestion
-- Your backend (server) calls this (or inserts directly using service_role key).
-- DYNAMIC: Auto-registers device if it doesn't exist!
CREATE OR REPLACE FUNCTION public.insert_reading(
  p_sensor_id text,
  p_value numeric,
  p_rssi integer DEFAULT NULL,
  p_device_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Auto-register device if provided and doesn't exist
  IF p_device_id IS NOT NULL THEN
    PERFORM public.auto_register_device(p_device_id);
  END IF;

  INSERT INTO public.sensor_readings (sensor_id, value, rssi, device_identifier, metadata, timestamp, created_at)
  VALUES (p_sensor_id, p_value, p_rssi, p_device_id, p_metadata, now(), now());
END;
$$;

-- 10) Auto-create location helper + trigger
-- Extracts location from sensor_id (e.g., "nallampatti_ph" -> "nallampatti")
CREATE OR REPLACE FUNCTION public.auto_create_location_from_reading()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  loc_id text;
  loc_name text;
BEGIN
  -- Extract location from sensor_id (e.g., "nallampatti_ph" -> "nallampatti")
  loc_id := split_part(NEW.sensor_id, '_', 1);
  
  IF loc_id <> '' THEN
    -- Check if location exists
    IF NOT EXISTS (SELECT 1 FROM public.locations WHERE location_id = loc_id) THEN
      loc_name := initcap(replace(loc_id, '_', ' '));
      INSERT INTO public.locations (location_id, name, metadata, created_at)
      VALUES (loc_id, loc_name, jsonb_build_object('auto_created', true, 'source', 'sensor_reading'), now())
      ON CONFLICT (location_id) DO NOTHING;
      RAISE NOTICE 'Auto-created location: %', loc_id;
    END IF;
    
    -- Update device location_id if device is specified
    IF COALESCE(NEW.device_identifier, '') <> '' THEN
      UPDATE public.devices 
      SET location_id = loc_id, updated_at = now()
      WHERE device_identifier = NEW.device_identifier 
        AND (location_id IS NULL OR location_id = '');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after insert on sensor_readings
DROP TRIGGER IF EXISTS trg_auto_create_location ON public.sensor_readings;
CREATE TRIGGER trg_auto_create_location
  AFTER INSERT ON public.sensor_readings
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_location_from_reading();

-- 11) Insert a test device (OPTIONAL - just for testing claim feature)
-- Your ESP32 will AUTO-CREATE devices when it sends data! This is just one example.
INSERT INTO public.devices (device_identifier, name, secret, location_id, metadata, created_at, updated_at)
VALUES ('ESP32-SALEM-001', 'Salem Receiver', 'salem123', 'salem', '{"area":"Salem","type":"water_quality","auto_created":false}'::jsonb, now(), now())
ON CONFLICT (device_identifier) DO NOTHING;

-- 11b) Function to auto-register devices from ESP32 data (DYNAMIC CREATION)
CREATE OR REPLACE FUNCTION public.auto_register_device(
  p_device_id text,
  p_location_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_device_uuid uuid;
BEGIN
  -- Check if device already exists
  SELECT id INTO v_device_uuid
  FROM public.devices
  WHERE device_identifier = p_device_id;

  -- If device doesn't exist, create it automatically with random secret
  IF v_device_uuid IS NULL THEN
    INSERT INTO public.devices (device_identifier, name, secret, location_id, metadata, created_at, updated_at)
    VALUES (
      p_device_id,
      'Auto-registered: ' || p_device_id,
      md5(random()::text || p_device_id), -- Random secret for claiming
      p_location_id,
      jsonb_build_object('auto_created', true, 'first_seen', now()),
      now(),
      now()
    )
    RETURNING id INTO v_device_uuid;
    
    RAISE NOTICE 'Device % auto-registered with random secret', p_device_id;
  END IF;

  RETURN v_device_uuid;
END;
$$;

-- 12) Final sanity: ensure devices RLS is enabled
ALTER TABLE IF EXISTS public.devices ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Success Message
-- ============================================
SELECT 'Device claiming system created successfully! Schema adapted to existing columns (device_identifier, name).' as status;
