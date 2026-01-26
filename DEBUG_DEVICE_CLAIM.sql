-- Check current device secret and debug claim issue
-- Run this in Supabase SQL Editor

-- 1. Check what secret is currently stored
SELECT 
  device_identifier,
  name,
  secret,
  user_id,
  location_id,
  created_at,
  metadata
FROM public.devices
WHERE device_identifier = 'SALEM_ESP32_001';

-- 2. Test the claim function manually
-- NOTE: This will fail in SQL Editor because you're not authenticated
-- Use the frontend dashboard to claim instead (while logged in)
-- SELECT public.claim_device('SALEM_ESP32_001', 'salem@2026');
