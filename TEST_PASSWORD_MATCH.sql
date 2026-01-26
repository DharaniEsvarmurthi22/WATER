-- Test if password matches exactly
-- Run this in Supabase SQL Editor

-- Check current device and secret
SELECT 
  device_identifier,
  secret,
  length(secret) as secret_length,
  secret = 'salem@2026' as password_matches,
  encode(secret::bytea, 'hex') as secret_hex,
  encode('salem@2026'::bytea, 'hex') as test_password_hex
FROM public.devices
WHERE device_identifier = 'SALEM_ESP32_001';
