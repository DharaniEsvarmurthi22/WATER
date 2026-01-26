-- Fix SALEM_ESP32_001 device secret to match ESP32 code
-- Run this in Supabase SQL Editor

-- Update the device secret to match ESP32 code
UPDATE public.devices
SET secret = 'salem@2026',
    updated_at = now()
WHERE device_identifier = 'SALEM_ESP32_001';

-- Verify the update
SELECT 
  device_identifier,
  name,
  secret,
  location_id,
  created_at
FROM public.devices
WHERE device_identifier = 'SALEM_ESP32_001';
