-- Check if location names are set correctly
-- Each location should have its individual name, not "Nallampatti Cluster"

SELECT 
    location_id,
    name,
    latitude,
    longitude
FROM locations
ORDER BY name;

-- Expected results:
-- location_id       | name
-- ------------------|------------------
-- karipatti         | Karipatti
-- mallamooppampatti | Mallamooppampatti
-- nallampatti       | Nallampatti
-- poolampatti       | Poolampatti
-- thumbalpatti      | Thumbalpatti

-- If you see "Nallampatti Cluster" as the name, update them:
/*
UPDATE locations SET name = 'Karipatti' WHERE location_id = 'karipatti';
UPDATE locations SET name = 'Mallamooppampatti' WHERE location_id = 'mallamooppampatti';
UPDATE locations SET name = 'Nallampatti' WHERE location_id = 'nallampatti';
UPDATE locations SET name = 'Poolampatti' WHERE location_id = 'poolampatti';
UPDATE locations SET name = 'Thumbalpatti' WHERE location_id = 'thumbalpatti';
*/
