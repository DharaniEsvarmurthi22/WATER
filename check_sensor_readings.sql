-- Check if you have any sensor readings in database
-- This will show if ESP32 data is being received

-- 1. Count total readings
SELECT COUNT(*) as total_readings FROM sensor_readings;

-- 2. See recent readings (last 20)
SELECT 
    sensor_id,
    value,
    rssi,
    timestamp
FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 20;

-- 3. Check readings per location
SELECT 
    LEFT(sensor_id, POSITION('_' IN sensor_id) - 1) as location,
    COUNT(*) as reading_count,
    MAX(timestamp) as latest_reading
FROM sensor_readings
GROUP BY LEFT(sensor_id, POSITION('_' IN sensor_id) - 1)
ORDER BY latest_reading DESC;

-- 4. If NO readings exist, insert test data:
/*
-- Uncomment and run this to test with sample data:
INSERT INTO sensor_readings (sensor_id, value, rssi, timestamp) VALUES
('nallampatti_ph', 7.5, -65, NOW()),
('nallampatti_turbidity', 12.3, -65, NOW()),
('nallampatti_temperature', 28.5, -65, NOW()),
('nallampatti_tds', 450.0, -65, NOW()),
('poolampatti_ph', 7.2, -68, NOW()),
('poolampatti_turbidity', 15.1, -68, NOW()),
('poolampatti_temperature', 27.8, -68, NOW()),
('poolampatti_tds', 420.0, -68, NOW());
*/
