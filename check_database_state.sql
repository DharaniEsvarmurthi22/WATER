-- ============================================
-- CHECK CURRENT DATABASE STATE
-- Run this in Supabase SQL Editor to see what you have
-- ============================================

-- 1. See all locations
SELECT 
    location_id, 
    name, 
    latitude, 
    longitude,
    created_at
FROM locations 
ORDER BY name;

-- 2. Count sensors per location
SELECT 
    l.name as location_name,
    COUNT(s.id) as sensor_count
FROM locations l
LEFT JOIN sensors s ON s.location_id = l.id
GROUP BY l.name, l.id
ORDER BY l.name;

-- 3. See recent sensor readings
SELECT 
    sr.sensor_id,
    sr.value,
    sr.timestamp,
    s.sensor_type,
    l.name as location_name
FROM sensor_readings sr
JOIN sensors s ON s.sensor_id = sr.sensor_id
JOIN locations l ON l.id = s.location_id
ORDER BY sr.timestamp DESC
LIMIT 20;

-- 4. Check if insert_reading function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'insert_reading';
