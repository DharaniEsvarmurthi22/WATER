-- ================================================================
-- SUPABASE STATUS CHECK - Run these queries in Supabase SQL Editor
-- Copy and paste the results back to me
-- ================================================================

-- 1. CHECK IF KML_OVERLAYS TABLE EXISTS
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'kml_overlays'
) as kml_table_exists;

-- 2. CHECK KML_OVERLAYS TABLE STRUCTURE
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'kml_overlays'
ORDER BY ordinal_position;

-- 3. CHECK UNIQUE CONSTRAINT FOR DEVICE REPLACEMENT
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'kml_overlays'
AND schemaname = 'public';

-- 4. CHECK RLS POLICIES ON KML_OVERLAYS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'kml_overlays';

-- 5. CHECK IF STORAGE BUCKET EXISTS
SELECT id, name, public, avif_autodetection, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name = 'kml-overlays';

-- 6. CHECK STORAGE BUCKET POLICIES (Skip if not accessible)
-- Note: Storage policies may not be directly queryable in all Supabase versions
-- Check manually in Supabase Dashboard > Storage > kml-overlays > Policies

-- 7. CHECK DEVICES TABLE (for device claiming)
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'devices'
) as devices_table_exists;

-- 8. CHECK DEVICES TABLE STRUCTURE (if exists)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'devices'
ORDER BY ordinal_position;

-- 9. CHECK SENSOR_READINGS TABLE STRUCTURE
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'sensor_readings'
ORDER BY ordinal_position;

-- 10. CHECK IF UPSERT_DEVICE_KML FUNCTION EXISTS
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'upsert_device_kml';

-- 11. COUNT EXISTING DATA
SELECT 
  'kml_overlays' as table_name,
  COUNT(*) as row_count
FROM kml_overlays
UNION ALL
SELECT 
  'devices' as table_name,
  COUNT(*) as row_count
FROM devices
UNION ALL
SELECT 
  'sensor_readings' as table_name,
  COUNT(*) as row_count
FROM sensor_readings;

-- 12. CHECK SAMPLE KML DATA (if any)
-- Only select columns that exist
SELECT *
FROM kml_overlays
ORDER BY created_at DESC
LIMIT 5;

-- ================================================================
-- COPY ALL RESULTS AND SEND TO ME
-- ================================================================
