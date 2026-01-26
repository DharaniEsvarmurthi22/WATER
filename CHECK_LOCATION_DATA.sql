-- Check what location_id values exist in sensor_readings table

-- Show all unique location_ids
SELECT DISTINCT location_id, COUNT(*) as reading_count
FROM sensor_readings
GROUP BY location_id
ORDER BY reading_count DESC;

-- Show sample records for edappadi
SELECT sensor_id, location_id, value, timestamp, device_identifier
FROM sensor_readings
WHERE location_id = 'edappadi'
ORDER BY timestamp DESC
LIMIT 10;

-- Show records where location_id is NULL
SELECT sensor_id, device_identifier, value, timestamp, location_id
FROM sensor_readings
WHERE location_id IS NULL
ORDER BY timestamp DESC
LIMIT 10;

-- Show all sensor types and their counts
SELECT sensor_id, COUNT(*) as count
FROM sensor_readings
GROUP BY sensor_id
ORDER BY count DESC;
