-- ============================================
-- SUPABASE CONNECTION & TABLE CHECK
-- Run this in Supabase SQL Editor to verify setup
-- ============================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '   SUPABASE SETUP VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- 1. CHECK EXTENSIONS
    RAISE NOTICE '1. CHECKING EXTENSIONS...';
    
    SELECT COUNT(*) INTO v_count
    FROM pg_extension
    WHERE extname = 'pgcrypto';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ pgcrypto extension installed';
    ELSE
        RAISE NOTICE '   ❌ pgcrypto extension NOT installed';
    END IF;
    
    RAISE NOTICE '';

    -- 2. CHECK TABLES
    RAISE NOTICE '2. CHECKING TABLES...';
    
    -- Check user_profiles
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ user_profiles table exists';
        SELECT COUNT(*) INTO v_count FROM public.user_profiles;
        RAISE NOTICE '      Records: %', v_count;
    ELSE
        RAISE NOTICE '   ❌ user_profiles table NOT found';
    END IF;
    
    -- Check devices
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'devices';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ devices table exists';
        SELECT COUNT(*) INTO v_count FROM public.devices;
        RAISE NOTICE '      Records: %', v_count;
    ELSE
        RAISE NOTICE '   ❌ devices table NOT found';
    END IF;
    
    -- Check kml_overlays
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'kml_overlays';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ kml_overlays table exists';
        SELECT COUNT(*) INTO v_count FROM public.kml_overlays;
        RAISE NOTICE '      Records: %', v_count;
    ELSE
        RAISE NOTICE '   ❌ kml_overlays table NOT found';
    END IF;
    
    -- Check sensor_readings
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sensor_readings';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ sensor_readings table exists';
        SELECT COUNT(*) INTO v_count FROM public.sensor_readings;
        RAISE NOTICE '      Records: %', v_count;
    ELSE
        RAISE NOTICE '   ❌ sensor_readings table NOT found';
    END IF;
    
    RAISE NOTICE '';

    -- 3. CHECK FUNCTIONS
    RAISE NOTICE '3. CHECKING FUNCTIONS...';
    
    -- Check claim_device
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
      AND routine_name = 'claim_device'
      AND routine_type = 'FUNCTION';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ claim_device() function exists';
    ELSE
        RAISE NOTICE '   ❌ claim_device() function NOT found';
    END IF;
    
    -- Check update_device
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
      AND routine_name = 'update_device'
      AND routine_type = 'FUNCTION';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ update_device() function exists';
    ELSE
        RAISE NOTICE '   ❌ update_device() function NOT found';
    END IF;
    
    -- Check link_device_to_kml
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
      AND routine_name = 'link_device_to_kml'
      AND routine_type = 'FUNCTION';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ link_device_to_kml() function exists';
    ELSE
        RAISE NOTICE '   ❌ link_device_to_kml() function NOT found';
    END IF;
    
    -- Check get_user_devices
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
      AND routine_name = 'get_user_devices'
      AND routine_type = 'FUNCTION';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ get_user_devices() function exists';
    ELSE
        RAISE NOTICE '   ❌ get_user_devices() function NOT found';
    END IF;
    
    -- Check upsert_device_kml
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
      AND routine_name = 'upsert_device_kml'
      AND routine_type = 'FUNCTION';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ upsert_device_kml() function exists';
    ELSE
        RAISE NOTICE '   ❌ upsert_device_kml() function NOT found';
    END IF;
    
    RAISE NOTICE '';

    -- 4. CHECK CRITICAL COLUMNS
    RAISE NOTICE '4. CHECKING CRITICAL COLUMNS...';
    
    -- Check devices columns
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'devices'
      AND column_name = 'device_identifier';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ devices.device_identifier exists';
    ELSE
        RAISE NOTICE '   ❌ devices.device_identifier NOT found';
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'devices'
      AND column_name = 'user_id';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ devices.user_id exists';
    ELSE
        RAISE NOTICE '   ❌ devices.user_id NOT found';
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'devices'
      AND column_name = 'kml_overlay_id';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ devices.kml_overlay_id exists';
    ELSE
        RAISE NOTICE '   ❌ devices.kml_overlay_id NOT found';
    END IF;
    
    -- Check kml_overlays columns
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'kml_overlays'
      AND column_name = 'device_identifier';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ kml_overlays.device_identifier exists';
    ELSE
        RAISE NOTICE '   ❌ kml_overlays.device_identifier NOT found';
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'kml_overlays'
      AND column_name = 'owner_user_id';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ kml_overlays.owner_user_id exists';
    ELSE
        RAISE NOTICE '   ❌ kml_overlays.owner_user_id NOT found';
    END IF;
    
    RAISE NOTICE '';

    -- 5. CHECK RLS POLICIES
    RAISE NOTICE '5. CHECKING ROW LEVEL SECURITY...';
    
    -- Check if RLS is enabled on devices
    SELECT COUNT(*) INTO v_count
    FROM pg_tables
    WHERE schemaname = 'public' 
      AND tablename = 'devices'
      AND rowsecurity = true;
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ RLS enabled on devices table';
    ELSE
        RAISE NOTICE '   ⚠️  RLS NOT enabled on devices table';
    END IF;
    
    -- Check if RLS is enabled on kml_overlays
    SELECT COUNT(*) INTO v_count
    FROM pg_tables
    WHERE schemaname = 'public' 
      AND tablename = 'kml_overlays'
      AND rowsecurity = true;
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ RLS enabled on kml_overlays table';
    ELSE
        RAISE NOTICE '   ⚠️  RLS NOT enabled on kml_overlays table';
    END IF;
    
    -- Count policies on devices
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'devices';
    
    RAISE NOTICE '   📋 devices table has % policies', v_count;
    
    -- Count policies on kml_overlays
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'kml_overlays';
    
    RAISE NOTICE '   📋 kml_overlays table has % policies', v_count;
    
    RAISE NOTICE '';

    -- 6. CHECK INDEXES
    RAISE NOTICE '6. CHECKING INDEXES...';
    
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'public' 
      AND tablename = 'devices'
      AND indexname LIKE '%device_identifier%';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ Index on devices.device_identifier exists';
    ELSE
        RAISE NOTICE '   ⚠️  No index on devices.device_identifier';
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'public' 
      AND tablename = 'kml_overlays'
      AND indexname LIKE '%device_identifier%';
    
    IF v_count > 0 THEN
        RAISE NOTICE '   ✅ Index on kml_overlays.device_identifier exists';
    ELSE
        RAISE NOTICE '   ⚠️  No index on kml_overlays.device_identifier';
    END IF;
    
    RAISE NOTICE '';

    -- 7. SUMMARY
    RAISE NOTICE '========================================';
    RAISE NOTICE '   VERIFICATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'If you see ❌ marks, run the appropriate setup scripts:';
    RAISE NOTICE '  - sql/update_device_linking.sql';
    RAISE NOTICE '  - create_kml_overlays.sql';
    RAISE NOTICE '  - create_user_profiles.sql';
    RAISE NOTICE '';
    
END $$;

-- ============================================
-- DETAILED TABLE INFORMATION
-- ============================================

-- Show devices table schema
SELECT 
    'devices' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'devices'
ORDER BY ordinal_position;

-- Show kml_overlays table schema
SELECT 
    'kml_overlays' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'kml_overlays'
ORDER BY ordinal_position;

-- Show available functions
SELECT 
    routine_name as function_name,
    routine_type as type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'claim_device',
      'update_device',
      'link_device_to_kml',
      'unlink_device_from_kml',
      'get_device_details',
      'get_user_devices',
      'upsert_device_kml',
      'admin_reassign_device'
  )
ORDER BY routine_name;
