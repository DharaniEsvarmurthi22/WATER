-- Check sensor_readings table structure
-- Run this in Supabase SQL Editor

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sensor_readings'
ORDER BY ordinal_position;

-- Also check latest data
SELECT 
  id,
  sensor_id,
  value,
  device_identifier,
  rssi,
  timestamp
FROM public.sensor_readings
ORDER BY timestamp DESC
LIMIT 5;
