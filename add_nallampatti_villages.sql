-- Add Nallampatti and Surrounding Villages to Database
-- Run this in Supabase SQL Editor

-- Step 1: Add 5 new locations
INSERT INTO locations (location_id, name, latitude, longitude) VALUES
('nallampatti', 'Nallampatti', 11.5833, 78.1667),
('poolampatti', 'Poolampatti', 11.6000, 78.1500),
('thumbalpatti', 'Thumbalpatti', 11.5700, 78.2000),
('karipatti', 'Karipatti', 11.5500, 78.1800),
('mallamooppampatti', 'Mallamooppampatti', 11.6100, 78.1800);

-- Step 2: Add sensors for each location (4 sensors × 5 locations = 20 sensors)

-- Nallampatti Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'NAL_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Nallampatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'NAL_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Nallampatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'NAL_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Nallampatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'NAL_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Nallampatti';

-- Poolampatti Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'POL_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Poolampatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'POL_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Poolampatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'POL_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Poolampatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'POL_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Poolampatti';

-- Thumbalpatti Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'THU_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Thumbalpatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'THU_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Thumbalpatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'THU_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Thumbalpatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'THU_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Thumbalpatti';

-- Karipatti Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'KAR_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Karipatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'KAR_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Karipatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'KAR_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Karipatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'KAR_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Karipatti';

-- Mallamooppampatti Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'MAL_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Mallamooppampatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'MAL_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Mallamooppampatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'MAL_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Mallamooppampatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'MAL_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Mallamooppampatti';

-- Step 3: Verify additions
SELECT 
    l.name as location,
    COUNT(s.id) as sensor_count,
    STRING_AGG(s.sensor_type, ', ') as sensor_types
FROM locations l
LEFT JOIN sensors s ON l.id = s.location_id
WHERE l.name IN ('Nallampatti', 'Poolampatti', 'Thumbalpatti', 'Karipatti', 'Mallamooppampatti')
GROUP BY l.name
ORDER BY l.name;
