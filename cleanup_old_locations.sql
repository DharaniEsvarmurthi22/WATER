-- Cleanup Nallampatti Locations from Database
-- Run this in Supabase SQL Editor to remove Nallampatti test data

-- Step 1: Delete sensor readings for old locations
DELETE FROM sensor_readings 
WHERE sensor_id IN (
    SELECT sensor_id FROM sensors 
    WHERE location_id IN (
        SELECT id FROM locations 
        WHERE name IN ('Nallampatti', 'Poolampatti', 'Thumbalpatti', 'Karipatti', 'Mallamooppampatti', 'Kondappanaickenpatti', 'Koneripatti')
    )
);

-- Step 2: Delete sensors for old locations
DELETE FROM sensors 
WHERE location_id IN (
    SELECT id FROM locations 
    WHERE name IN ('Nallampatti', 'Poolampatti', 'Thumbalpatti', 'Karipatti', 'Mallamooppampatti', 'Kondappanaickenpatti', 'Koneripatti')
);

-- Step 3: Delete old locations (keep only 5 new villages)
DELETE FROM locations 
WHERE name IN ('Nallampatti', 'Poolampatti', 'Thumbalpatti', 'Karipatti', 'Mallamooppampatti', 'Kondappanaickenpatti', 'Koneripatti');

-- Step 4: Verify remaining locations
SELECT 
    l.name as location,
    COUNT(s.id) as sensor_count
FROM locations l
LEFT JOIN sensors s ON l.id = s.location_id
GROUP BY l.name
ORDER BY l.name;
