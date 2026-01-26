-- Debug Device Linking Issue
-- Check what's in the kml_overlays table for the current user

-- 1. Check kml_overlays table structure and data
SELECT 
    id,
    owner_user_id,
    linked_device_id,
    file_name,
    created_at
FROM public.kml_overlays
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if linked_device_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'kml_overlays' 
  AND column_name = 'linked_device_id';

-- 3. Check sensor_readings to see what device_identifier values exist
SELECT DISTINCT device_identifier
FROM public.sensor_readings
ORDER BY device_identifier;

-- 4. Check if there's a mismatch between linked_device_id and actual device_identifier
SELECT 
    ko.linked_device_id as "Linked in KML",
    COUNT(DISTINCT sr.device_identifier) as "Devices in sensor_readings"
FROM public.kml_overlays ko
LEFT JOIN public.sensor_readings sr 
    ON sr.device_identifier = ko.linked_device_id
GROUP BY ko.linked_device_id;

-- 5. Show recent sensor readings with their device identifiers
SELECT 
    device_identifier,
    sensor_id,
    value,
    timestamp
FROM public.sensor_readings
ORDER BY timestamp DESC
LIMIT 20;
