-- ============================================
-- FIXED INSERT_READING FUNCTION
-- With proper error handling and logging
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS insert_reading(VARCHAR, DECIMAL, INTEGER);

-- Create new function with STRICT error handling
CREATE OR REPLACE FUNCTION insert_reading(
  p_sensor_id VARCHAR,
  p_value DECIMAL,
  p_rssi INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_location_id VARCHAR;
  v_sensor_type VARCHAR;
  v_internal_location_id UUID;
  v_result JSON;
BEGIN
  -- Parse sensor_id: "location_sensortype"
  v_location_id := LOWER(SPLIT_PART(p_sensor_id, '_', 1));
  v_sensor_type := LOWER(SPLIT_PART(p_sensor_id, '_', 2));
  
  -- Validate input
  IF v_location_id = '' OR v_sensor_type = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid sensor_id format. Expected: location_sensortype'
    );
  END IF;

  -- Step 1: Ensure location exists
  INSERT INTO locations (location_id, name, latitude, longitude)
  VALUES (v_location_id, INITCAP(v_location_id), 0.0, 0.0)
  ON CONFLICT (location_id) DO NOTHING;

  -- Get the internal UUID
  SELECT id INTO v_internal_location_id 
  FROM locations 
  WHERE location_id = v_location_id;

  IF v_internal_location_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to get location_id for: ' || v_location_id
    );
  END IF;

  -- Step 2: Ensure sensor exists
  INSERT INTO sensors (sensor_id, location_id, sensor_type, status)
  VALUES (p_sensor_id, v_internal_location_id, v_sensor_type, 'active')
  ON CONFLICT (sensor_id) DO NOTHING;

  -- Step 3: Insert the reading (THIS IS THE CRITICAL PART)
  INSERT INTO sensor_readings (sensor_id, value, rssi, timestamp)
  VALUES (p_sensor_id, p_value, p_rssi, NOW());

  -- Return success
  RETURN json_build_object(
    'success', true,
    'sensor_id', p_sensor_id,
    'value', p_value,
    'rssi', p_rssi
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION insert_reading(VARCHAR, DECIMAL, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION insert_reading(VARCHAR, DECIMAL, INTEGER) TO authenticated;

-- ============================================
-- TEST THE FUNCTION
-- ============================================

-- Test 1: Insert new data
SELECT insert_reading('karipatti_ph', 7.5, -65);

-- Test 2: Verify it was inserted
SELECT * FROM sensor_readings 
WHERE sensor_id = 'karipatti_ph' 
ORDER BY timestamp DESC 
LIMIT 1;

-- Test 3: Check all recent readings
SELECT 
    sensor_id,
    value,
    rssi,
    timestamp,
    NOW() - timestamp as age
FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 10;
