-- Auto-register devices when ESP32 sends data for the first time
-- Run this in Supabase SQL Editor

-- Create function to auto-register devices from sensor readings
CREATE OR REPLACE FUNCTION public.auto_register_device_from_reading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only auto-register if device_identifier is provided and doesn't exist
  IF NEW.device_identifier IS NOT NULL AND NEW.device_identifier <> '' THEN
    INSERT INTO public.devices (
      device_identifier,
      name,
      secret,
      location_id,
      metadata,
      created_at,
      updated_at
    )
    VALUES (
      NEW.device_identifier,
      'Auto-registered: ' || NEW.device_identifier,
      'default@' || substring(md5(NEW.device_identifier) from 1 for 6),  -- Deterministic secret based on device ID
      split_part(NEW.sensor_id, '_', 1),  -- Extract location from sensor_id
      jsonb_build_object(
        'auto_created', true,
        'first_seen', now(),
        'source', 'sensor_reading',
        'note', 'Default secret: default@<6chars>. Change this immediately after claiming!'
      ),
      now(),
      now()
    )
    ON CONFLICT (device_identifier) DO NOTHING;  -- Don't overwrite if exists
    
    RAISE NOTICE 'Auto-registered device: %', NEW.device_identifier;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run BEFORE insert on sensor_readings
DROP TRIGGER IF EXISTS trg_auto_register_device ON public.sensor_readings;
CREATE TRIGGER trg_auto_register_device
  BEFORE INSERT ON public.sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_register_device_from_reading();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.auto_register_device_from_reading() TO anon, authenticated;

-- ============================================
-- Auto-create locations from sensor_id
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_create_location_from_reading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  loc_id text;
  loc_name text;
BEGIN
  -- Extract location from sensor_id (e.g., "sankari_ph" -> "sankari")
  loc_id := split_part(NEW.sensor_id, '_', 1);
  
  IF loc_id <> '' THEN
    -- Check if location exists
    IF NOT EXISTS (SELECT 1 FROM public.locations WHERE location_id = loc_id) THEN
      loc_name := initcap(replace(loc_id, '_', ' '));
      INSERT INTO public.locations (location_id, name, metadata, created_at, updated_at)
      VALUES (
        loc_id,
        loc_name,
        jsonb_build_object('auto_created', true, 'source', 'sensor_reading'),
        now(),
        now()
      )
      ON CONFLICT (location_id) DO NOTHING;
      RAISE NOTICE 'Auto-created location: %', loc_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run AFTER insert on sensor_readings
DROP TRIGGER IF EXISTS trg_auto_create_location ON public.sensor_readings;
CREATE TRIGGER trg_auto_create_location
  AFTER INSERT ON public.sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_location_from_reading();

GRANT EXECUTE ON FUNCTION public.auto_create_location_from_reading() TO anon, authenticated;

-- Test query (after running ESP32)
-- SELECT device_identifier, name, secret, location_id, metadata
-- FROM public.devices
-- WHERE device_identifier = 'SALEM_ESP32_001';
