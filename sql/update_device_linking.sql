-- ============================================
-- EDITABLE DEVICE LINKING SYSTEM
-- Allows one-time device claiming but editable later
-- Links devices to both KML and users
-- ============================================

-- DROP EXISTING FUNCTIONS (to avoid return type conflicts)
DROP FUNCTION IF EXISTS public.claim_device(text, text);
DROP FUNCTION IF EXISTS public.update_device(text, text, text);
DROP FUNCTION IF EXISTS public.unlink_device_from_kml(text);
DROP FUNCTION IF EXISTS public.link_device_to_kml(text, uuid);
DROP FUNCTION IF EXISTS public.get_device_details(text);
DROP FUNCTION IF EXISTS public.admin_reassign_device(text, uuid);

-- 1. Update claim_device function to prevent re-claiming by different users
-- but allow same user to re-claim (edit)
CREATE OR REPLACE FUNCTION public.claim_device(
    p_device_identifier text,
    p_secret text
)
RETURNS TABLE(
    id uuid,
    device_identifier text,
    device_name text,
    user_id uuid,
    claimed_at timestamptz
) AS $$
DECLARE
    v_device_record RECORD;
BEGIN
    -- Check if device exists and credentials match
    SELECT d.id, d.device_identifier, d.name, d.user_id, d.claimed_at
    INTO v_device_record
    FROM public.devices d
    WHERE d.device_identifier = p_device_identifier
      AND d.secret = p_secret;

    -- If device not found or wrong credentials
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid device identifier or password';
    END IF;

    -- Check if device is already claimed by ANOTHER user
    IF v_device_record.user_id IS NOT NULL 
       AND v_device_record.user_id != auth.uid() THEN
        RAISE EXCEPTION 'Device already claimed by another user. Contact admin to reassign.';
    END IF;

    -- Claim or update claim for current user
    UPDATE public.devices
    SET 
        user_id = auth.uid(),
        claimed_at = COALESCE(claimed_at, NOW()),  -- Keep original claim time if re-claiming
        updated_at = NOW()
    WHERE device_identifier = p_device_identifier
    RETURNING id, device_identifier, name, user_id, claimed_at
    INTO v_device_record;

    -- Return device info
    id := v_device_record.id;
    device_identifier := v_device_record.device_identifier;
    device_name := v_device_record.name;
    user_id := v_device_record.user_id;
    claimed_at := v_device_record.claimed_at;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_device TO authenticated;


-- 2. Function to update device details (edit claimed device)
CREATE OR REPLACE FUNCTION public.update_device(
    p_device_identifier text,
    p_device_name text DEFAULT NULL,
    p_location_id text DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_device_id uuid;
BEGIN
    -- Check if user owns this device
    SELECT id INTO v_device_id
    FROM public.devices
    WHERE device_identifier = p_device_identifier
      AND user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Device not found or not owned by you'
        );
    END IF;

    -- Update device details
    UPDATE public.devices
    SET 
        name = COALESCE(p_device_name, name),
        location_id = COALESCE(p_location_id, location_id),
        updated_at = NOW()
    WHERE id = v_device_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Device updated successfully',
        'device_id', v_device_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_device TO authenticated;


-- 3. Function to unlink device from KML (allows changing KML later)
CREATE OR REPLACE FUNCTION public.unlink_device_from_kml(
    p_device_identifier text
)
RETURNS JSON AS $$
DECLARE
    v_device_id uuid;
    v_kml_id uuid;
BEGIN
    -- Check if user owns this device
    SELECT id, kml_overlay_id INTO v_device_id, v_kml_id
    FROM public.devices
    WHERE device_identifier = p_device_identifier
      AND user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Device not found or not owned by you'
        );
    END IF;

    -- Unlink device from KML
    UPDATE public.devices
    SET 
        kml_overlay_id = NULL,
        updated_at = NOW()
    WHERE id = v_device_id;

    -- Also unlink KML from device
    IF v_kml_id IS NOT NULL THEN
        UPDATE public.kml_overlays
        SET 
            linked_device_id = NULL,
            device_identifier = NULL,
            updated_at = NOW()
        WHERE id = v_kml_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Device unlinked from KML successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.unlink_device_from_kml TO authenticated;


-- 4. Enhanced link_device_to_kml function with validation
CREATE OR REPLACE FUNCTION public.link_device_to_kml(
    p_device_identifier text,
    p_kml_overlay_id uuid
)
RETURNS JSON AS $$
DECLARE
    v_device_id uuid;
    v_user_id uuid;
    v_kml_owner uuid;
