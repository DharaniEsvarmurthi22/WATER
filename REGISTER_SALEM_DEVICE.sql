-- Register SALEM_ESP32_001 device for claiming
-- Run this in Supabase SQL Editor FIRST, then claim it in the frontend

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
  'SALEM_ESP32_001',
  'Salem Taluks Monitor',
  'salem@2026',
  'salemsouth',
  jsonb_build_object(
    'type', 'water_quality',
    'area', 'Salem District',
    'taluks', jsonb_build_array('salemsouth', 'yercaud', 'sankari', 'edappadi', 'omalur', 'mettur'),
    'auto_created', false
  ),
  now(),
  now()
)
ON CONFLICT (device_identifier) DO UPDATE SET
  name = EXCLUDED.name,
  secret = EXCLUDED.secret,
  location_id = EXCLUDED.location_id,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Verify device was created
SELECT 
  device_identifier,
  name,
  secret,
  location_id,
  created_at
FROM public.devices
WHERE device_identifier = 'SALEM_ESP32_001';
