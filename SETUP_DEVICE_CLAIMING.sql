-- ============================================
-- COMPLETE DEVICE CLAIMING & LINKING SETUP
-- ============================================
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- 0. Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.claim_device(text, text);
DROP FUNCTION IF EXISTS public.link_device_to_kml(text, uuid);
DROP FUNCTION IF EXISTS public.unlink_device_from_kml(text);

-- 1. Create claim_device function (accepts p_password parameter)
CREATE OR REPLACE FUNCTION public.claim_device(
    p_device_identifier TEXT,
    p_password TEXT
)
RETURNS TABLE(id UUID, device_identifier TEXT, user_id UUID) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    v_device_id UUID;
    v_device_identifier TEXT;
    v_user_id UUID;
    v_stored_secret TEXT;
    v_password_matches BOOLEAN;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get device and check password
    SELECT d.id, d.device_identifier, d.secret, d.user_id
    INTO v_device_id, v_device_identifier, v_stored_secret, v_user_id
    FROM public.devices d
    WHERE d.device_identifier = p_device_identifier;

    -- Check if device exists
    IF v_device_id IS NULL THEN
        RAISE EXCEPTION 'Device not found: %', p_device_identifier;
    END IF;

    -- Check if already claimed by another user
    IF v_user_id IS NOT NULL AND v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Device already claimed by another user';
    END IF;

    -- Verify password (bcrypt or plain text comparison)
    -- Try bcrypt first, fall back to plain text
    BEGIN
        v_password_matches := (v_stored_secret = crypt(p_password, v_stored_secret));
    EXCEPTION WHEN OTHERS THEN
        -- If bcrypt fails, try plain text comparison
        v_password_matches := (v_stored_secret = p_password);
    END;

    IF NOT v_password_matches THEN
        RAISE EXCEPTION 'Invalid password for device: %', p_device_identifier;
    END IF;

    -- Claim the device (update user_id)
    UPDATE public.devices
    SET user_id = auth.uid(),
        updated_at = NOW()
    WHERE devices.id = v_device_id;

    -- Return the claimed device
    RETURN QUERY
    SELECT v_device_id, v_device_identifier, auth.uid();
END;
$$;

-- 2. Create link_device_to_kml function
CREATE OR REPLACE FUNCTION public.link_device_to_kml(
    p_device_identifier TEXT,
    p_kml_overlay_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_device_id UUID;
    v_kml_owner UUID;
    v_device_owner UUID;
BEGIN
    -- Get current user
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Check if device exists and get its owner
    SELECT id, user_id INTO v_device_id, v_device_owner
    FROM public.devices
    WHERE device_identifier = p_device_identifier;

    IF v_device_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Device not found'::TEXT;
        RETURN;
    END IF;

    -- Check if user owns the device
    IF v_device_owner != auth.uid() THEN
        RETURN QUERY SELECT FALSE, 'You do not own this device'::TEXT;
        RETURN;
    END IF;

    -- Check if KML overlay exists and user owns it
    SELECT owner_user_id INTO v_kml_owner
    FROM public.kml_overlays
    WHERE id = p_kml_overlay_id;

    IF v_kml_owner IS NULL THEN
        RETURN QUERY SELECT FALSE, 'KML overlay not found'::TEXT;
        RETURN;
    END IF;

    IF v_kml_owner != auth.uid() THEN
        RETURN QUERY SELECT FALSE, 'You do not own this KML overlay'::TEXT;
        RETURN;
    END IF;

    -- Link device to KML (update devices table)
    UPDATE public.devices
    SET kml_overlay_id = p_kml_overlay_id,
        updated_at = NOW()
    WHERE id = v_device_id;

    -- Also update kml_overlays table to track the device
    UPDATE public.kml_overlays
    SET device_identifier = p_device_identifier,
        updated_at = NOW()
    WHERE id = p_kml_overlay_id;

    RETURN QUERY SELECT TRUE, 'Device linked successfully'::TEXT;
END;
$$;

-- 3. Create unlink_device_from_kml function
CREATE OR REPLACE FUNCTION public.unlink_device_from_kml(
    p_device_identifier TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_device_id UUID;
    v_kml_overlay_id UUID;
BEGIN
    -- Check authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get device
    SELECT id, kml_overlay_id INTO v_device_id, v_kml_overlay_id
    FROM public.devices
    WHERE device_identifier = p_device_identifier
      AND user_id = auth.uid();

    IF v_device_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Device not found or not owned by you'::TEXT;
        RETURN;
    END IF;

    -- Unlink from devices table
    UPDATE public.devices
    SET kml_overlay_id = NULL,
        updated_at = NOW()
    WHERE id = v_device_id;

    -- Unlink from kml_overlays table
    IF v_kml_overlay_id IS NOT NULL THEN
        UPDATE public.kml_overlays
        SET device_identifier = NULL,
            updated_at = NOW()
        WHERE id = v_kml_overlay_id;
    END IF;

    RETURN QUERY SELECT TRUE, 'Device unlinked successfully'::TEXT;
END;
$$;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.claim_device TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_device_to_kml TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_device_from_kml TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'claim_device' AS function_name, COUNT(*) AS exists
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'claim_device'
UNION ALL
SELECT 'link_device_to_kml', COUNT(*)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'link_device_to_kml'
UNION ALL
SELECT 'unlink_device_from_kml', COUNT(*)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'unlink_device_from_kml';

-- Should return 3 rows with exists = 1
