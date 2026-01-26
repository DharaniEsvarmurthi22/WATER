-- ============================================
-- VERIFY USER-SPECIFIC SYSTEM SETUP
-- Check that all components are correctly configured
-- ============================================

-- 1. Check RLS is enabled on kml_overlays
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'kml_overlays';

-- 2. Show all RLS policies on kml_overlays
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' AND qual::text LIKE '%auth.uid()%' THEN '✅ User-specific'
        WHEN cmd = 'SELECT' AND qual::text LIKE '%admin%' THEN '✅ Admin access'
        WHEN cmd = 'INSERT' THEN '✅ Insert allowed'
        WHEN cmd = 'UPDATE' THEN '✅ Update allowed'
        WHEN cmd = 'DELETE' THEN '✅ Delete allowed'
        ELSE '⚠️  Check policy'
    END as policy_type
FROM pg_policies
WHERE tablename = 'kml_overlays'
ORDER BY policyname;

-- 3. Check users in system
SELECT 
    user_id,
    email,
    role,
    created_at
FROM public.user_profiles
ORDER BY created_at DESC;

-- 4. Check KML overlays with owner info
SELECT 
    ko.id,
    ko.name,
    ko.file_name,
    ko.device_identifier,
    ko.owner_user_id,
    up.email as owner_email,
    up.role as owner_role,
    ko.enabled,
    ko.created_at
FROM public.kml_overlays ko
LEFT JOIN public.user_profiles up ON up.user_id = ko.owner_user_id
ORDER BY ko.created_at DESC
LIMIT 20;

-- 5. Check devices and their status
SELECT 
    d.device_identifier,
    d.name as device_name,
    CASE 
        WHEN d.user_id IS NULL THEN '❌ UNCLAIMED'
        ELSE '✅ CLAIMED'
    END as claim_status,
    up.email as claimed_by_email,
    CASE 
        WHEN d.kml_overlay_id IS NULL THEN '⚠️  No KML Link'
        ELSE '✅ KML Linked'
    END as kml_link_status,
    ko.name as linked_kml_name,
    d.claimed_at
FROM public.devices d
LEFT JOIN public.user_profiles up ON up.user_id = d.user_id
LEFT JOIN public.kml_overlays ko ON ko.id = d.kml_overlay_id
ORDER BY d.claimed_at DESC NULLS LAST;

-- 6. Check device linking functions exist
SELECT 
    routine_name,
    CASE 
        WHEN routine_name = 'claim_device' THEN '✅ Claim device function'
        WHEN routine_name = 'link_device_to_kml' THEN '✅ Link device to KML'
        WHEN routine_name = 'unlink_device_from_kml' THEN '✅ Unlink device'
        WHEN routine_name = 'get_device_details' THEN '✅ Get device details'
        WHEN routine_name = 'update_device' THEN '✅ Update device'
        WHEN routine_name = 'admin_reassign_device' THEN '✅ Admin reassign'
        ELSE routine_name
    END as function_purpose
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('claim_device', 'link_device_to_kml', 'unlink_device_from_kml', 
                         'get_device_details', 'update_device', 'admin_reassign_device')
ORDER BY routine_name;

-- 7. Show sensor readings count per device
SELECT 
    device_id,
    COUNT(*) as reading_count,
    MIN(timestamp) as first_reading,
    MAX(timestamp) as latest_reading
FROM public.sensor_readings
WHERE device_id IS NOT NULL
GROUP BY device_id
ORDER BY latest_reading DESC;

-- 8. System Status Summary
DO $$
DECLARE
    v_users INTEGER;
    v_kmls INTEGER;
    v_devices INTEGER;
    v_claimed INTEGER;
    v_linked INTEGER;
    v_readings INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_users FROM public.user_profiles;
    SELECT COUNT(*) INTO v_kmls FROM public.kml_overlays;
    SELECT COUNT(*) INTO v_devices FROM public.devices;
    SELECT COUNT(*) INTO v_claimed FROM public.devices WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO v_linked FROM public.devices WHERE kml_overlay_id IS NOT NULL;
    SELECT COUNT(*) INTO v_readings FROM public.sensor_readings WHERE device_id IS NOT NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '   USER-SPECIFIC SYSTEM STATUS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Users: %', v_users;
    RAISE NOTICE 'KML Overlays: %', v_kmls;
    RAISE NOTICE 'Total Devices: %', v_devices;
    RAISE NOTICE 'Claimed Devices: % (% unclaimed)', v_claimed, v_devices - v_claimed;
    RAISE NOTICE 'Devices Linked to KML: %', v_linked;
    RAISE NOTICE 'ESP32 Sensor Readings: %', v_readings;
    RAISE NOTICE '========================================';
    
    IF v_kmls = 0 THEN
        RAISE NOTICE '⚠️  WARNING: No KML files uploaded yet';
    END IF;
    
    IF v_claimed = 0 THEN
        RAISE NOTICE '⚠️  WARNING: No devices claimed yet';
    END IF;
    
    IF v_linked = 0 THEN
        RAISE NOTICE '⚠️  WARNING: No devices linked to KML regions';
    END IF;
    
    IF v_readings = 0 THEN
        RAISE NOTICE '⚠️  WARNING: No ESP32 sensor data received';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;
