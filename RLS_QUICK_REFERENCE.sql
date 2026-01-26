-- ============================================================================
-- RLS SYSTEM - QUICK REFERENCE SQL COMMANDS
-- ============================================================================
-- Copy and paste these commands for common operations
-- ============================================================================

-- ============================================================================
-- DEVICE ASSIGNMENT OPERATIONS
-- ============================================================================

-- 1. ASSIGN A DEVICE TO A USER
-- First, get the user's ID:
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Then assign:
SELECT assign_device_to_user(
    'user-uuid-here'::UUID,
    'ESP32_SALEM_01',
    'Salem Taluk Monitor',
    'Assigned for field deployment'
);

-- 2. REMOVE A DEVICE ASSIGNMENT
SELECT unassign_device('ESP32_SALEM_01');

-- 3. BULK ASSIGN MULTIPLE DEVICES TO ONE USER
DO $$
DECLARE
    v_user_id UUID := 'user-uuid-here';
BEGIN
    PERFORM assign_device_to_user(v_user_id, 'ESP32_01', 'Device 1');
    PERFORM assign_device_to_user(v_user_id, 'ESP32_02', 'Device 2');
    PERFORM assign_device_to_user(v_user_id, 'ESP32_03', 'Device 3');
    RAISE NOTICE 'Assigned 3 devices successfully';
END $$;

-- 4. REASSIGN A DEVICE TO DIFFERENT USER
SELECT assign_device_to_user(
    'new-user-uuid'::UUID,
    'ESP32_SALEM_01',
    'Salem Taluk Monitor',
    'Reassigned from previous user'
);
-- Note: This automatically removes the old assignment

-- ============================================================================
-- VIEW DEVICE INFORMATION
-- ============================================================================

-- 5. LIST ALL DEVICE ASSIGNMENTS
SELECT 
    da.device_id,
    da.device_name,
    up.email as assigned_to,
    up.full_name,
    up.role,
    da.assigned_at,
    da.notes
FROM device_assignments da
JOIN user_profiles up ON da.user_id = up.user_id
ORDER BY da.assigned_at DESC;

-- 6. LIST DEVICES FOR SPECIFIC USER
SELECT * FROM get_user_devices('user-uuid-here'::UUID);

-- 7. LIST UNASSIGNED DEVICES (devices with data but no assignment)
SELECT DISTINCT sr.device_id
FROM sensor_readings sr
WHERE NOT EXISTS (
    SELECT 1 FROM device_assignments da 
    WHERE da.device_id = sr.device_id
)
ORDER BY sr.device_id;

-- 8. COUNT DEVICES PER USER
SELECT 
    up.email,
    up.full_name,
    COUNT(da.device_id) as device_count,
    ARRAY_AGG(da.device_id ORDER BY da.device_id) as devices
FROM device_assignments da
JOIN user_profiles up ON da.user_id = up.user_id
GROUP BY up.email, up.full_name
ORDER BY device_count DESC;

-- ============================================================================
-- VIEW DATA STATISTICS
-- ============================================================================

-- 9. READINGS COUNT PER DEVICE
SELECT 
    device_id,
    device_name,
    COUNT(*) as total_readings,
    MAX(timestamp) as latest_reading,
    MIN(timestamp) as first_reading
FROM sensor_readings
GROUP BY device_id, device_name
ORDER BY latest_reading DESC;

-- 10. LATEST READING FOR EACH DEVICE
SELECT DISTINCT ON (device_id)
    device_id,
    device_name,
    water_level,
    ph,
    temperature,
    status,
    timestamp
FROM sensor_readings
ORDER BY device_id, timestamp DESC;

-- 11. DEVICES THAT HAVEN'T SENT DATA RECENTLY (24 hours)
SELECT 
    da.device_id,
    da.device_name,
    up.email as assigned_to,
    MAX(sr.timestamp) as last_reading
FROM device_assignments da
LEFT JOIN sensor_readings sr ON da.device_id = sr.device_id
JOIN user_profiles up ON da.user_id = up.user_id
GROUP BY da.device_id, da.device_name, up.email
HAVING MAX(sr.timestamp) < NOW() - INTERVAL '24 hours'
    OR MAX(sr.timestamp) IS NULL
ORDER BY last_reading DESC NULLS LAST;

-- 12. TOTAL READINGS IN LAST 24 HOURS
SELECT 
    device_id,
    COUNT(*) as readings_24h
FROM sensor_readings
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY device_id
ORDER BY readings_24h DESC;

-- ============================================================================
-- USER MANAGEMENT
-- ============================================================================

-- 13. LIST ALL USERS WITH DEVICE COUNTS
SELECT 
    up.user_id,
    up.email,
    up.full_name,
    up.role,
    up.created_at,
    COUNT(da.device_id) as device_count
FROM user_profiles up
LEFT JOIN device_assignments da ON up.user_id = da.user_id
GROUP BY up.user_id, up.email, up.full_name, up.role, up.created_at
ORDER BY device_count DESC;

