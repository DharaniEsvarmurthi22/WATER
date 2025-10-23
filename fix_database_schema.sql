-- ============================================
-- DATABASE FIX: Change sensor_readings.sensor_id from UUID to TEXT
-- Run this if you already created tables with UUID sensor_id
-- ============================================

-- Step 1: Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_last_reading ON sensor_readings;
DROP FUNCTION IF EXISTS update_sensor_last_reading();
DROP FUNCTION IF EXISTS insert_reading(VARCHAR, DECIMAL, INTEGER);

-- Step 2: Drop the foreign key constraint
ALTER TABLE sensor_readings 
DROP CONSTRAINT IF EXISTS sensor_readings_sensor_id_fkey;

-- Step 3: Change sensor_id column type from UUID to VARCHAR
ALTER TABLE sensor_readings 
ALTER COLUMN sensor_id TYPE VARCHAR(50);

-- Step 4: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensors_sensor_id ON sensors(sensor_id);

-- Step 5: Recreate the trigger function (now using TEXT match)
CREATE OR REPLACE FUNCTION update_sensor_last_reading()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sensor using TEXT sensor_id match instead of UUID
  UPDATE sensors 
  SET 
    last_reading = NEW.value,
    last_reading_time = NEW.timestamp
  WHERE sensor_id = NEW.sensor_id;  -- Now matches TEXT to TEXT
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Recreate trigger
CREATE TRIGGER trigger_update_last_reading
  AFTER INSERT ON sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_sensor_last_reading();

-- Step 7: Recreate insert_reading function
CREATE OR REPLACE FUNCTION insert_reading(
  p_sensor_id VARCHAR,
  p_value DECIMAL,
  p_rssi INTEGER
)
RETURNS void AS $$
BEGIN
  -- Verify sensor exists before inserting
  IF EXISTS (SELECT 1 FROM sensors WHERE sensor_id = p_sensor_id) THEN
    -- Insert directly with TEXT sensor_id
    INSERT INTO sensor_readings (sensor_id, value, rssi)
    VALUES (p_sensor_id, p_value, p_rssi);
  ELSE
    -- Log error if sensor doesn't exist
    RAISE NOTICE 'Sensor not found: %', p_sensor_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Verification Query
-- ============================================

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'sensor_readings' 
  AND column_name = 'sensor_id';

-- Should show:
-- column_name | data_type      | character_maximum_length
-- ------------|----------------|-------------------------
-- sensor_id   | character varying | 50

-- Test the function
SELECT insert_reading('ukkadam_ph', 7.5, -55);

-- Verify data was inserted
SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 5;

-- ============================================
-- Success!
-- ============================================

SELECT 'Database migration completed successfully!' AS status;
