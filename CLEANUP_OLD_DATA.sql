-- ============================================
-- CLEANUP OLD TEST DATA
-- Delete all sensor readings except ESP32 data
-- ============================================

-- 1. Show what will be deleted (for verification)
SELECT 'Old sensor readings to delete:' as action, 
       sensor_id, 
       device_identifier, 
       COUNT(*) as count 
FROM sensor_readings 
WHERE sensor_id NOT LIKE 'mettur%' 
  AND sensor_id NOT LIKE 'sankari%' 
  AND sensor_id NOT LIKE 'yercaud%' 
  AND sensor_id NOT LIKE 'salemsouth%' 
  AND sensor_id NOT LIKE 'edappadi%' 
  AND sensor_id NOT LIKE 'omalur%'
GROUP BY sensor_id, device_identifier;

-- 2. Delete old sensor readings (keep only 6 Salem taluks)
DELETE FROM sensor_readings 
WHERE sensor_id NOT LIKE 'mettur%' 
  AND sensor_id NOT LIKE 'sankari%' 
  AND sensor_id NOT LIKE 'yercaud%' 
  AND sensor_id NOT LIKE 'salemsouth%' 
  AND sensor_id NOT LIKE 'edappadi%' 
  AND sensor_id NOT LIKE 'omalur%';

-- 3. Show remaining data
SELECT 'Remaining sensor readings:' as status,
       sensor_id,
       device_identifier,
       COUNT(*) as count,
       MAX(timestamp) as latest_reading
FROM sensor_readings
GROUP BY sensor_id, device_identifier
ORDER BY sensor_id;

-- 4. Delete old locations (if table exists)
DELETE FROM locations 
WHERE location_id NOT IN ('mettur', 'sankari', 'yercaud', 'salemsouth', 'edappadi', 'omalur');

-- 5. Show summary
SELECT 
    'Cleanup complete!' as status,
    COUNT(DISTINCT sensor_id) as unique_sensors,
    COUNT(DISTINCT device_identifier) as unique_devices,
    COUNT(*) as total_readings
FROM sensor_readings;
