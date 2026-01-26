-- Fix claim_device to properly check plain text passwords
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.claim_device(p_device_identifier text, p_password text)
RETURNS TABLE(id uuid, device_identifier text, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_device_id UUID;
    v_device_identifier TEXT;
    v_user_id UUID;
    v_stored_secret TEXT;
    v_password_matches BOOLEAN := false;
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

    -- Check if stored secret is bcrypt hash (starts with $2 or $2a$ or $2b$)
    IF v_stored_secret LIKE '$2%' THEN
        -- Try bcrypt comparison
        BEGIN
            v_password_matches := (v_stored_secret = crypt(p_password, v_stored_secret));
        EXCEPTION WHEN OTHERS THEN
            v_password_matches := false;
        END;
    ELSE
        -- Plain text comparison
        v_password_matches := (v_stored_secret = p_password);
    END IF;

    IF NOT v_password_matches THEN
        RAISE EXCEPTION 'Invalid password for device: %', p_device_identifier;
    END IF;

    -- Claim the device (update user_id)
    UPDATE public.devices
    SET user_id = auth.uid(),
        claimed_at = COALESCE(claimed_at, NOW()),
        updated_at = NOW()
    WHERE devices.id = v_device_id;

    -- Return the claimed device
    RETURN QUERY
    SELECT v_device_id, v_device_identifier, auth.uid();
END;
$function$;
