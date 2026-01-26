-- ============================================
-- VERIFY AND FIX ALL DATA
-- ============================================

-- 1. Check locations table
SELECT 'Locations table:' as table_name, * FROM locations ORDER BY location_id;

-- 2. Delete ALL old locations
DELETE FROM locations;

-- 3. Check sensor_readings - show unique location IDs
SELECT 'Unique locations in sensor_readings:' as info,
       SPLIT_PART(sensor_id, '_', 1) as location_id,
       COUNT(*) as reading_count,
       MAX(timestamp) as latest_reading
FROM sensor_readings
GROUP BY SPLIT_PART(sensor_id, '_', 1)
ORDER BY location_id;

-- 4. Check if there are readings older than 24 hours
SELECT 'Readings age distribution:' as info,
       CASE 
           WHEN timestamp > NOW() - INTERVAL '1 hour' THEN 'Last 1 hour'
           WHEN timestamp > NOW() - INTERVAL '6 hours' THEN 'Last 6 hours'
           WHEN timestamp > NOW() - INTERVAL '24 hours' THEN 'Last 24 hours'
           WHEN timestamp > NOW() - INTERVAL '7 days' THEN 'Last 7 days'
           ELSE 'Older than 7 days'
       END as age_group,
       COUNT(*) as count
FROM sensor_readings
GROUP BY age_group
ORDER BY MIN(timestamp) DESC;

-- 5. Show recent readings with timestamps
SELECT 'Recent sensor readings:' as info,
       sensor_id,
       value,
       device_identifier,
       timestamp,
       NOW() - timestamp as age
FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 20;

-- 6. Count readings per sensor type
SELECT 'Readings per sensor:' as info,
       sensor_id,
       COUNT(*) as count,
       MIN(timestamp) as oldest,
       MAX(timestamp) as newest,
       NOW() - MAX(timestamp) as time_since_last
FROM sensor_readings
GROUP BY sensor_id
ORDER BY sensor_id;
