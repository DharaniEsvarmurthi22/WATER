-- Add Nallampatti Cluster Villages to Database
-- Run this in Supabase SQL Editor

-- Step 1: Add 5 new locations (from KML file)
INSERT INTO locations (location_id, name, latitude, longitude) VALUES
('kadambur', 'Kadambur', 11.502932739375, 78.6030587250022),
('naduvalur', 'Naduvalur', 11.5204425883932, 78.6634635980926),
('othiyathur', 'Othiyathur', 11.5464542713672, 78.6623850244919),
('manjini', 'Manjini', 11.5562889685432, 78.6328909103083),
('pungavadi', 'Pungavadi', 11.5293001109581, 78.6165547404336);

-- Step 2: Add sensors for each location (4 sensors × 5 locations = 20 sensors)

-- Kadambur Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'KAD_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Kadambur';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'KAD_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Kadambur';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'KAD_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Kadambur';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'KAD_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Kadambur';

-- Naduvalur Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'NAD_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Naduvalur';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'NAD_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Naduvalur';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'NAD_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Naduvalur';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'NAD_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Naduvalur';

-- Othiyathur Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'OTH_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Othiyathur';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'OTH_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Othiyathur';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'OTH_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Othiyathur';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'OTH_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Othiyathur';

-- Manjini Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'MAN_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Manjini';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'MAN_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Manjini';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'MAN_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Manjini';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'MAN_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Manjini';

-- Pungavadi Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'PUN_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Pungavadi';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'PUN_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Pungavadi';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'PUN_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Pungavadi';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'PUN_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Pungavadi';

-- Step 3: Verify additions
SELECT 
    l.name as location,
    COUNT(s.id) as sensor_count,
    STRING_AGG(s.sensor_type, ', ') as sensor_types
FROM locations l
LEFT JOIN sensors s ON l.id = s.location_id
WHERE l.name IN ('Kadambur', 'Naduvalur', 'Othiyathur', 'Manjini', 'Pungavadi')
GROUP BY l.name
ORDER BY l.name;
