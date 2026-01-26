-- ============================================
-- FIX KML STORAGE & DEVICE LINKING ISSUES
-- Run this to ensure KML files persist and device linking works
-- ============================================

-- 1. ENSURE RLS IS ENABLED ON KML_OVERLAYS
ALTER TABLE public.kml_overlays ENABLE ROW LEVEL SECURITY;

-- 2. DROP OLD POLICIES (if any)
DROP POLICY IF EXISTS "Users can view own KML overlays" ON public.kml_overlays;
DROP POLICY IF EXISTS "Users can insert own KML overlays" ON public.kml_overlays;
DROP POLICY IF EXISTS "Users can update own KML overlays" ON public.kml_overlays;
DROP POLICY IF EXISTS "Users can delete own KML overlays" ON public.kml_overlays;
DROP POLICY IF EXISTS "Admins can view all KML overlays" ON public.kml_overlays;

-- 3. CREATE CORRECT RLS POLICIES
CREATE POLICY "Users can view own KML overlays"
ON public.kml_overlays FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert own KML overlays"
ON public.kml_overlays FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own KML overlays"
ON public.kml_overlays FOR UPDATE
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own KML overlays"
ON public.kml_overlays FOR DELETE
USING (auth.uid() = owner_user_id);

CREATE POLICY "Admins can view all KML overlays"
ON public.kml_overlays FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. SET DEVICE PASSWORD FOR CLAIMING
-- Replace 'YOUR_PASSWORD_HERE' with the password you want to use
UPDATE public.devices 
SET secret = crypt('12345678', gen_salt('bf'))
WHERE device_identifier = 'ESP32-SALEM-001';

-- 5. VERIFY KML TABLE STRUCTURE
DO $$
BEGIN
    -- Check if linked_device_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'kml_overlays' 
          AND column_name = 'linked_device_id'
    ) THEN
        ALTER TABLE public.kml_overlays 
        ADD COLUMN linked_device_id TEXT;
        RAISE NOTICE 'Added linked_device_id column';
    END IF;
    
    -- Check if device_identifier exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'kml_overlays' 
          AND column_name = 'device_identifier'
    ) THEN
        ALTER TABLE public.kml_overlays 
        ADD COLUMN device_identifier TEXT;
        RAISE NOTICE 'Added device_identifier column';
    END IF;
END $$;

-- 6. CHECK CURRENT DATA
DO $$
DECLARE
    v_kml_count INTEGER;
    v_device_count INTEGER;
    v_claimed_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '   SYSTEM STATUS CHECK';
    RAISE NOTICE '========================================';
    
    -- Count KML files
    SELECT COUNT(*) INTO v_kml_count FROM public.kml_overlays;
    RAISE NOTICE 'KML Files: %', v_kml_count;
    
    -- Count devices
    SELECT COUNT(*) INTO v_device_count FROM public.devices;
    RAISE NOTICE 'Total Devices: %', v_device_count;
    
    -- Count claimed devices
    SELECT COUNT(*) INTO v_claimed_count 
    FROM public.devices 
    WHERE user_id IS NOT NULL;
    RAISE NOTICE 'Claimed Devices: %', v_claimed_count;
    
    -- Count unclaimed devices
    RAISE NOTICE 'Unclaimed Devices: %', v_device_count - v_claimed_count;
    
    RAISE NOTICE '========================================';
END $$;

-- 7. SHOW EXISTING KML FILES
SELECT 
    id,
    name,
    file_name,
    owner_user_id,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kml_overlays' AND column_name = 'device_identifier'
    ) THEN device_identifier ELSE NULL END as device_identifier,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kml_overlays' AND column_name = 'linked_device_id'
    ) THEN linked_device_id ELSE NULL END as linked_device_id,
    enabled,
    created_at
FROM public.kml_overlays
ORDER BY created_at DESC;

-- 8. SHOW DEVICE STATUS
SELECT 
    device_identifier,
    name,
    CASE 
        WHEN user_id IS NULL THEN '❌ UNCLAIMED'
        ELSE '✅ CLAIMED'
    END as status,
    CASE 
        WHEN kml_overlay_id IS NULL THEN '⚠️  No KML'
        ELSE '✅ KML Linked'
    END as kml_status,
    user_id,
    claimed_at
FROM public.devices
ORDER BY claimed_at DESC NULLS LAST;

-- 9. SHOW RLS POLICIES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'kml_overlays'
ORDER BY policyname;