-- 14. FIND USERS WITH NO DEVICES ASSIGNED
SELECT 
    up.user_id,
    up.email,
    up.full_name,
    up.role
FROM user_profiles up
WHERE NOT EXISTS (
    SELECT 1 FROM device_assignments da WHERE da.user_id = up.user_id
)
AND up.role != 'admin'
ORDER BY up.email;

-- 15. GET USER ID BY EMAIL
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'user@example.com';

-- ============================================================================
-- SECURITY & RLS VERIFICATION
-- ============================================================================

-- 16. CHECK RLS STATUS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('sensor_readings', 'device_assignments');
-- Both should show rowsecurity = true

-- 17. VIEW RLS POLICIES
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('sensor_readings', 'device_assignments')
ORDER BY tablename, policyname;

-- 18. TEST RLS AS SPECIFIC USER (Simulated)
-- This simulates what a user would see
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';
SELECT * FROM sensor_readings LIMIT 5;
-- Should only show data for user's assigned devices
RESET ROLE;

-- ============================================================================
-- DATA CLEANUP & MAINTENANCE
-- ============================================================================

-- 19. DELETE OLD READINGS (Keep last 30 days)
DELETE FROM sensor_readings
WHERE timestamp < NOW() - INTERVAL '30 days';

-- 20. DELETE READINGS FOR SPECIFIC DEVICE
DELETE FROM sensor_readings
WHERE device_id = 'ESP32_OLD_DEVICE';

-- 21. VACUUM AND ANALYZE (Optimize database)
VACUUM ANALYZE sensor_readings;
VACUUM ANALYZE device_assignments;

-- ============================================================================
-- MIGRATION & TROUBLESHOOTING
-- ============================================================================

-- 22. MIGRATE ASSIGNMENTS FROM KML_OVERLAYS
INSERT INTO device_assignments (user_id, device_id, device_name, notes)
SELECT DISTINCT
    owner_user_id,
    linked_device_id,
    'Migrated from KML: ' || file_name,
    'Auto-migrated on ' || NOW()
FROM kml_overlays
WHERE linked_device_id IS NOT NULL
  AND owner_user_id IS NOT NULL
ON CONFLICT (device_id) DO NOTHING;

-- 23. FIND DUPLICATE DEVICE IDs (Should be 0)
SELECT device_id, COUNT(*)
FROM device_assignments
GROUP BY device_id
HAVING COUNT(*) > 1;

-- 24. FIX ORPHANED ASSIGNMENTS (Users deleted but assignments remain)
DELETE FROM device_assignments
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 25. VERIFY DATA INTEGRITY
SELECT 
    'Total Devices' as metric,
    COUNT(DISTINCT device_id)::text as value
FROM device_assignments
UNION ALL
SELECT 
    'Total Readings' as metric,
    COUNT(*)::text as value
FROM sensor_readings
UNION ALL
SELECT 
    'Devices with Data' as metric,
    COUNT(DISTINCT device_id)::text as value
FROM sensor_readings
UNION ALL
SELECT 
    'Users with Devices' as metric,
    COUNT(DISTINCT user_id)::text as value
FROM device_assignments;

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

-- 26. INSERT TEST READING (For testing realtime)
INSERT INTO sensor_readings (
    device_id, device_name, latitude, longitude,
    water_level, ph, temperature, turbidity, tds, status
) VALUES (
    'ESP32_TEST',
    'Test Device',
    11.1234, 77.5678,
    85.5, 7.2, 28.3, 45.2, 350, 'active'
);

-- 27. GET RECENT READINGS (Last 10)
SELECT 
    device_id,
    water_level,
    ph,
    temperature,
    status,
    timestamp
FROM sensor_readings
ORDER BY timestamp DESC
LIMIT 10;

-- ============================================================================
-- EXPORT QUERIES
-- ============================================================================

-- 28. EXPORT DEVICE ASSIGNMENTS (CSV Format)
\copy (SELECT da.device_id, da.device_name, up.email, da.assigned_at FROM device_assignments da JOIN user_profiles up ON da.user_id = up.user_id) TO 'device_assignments.csv' CSV HEADER;

-- 29. EXPORT READINGS FOR DEVICE (CSV Format)
\copy (SELECT * FROM sensor_readings WHERE device_id = 'ESP32_SALEM_01' ORDER BY timestamp DESC LIMIT 1000) TO 'device_readings.csv' CSV HEADER;

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

-- 30. CHECK INDEX USAGE
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('sensor_readings', 'device_assignments')
ORDER BY idx_scan DESC;

-- 31. CHECK TABLE SIZE
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('sensor_readings', 'device_assignments')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- END OF QUICK REFERENCE
-- ============================================================================
-- For more detailed information, see:
-- - RLS_MIGRATION_GUIDE.md
-- - SETUP_RLS_SYSTEM.sql
-- - RLS_SYSTEM_COMPLETE.md
-- ============================================================================
