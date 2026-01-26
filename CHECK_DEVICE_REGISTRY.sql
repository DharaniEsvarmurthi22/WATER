-- Check what devices are registered
SELECT 
    device_secret,
    device_mac,
    device_name,
    is_claimed,
    claimed_by,
    claimed_at
FROM device_registry
ORDER BY claimed_at DESC NULLS LAST;

-- Check sensor_readings to see if ESP32 is transmitting
SELECT 
    device_secret,
    device_mac,
    sensor_id,
    ph,
    turbidity,
    temperature,
    tds,
    timestamp
FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 10;
