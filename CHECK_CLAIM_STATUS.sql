-- Check if device is claimed and by whom
SELECT 
    device_secret,
    device_mac,
    device_name,
    is_claimed,
    claimed_by,
    claimed_at
FROM device_registry
ORDER BY claimed_at DESC NULLS LAST;

-- Check if sensor data exists
SELECT COUNT(*) as total_readings FROM sensor_readings;

-- Show recent readings
SELECT 
    device_secret,
    sensor_id,
    ph,
    turbidity,
    temperature,
    tds,
    timestamp
FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 5;
