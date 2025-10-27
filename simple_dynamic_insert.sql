-- ============================================
-- SIMPLE DYNAMIC SENSOR SYSTEM
-- Works with ANY location name from ESP32
-- Format: "location_sensortype" (e.g., "nallampatti_ph")
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS insert_reading(VARCHAR, DECIMAL, INTEGER);

-- Create new ultra-flexible function
CREATE OR REPLACE FUNCTION insert_reading(
  p_sensor_id VARCHAR,
  p_value DECIMAL,
  p_rssi INTEGER
)
RETURNS void AS $$
DECLARE
  v_location_id VARCHAR;
  v_location_name VARCHAR;
  v_sensor_type VARCHAR;
  v_internal_location_id UUID;
BEGIN
  -- Parse sensor_id: "location_sensortype"
  -- Examples: "nallampatti_ph", "poolampatti_turbidity", "newcity_temperature"
  
  v_location_id := LOWER(SPLIT_PART(p_sensor_id, '_', 1));
  v_sensor_type := LOWER(SPLIT_PART(p_sensor_id, '_', 2));
  
  -- Capitalize location name for display
  v_location_name := INITCAP(v_location_id);
  
  -- Normalize sensor type names
  CASE v_sensor_type
    WHEN 'ph' THEN v_sensor_type := 'pH';
    WHEN 'turb' THEN v_sensor_type := 'turbidity';
    WHEN 'turbidity' THEN v_sensor_type := 'turbidity';
    WHEN 'temp' THEN v_sensor_type := 'temperature';
    WHEN 'temperature' THEN v_sensor_type := 'temperature';
    WHEN 'tds' THEN v_sensor_type := 'tds';
    ELSE v_sensor_type := v_sensor_type; -- Keep as-is
  END CASE;

  -- Step 1: Create location if doesn't exist (with default coordinates)
  INSERT INTO locations (location_id, name, latitude, longitude)
  VALUES (v_location_id, v_location_name, 0.0, 0.0)
  ON CONFLICT (location_id) DO NOTHING;

  -- Get the internal UUID for the location
  SELECT id INTO v_internal_location_id 
  FROM locations 
  WHERE location_id = v_location_id;

  -- Step 2: Create sensor if doesn't exist
  INSERT INTO sensors (sensor_id, location_id, sensor_type, status)
  VALUES (p_sensor_id, v_internal_location_id, v_sensor_type, 'active')
  ON CONFLICT (sensor_id) DO NOTHING;

  -- Step 3: Insert the reading
  INSERT INTO sensor_readings (sensor_id, value, rssi)
  VALUES (p_sensor_id, p_value, p_rssi);

  -- Log success
  RAISE NOTICE '✅ Data inserted: % = % (RSSI: %dBm)', p_sensor_id, p_value, p_rssi;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Error: % - %', SQLERRM, p_sensor_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION insert_reading(VARCHAR, DECIMAL, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION insert_reading(VARCHAR, DECIMAL, INTEGER) TO authenticated;

-- ============================================
-- Test Examples
-- ============================================

-- Test with simple format (location_sensortype)
SELECT insert_reading('nallampatti_ph', 7.5, -65);
SELECT insert_reading('nallampatti_turbidity', 12.3, -65);
SELECT insert_reading('nallampatti_temperature', 28.5, -65);
SELECT insert_reading('nallampatti_tds', 450.0, -65);

-- Test with a brand new location
SELECT insert_reading('chennai_ph', 7.2, -70);
SELECT insert_reading('chennai_turbidity', 15.5, -70);

-- Verify results
SELECT 
  l.name as location,
  l.location_id,
  COUNT(DISTINCT s.id) as sensor_count,
  STRING_AGG(DISTINCT s.sensor_type, ', ') as sensor_types,
  COUNT(sr.id) as total_readings
FROM locations l
LEFT JOIN sensors s ON l.id = s.location_id
LEFT JOIN sensor_readings sr ON s.sensor_id = sr.sensor_id
GROUP BY l.name, l.location_id
ORDER BY l.name;

-- Show recent readings
SELECT 
  l.name,
  s.sensor_type,
  sr.value,
  sr.rssi,
  TO_CHAR(sr.timestamp, 'YYYY-MM-DD HH24:MI:SS') as time
FROM sensor_readings sr
JOIN sensors s ON sr.sensor_id = s.sensor_id
JOIN locations l ON s.location_id = l.id
ORDER BY sr.timestamp DESC
LIMIT 10;