BEGIN
    v_user_id := auth.uid();

    -- Check if user owns the device
    SELECT id INTO v_device_id
    FROM public.devices
    WHERE device_identifier = p_device_identifier
      AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Device not found or not owned by you'
        );
    END IF;

    -- Check if user owns the KML
    SELECT owner_user_id INTO v_kml_owner
    FROM public.kml_overlays
    WHERE id = p_kml_overlay_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'KML overlay not found'
        );
    END IF;

    IF v_kml_owner != v_user_id THEN
        RETURN json_build_object(
            'success', false,
            'message', 'You do not own this KML overlay'
        );
    END IF;

    -- Link device to KML (both directions)
    UPDATE public.devices
    SET 
        kml_overlay_id = p_kml_overlay_id,
        updated_at = NOW()
    WHERE id = v_device_id;

    UPDATE public.kml_overlays
    SET 
        linked_device_id = p_device_identifier,
        device_identifier = p_device_identifier,
        updated_at = NOW()
    WHERE id = p_kml_overlay_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Device linked to KML successfully',
        'device_id', v_device_id,
        'kml_id', p_kml_overlay_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.link_device_to_kml TO authenticated;


-- 5. Function to get device details with KML info
CREATE OR REPLACE FUNCTION public.get_device_details(
    p_device_identifier text
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'device_id', d.id,
        'device_identifier', d.device_identifier,
        'device_name', d.name,
        'location_id', d.location_id,
        'claimed_at', d.claimed_at,
        'updated_at', d.updated_at,
        'kml_linked', d.kml_overlay_id IS NOT NULL,
        'kml_overlay', CASE 
            WHEN k.id IS NOT NULL THEN json_build_object(
                'id', k.id,
                'name', k.name,
                'file_name', k.file_name,
                'storage_path', k.storage_path
            )
            ELSE NULL
        END
    )
    INTO v_result
    FROM public.devices d
    LEFT JOIN public.kml_overlays k ON k.id = d.kml_overlay_id
    WHERE d.device_identifier = p_device_identifier
      AND d.user_id = auth.uid();

    IF v_result IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Device not found or not owned by you'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'device', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_device_details TO authenticated;


-- 6. Admin function to reassign device to another user
CREATE OR REPLACE FUNCTION public.admin_reassign_device(
    p_device_identifier text,
    p_new_user_id uuid
)
RETURNS JSON AS $$
DECLARE
    v_is_admin boolean;
    v_device_id uuid;
BEGIN
    -- Check if caller is admin
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Admin access required'
        );
    END IF;

    -- Update device owner
    UPDATE public.devices
    SET 
        user_id = p_new_user_id,
        updated_at = NOW()
    WHERE device_identifier = p_device_identifier
    RETURNING id INTO v_device_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Device not found'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Device reassigned successfully',
        'device_id', v_device_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_reassign_device TO authenticated;


-- 7. Ensure tables have all required columns
DO $$
BEGIN
    -- Add kml_overlay_id to devices if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'devices' 
          AND column_name = 'kml_overlay_id'
    ) THEN
        ALTER TABLE public.devices 
        ADD COLUMN kml_overlay_id UUID REFERENCES public.kml_overlays(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added kml_overlay_id column to devices';
    END IF;

    -- Add name column if using old schema (device_name)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'devices' 
          AND column_name = 'name'
    ) THEN
        -- Check if device_name exists and rename it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' 
              AND table_name = 'devices' 
              AND column_name = 'device_name'
        ) THEN
            ALTER TABLE public.devices RENAME COLUMN device_name TO name;
            RAISE NOTICE 'Renamed device_name to name';
        ELSE
            ALTER TABLE public.devices ADD COLUMN name TEXT;
            RAISE NOTICE 'Added name column to devices';
        END IF;
    END IF;

    -- Add linked_device_id to kml_overlays if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'kml_overlays' 
          AND column_name = 'linked_device_id'
    ) THEN
        ALTER TABLE public.kml_overlays 
        ADD COLUMN linked_device_id TEXT;
        RAISE NOTICE 'Added linked_device_id column to kml_overlays';
    END IF;
END $$;


-- 8. Update RLS policies for editing
DROP POLICY IF EXISTS "Users can update own devices" ON public.devices;
CREATE POLICY "Users can update own devices" ON public.devices
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_user_kml ON public.devices(user_id, kml_overlay_id);
CREATE INDEX IF NOT EXISTS idx_kml_device_link ON public.kml_overlays(linked_device_id);


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check device schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'devices'
ORDER BY ordinal_position;

-- List all functions created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'claim_device',
      'update_device',
      'unlink_device_from_kml',
      'link_device_to_kml',
      'get_device_details',
      'admin_reassign_device'
  );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Editable device linking system installed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Available Functions:';
    RAISE NOTICE '   - claim_device(device_identifier, secret) - Claim device (one-time, editable by same user)';
    RAISE NOTICE '   - update_device(device_identifier, name, location_id) - Edit device details';
    RAISE NOTICE '   - link_device_to_kml(device_identifier, kml_id) - Link device to KML';
    RAISE NOTICE '   - unlink_device_from_kml(device_identifier) - Unlink device from KML';
    RAISE NOTICE '   - get_device_details(device_identifier) - Get full device info';
    RAISE NOTICE '   - admin_reassign_device(device_identifier, new_user_id) - Admin: reassign device';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security:';
    RAISE NOTICE '   - Users can only edit their own devices';
    RAISE NOTICE '   - Devices linked to both user and KML';
    RAISE NOTICE '   - One-time claim, but editable by owner';
    RAISE NOTICE '   - Admins can reassign devices between users';
END $$;
