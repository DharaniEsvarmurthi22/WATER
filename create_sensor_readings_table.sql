-- Create sensor_readings table for ESP32 direct upload
-- Run this in your Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    device_name TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    water_level DOUBLE PRECISION,
    flow_rate DOUBLE PRECISION,
    ph DOUBLE PRECISION,
    turbidity DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    tds INTEGER,
    status TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: location column removed - location names come from KML boundaries
-- Dashboard will match lat/lon to KML regions automatically

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_id ON sensor_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_status ON sensor_readings(status);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_coordinates ON sensor_readings(latitude, longitude);

-- Enable Row Level Security (RLS)
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts from ESP32 (using anon key)
CREATE POLICY "Allow anon insert sensor readings" 
ON sensor_readings 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Create policy to allow authenticated users to read all data
CREATE POLICY "Allow authenticated read sensor readings" 
ON sensor_readings 
FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow anon users to read all data (for public dashboards)
CREATE POLICY "Allow anon read sensor readings" 
ON sensor_readings 
FOR SELECT 
TO anon 
USING (true);

-- Create a view for latest readings per device
CREATE OR REPLACE VIEW latest_sensor_readings AS
SELECT DISTINCT ON (device_id) *
FROM sensor_readings
ORDER BY device_id, timestamp DESC;

-- Grant access to the view
GRANT SELECT ON latest_sensor_readings TO anon, authenticated;

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;

-- Create a function to get device statistics
CREATE OR REPLACE FUNCTION get_device_stats(device TEXT)
RETURNS TABLE (
    avg_water_level DOUBLE PRECISION,
    avg_flow_rate DOUBLE PRECISION,
    avg_ph DOUBLE PRECISION,
    avg_turbidity DOUBLE PRECISION,
    min_ph DOUBLE PRECISION,
    max_ph DOUBLE PRECISION,
    total_readings BIGINT,
    last_reading TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        AVG(water_level)::DOUBLE PRECISION,
        AVG(flow_rate)::DOUBLE PRECISION,
        AVG(ph)::DOUBLE PRECISION,
        AVG(turbidity)::DOUBLE PRECISION,
        MIN(ph)::DOUBLE PRECISION,
        MAX(ph)::DOUBLE PRECISION,
        COUNT(*)::BIGINT,
        MAX(timestamp)::TIMESTAMPTZ
    FROM sensor_readings
    WHERE device_id = device
    AND timestamp > NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create a function to cleanup old data (optional - keeps last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_sensor_readings()
RETURNS void AS $$
BEGIN
    DELETE FROM sensor_readings
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE sensor_readings IS 'Stores real-time sensor data from ESP32 devices';
COMMENT ON COLUMN sensor_readings.device_id IS 'Unique identifier for the ESP32 device';
COMMENT ON COLUMN sensor_readings.water_level IS 'Water level in centimeters';
COMMENT ON COLUMN sensor_readings.flow_rate IS 'Water flow rate in liters per minute';
COMMENT ON COLUMN sensor_readings.ph IS 'pH value (0-14 scale)';
COMMENT ON COLUMN sensor_readings.turbidity IS 'Water turbidity in NTU (Nephelometric Turbidity Units)';
COMMENT ON COLUMN sensor_readings.temperature IS 'Water temperature in degrees Celsius';
COMMENT ON COLUMN sensor_readings.tds IS 'Total Dissolved Solids in parts per million (ppm)';
COMMENT ON COLUMN sensor_readings.status IS 'Overall water quality status: Good, Warning, or Critical';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Table sensor_readings created successfully!';
    RAISE NOTICE 'Realtime enabled - your dashboard will receive updates automatically';
    RAISE NOTICE 'RLS policies configured for secure access';
END $$;
