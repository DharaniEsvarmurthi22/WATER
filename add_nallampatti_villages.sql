-- Add Nallampatti and Surrounding Villages to Database
-- Run this in Supabase SQL Editor

-- Step 1: Add 7 new locations
INSERT INTO locations (name, latitude, longitude, city, district, state, country) VALUES
('Nallampatti', 11.5833, 78.1667, 'Nallampatti', 'Salem', 'Tamil Nadu', 'India'),
('Poolampatti', 11.6000, 78.1500, 'Poolampatti', 'Salem', 'Tamil Nadu', 'India'),
('Thumbalpatti', 11.5700, 78.2000, 'Thumbalpatti', 'Salem', 'Tamil Nadu', 'India'),
('Karipatti', 11.5500, 78.1800, 'Karipatti', 'Salem', 'Tamil Nadu', 'India'),
('Mallamooppampatti', 11.6100, 78.1800, 'Mallamooppampatti', 'Salem', 'Tamil Nadu', 'India'),
('Chinnamanaickenpatti', 11.5600, 78.1400, 'Chinnamanaickenpatti', 'Salem', 'Tamil Nadu', 'India'),
('Pappampalayam', 11.6200, 78.1600, 'Pappampalayam', 'Salem', 'Tamil Nadu', 'India');

-- Step 2: Add sensors for each location (4 sensors × 7 locations = 28 sensors)

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

-- Chinnamanaickenpatti Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'CHI_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Chinnamanaickenpatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'CHI_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Chinnamanaickenpatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'CHI_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Chinnamanaickenpatti';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'CHI_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Chinnamanaickenpatti';

-- Pappampalayam Sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'PAP_PH_001', id, 'pH', 'active' FROM locations WHERE name = 'Pappampalayam';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'PAP_TURB_001', id, 'turbidity', 'active' FROM locations WHERE name = 'Pappampalayam';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'PAP_TEMP_001', id, 'temperature', 'active' FROM locations WHERE name = 'Pappampalayam';

INSERT INTO sensors (sensor_id, location_id, sensor_type, status) 
SELECT 'PAP_TDS_001', id, 'tds', 'active' FROM locations WHERE name = 'Pappampalayam';

-- Step 3: Verify additions
SELECT 
    l.name as location,
    COUNT(s.id) as sensor_count,
    STRING_AGG(s.sensor_type, ', ') as sensor_types
FROM locations l
LEFT JOIN sensors s ON l.id = s.location_id
WHERE l.name IN ('Nallampatti', 'Poolampatti', 'Thumbalpatti', 'Karipatti', 
                 'Mallamooppampatti', 'Chinnamanaickenpatti', 'Pappampalayam')
GROUP BY l.name
ORDER BY l.name;
