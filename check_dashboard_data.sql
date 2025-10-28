-- ============================================
-- Diagnostic Query for Dashboard Data
-- ============================================

-- 1. Check all sensor_readings
SELECT 
    sensor_id,
    value,
    rssi,
    timestamp,
    SPLIT_PART(sensor_id, '_', 1) as location_name,
    SPLIT_PART(sensor_id, '_', 2) as sensor_type
FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 20;

-- 2. Check if location exists in locations table
SELECT location_id, name, latitude, longitude 
FROM locations
WHERE location_id IN ('karipatti', 'nallampatti', 'poolampatti', 'thumbalpatti', 'mallamooppampatti');

-- 3. Check if sensors exist for these locations
SELECT sensor_id, location_id, sensor_type
FROM sensors
WHERE location_id IN ('karipatti', 'nallampatti', 'poolampatti', 'thumbalpatti', 'mallamooppampatti')
ORDER BY location_id, sensor_type;

-- 4. Get latest reading per location
SELECT DISTINCT ON (SPLIT_PART(sensor_id, '_', 1))
    SPLIT_PART(sensor_id, '_', 1) as location,
    sensor_id,
    value,
    timestamp
FROM sensor_readings
ORDER BY SPLIT_PART(sensor_id, '_', 1), timestamp DESC;
