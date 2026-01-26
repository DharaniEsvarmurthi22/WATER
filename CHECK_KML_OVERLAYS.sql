-- Check KML overlays and their names
-- Run this in Supabase SQL Editor

SELECT 
  id,
  name,
  file_name,
  user_id,
  created_at
FROM public.kml_overlays
ORDER BY created_at DESC;

-- Check device linking
SELECT 
  d.device_identifier,
  d.name as device_name,
  d.location_id,
  ko.name as kml_name,
  ko.id as kml_id
FROM public.devices d
LEFT JOIN public.device_kml_links dkl ON d.id = dkl.device_id
LEFT JOIN public.kml_overlays ko ON dkl.kml_overlay_id = ko.id
WHERE d.device_identifier = 'SALEM_ESP32_001';
