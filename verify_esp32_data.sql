-- ============================================
-- VERIFY ESP32 DATA IN SUPABASE
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if insert_reading function exists
SELECT 
    routine_name, 
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'insert_reading';

-- 2. Count total sensor readings
SELECT COUNT(*) as total_readings 
FROM sensor_readings;

-- 3. Show latest 20 readings with timestamps
SELECT 
    sensor_id,
    value,
    rssi,
    timestamp,
    EXTRACT(EPOCH FROM (NOW() - timestamp))/60 as minutes_ago
FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 20;

-- 4. Check if NEW villages have data (karipatti, nallampatti, etc.)
SELECT 
    sensor_id,
    value,
    rssi,
    timestamp
FROM sensor_readings
WHERE sensor_id LIKE 'karipatti_%'
   OR sensor_id LIKE 'nallampatti_%'
   OR sensor_id LIKE 'poolampatti_%'
   OR sensor_id LIKE 'thumbalpatti_%'
   OR sensor_id LIKE 'mallamooppampatti_%'
ORDER BY timestamp DESC
LIMIT 30;

-- 5. Check sensors table
SELECT 
    sensor_id,
    location_id,
    sensor_type,
    status
FROM sensors
WHERE sensor_id LIKE 'karipatti_%'
   OR sensor_id LIKE 'nallampatti_%'
   OR sensor_id LIKE 'poolampatti_%'
ORDER BY sensor_id;

-- 6. Test the insert_reading function manually
-- Uncomment to test:
-- SELECT insert_reading('test_ph', 7.5, -65);
-- SELECT * FROM sensor_readings WHERE sensor_id = 'test_ph' ORDER BY timestamp DESC LIMIT 1;
