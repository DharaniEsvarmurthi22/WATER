-- Complete Multi-User System Setup
-- Each user has their own KML, devices, and data visualization
-- Admin can view any user's dashboard

-- ========================================
-- 1. USER PROFILES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ========================================
-- 2. DEVICES TABLE - Link devices to users
-- ========================================
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,  -- ESP32-SALEM-001
    device_name TEXT,                -- Friendly name
    device_password TEXT NOT NULL,   -- For claiming
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    kml_overlay_id UUID REFERENCES public.kml_overlays(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own devices
CREATE POLICY "Users can view own devices" ON public.devices
    FOR SELECT USING (owner_user_id = auth.uid());

-- Users can claim unclaimed devices
CREATE POLICY "Users can claim devices" ON public.devices
    FOR INSERT WITH CHECK (owner_user_id = auth.uid());

-- Users can update their own devices
CREATE POLICY "Users can update own devices" ON public.devices
    FOR UPDATE USING (owner_user_id = auth.uid());

-- Admins can view all devices
CREATE POLICY "Admins can view all devices" ON public.devices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ========================================
-- 3. UPDATE KML_OVERLAYS TABLE
-- ========================================
-- Ensure kml_overlays has proper structure
ALTER TABLE public.kml_overlays 
ADD COLUMN IF NOT EXISTS linked_device_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kml_overlays_owner ON public.kml_overlays(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_kml_overlays_device ON public.kml_overlays(linked_device_id);

-- ========================================
-- 4. UPDATE SENSOR_READINGS TABLE
-- ========================================
-- Link readings to both device and user
ALTER TABLE public.sensor_readings 
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- Create index for user filtering
CREATE INDEX IF NOT EXISTS idx_sensor_readings_owner ON public.sensor_readings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_owner ON public.sensor_readings(device_id, owner_user_id);

-- Update RLS for sensor_readings
DROP POLICY IF EXISTS "ESP32 can insert sensor readings" ON public.sensor_readings;
DROP POLICY IF EXISTS "Anyone can read sensor readings" ON public.sensor_readings;

-- ESP32 devices can insert readings (no owner yet)
CREATE POLICY "ESP32 can insert sensor readings" ON public.sensor_readings
    FOR INSERT WITH CHECK (true);

-- Users can only see readings from their devices
CREATE POLICY "Users see own device readings" ON public.sensor_readings
    FOR SELECT USING (
        device_id IN (
            SELECT device_id FROM public.devices
            WHERE owner_user_id = auth.uid()
        )
    );

-- Admins can see all readings
CREATE POLICY "Admins see all readings" ON public.sensor_readings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ========================================
-- 5. FUNCTION: Claim Device
-- ========================================
CREATE OR REPLACE FUNCTION claim_device(
    p_device_id TEXT,
    p_device_password TEXT,
    p_device_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_device_exists BOOLEAN;
    v_already_claimed BOOLEAN;
    v_password_match BOOLEAN;
    v_result JSON;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not authenticated'
        );
    END IF;

    -- Check if device exists in devices table
    SELECT EXISTS(SELECT 1 FROM public.devices WHERE device_id = p_device_id)
    INTO v_device_exists;

    IF NOT v_device_exists THEN
        -- Device doesn't exist, create it
        INSERT INTO public.devices (
            device_id,
            device_name,
            device_password,
            owner_user_id,
            claimed_at
        ) VALUES (
            p_device_id,
            COALESCE(p_device_name, p_device_id),
            p_device_password,
            v_user_id,
            NOW()
        );

        -- Update sensor_readings to link to this user
        UPDATE public.sensor_readings
        SET owner_user_id = v_user_id
        WHERE device_id = p_device_id
          AND owner_user_id IS NULL;

        RETURN json_build_object(
            'success', true,
            'message', 'Device claimed successfully',
            'device_id', p_device_id
        );
    ELSE
        -- Device exists, check if already claimed
        SELECT 
            owner_user_id IS NOT NULL,
            device_password = p_device_password
        INTO v_already_claimed, v_password_match
        FROM public.devices
        WHERE device_id = p_device_id;

        IF v_already_claimed THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Device already claimed by another user'
            );
        END IF;

        IF NOT v_password_match THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Incorrect device password'
            );
        END IF;

        -- Claim the device
        UPDATE public.devices
        SET 
            owner_user_id = v_user_id,
            device_name = COALESCE(p_device_name, device_name),
            claimed_at = NOW()
        WHERE device_id = p_device_id;

        -- Update sensor_readings
        UPDATE public.sensor_readings
        SET owner_user_id = v_user_id
        WHERE device_id = p_device_id
          AND owner_user_id IS NULL;

        RETURN json_build_object(
            'success', true,
            'message', 'Device claimed successfully',
            'device_id', p_device_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. FUNCTION: Link Device to KML
-- ========================================
CREATE OR REPLACE FUNCTION link_device_to_kml(
    p_device_id TEXT,
    p_kml_overlay_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_owns_device BOOLEAN;
    v_owns_kml BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if user owns the device
    SELECT EXISTS(
        SELECT 1 FROM public.devices
        WHERE device_id = p_device_id AND owner_user_id = v_user_id
    ) INTO v_owns_device;

    -- Check if user owns the KML
    SELECT EXISTS(
        SELECT 1 FROM public.kml_overlays
        WHERE id = p_kml_overlay_id AND owner_user_id = v_user_id
    ) INTO v_owns_kml;

    IF NOT v_owns_device THEN
        RETURN json_build_object('success', false, 'message', 'Device not owned by user');
    END IF;

    IF NOT v_owns_kml THEN
        RETURN json_build_object('success', false, 'message', 'KML not owned by user');
    END IF;

    -- Link device to KML
    UPDATE public.devices
    SET kml_overlay_id = p_kml_overlay_id,
        updated_at = NOW()
    WHERE device_id = p_device_id;

    -- Also update KML with device reference
    UPDATE public.kml_overlays
    SET linked_device_id = p_device_id,
        updated_at = NOW()
    WHERE id = p_kml_overlay_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Device linked to KML successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. FUNCTION: Admin - Get All Users
-- ========================================
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    device_count BIGINT,
    kml_count BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin only';
    END IF;

    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.full_name,
        up.role,
        COUNT(DISTINCT d.id) as device_count,
        COUNT(DISTINCT k.id) as kml_count,
        up.created_at
    FROM public.user_profiles up
    LEFT JOIN public.devices d ON d.owner_user_id = up.id
    LEFT JOIN public.kml_overlays k ON k.owner_user_id = up.id
    GROUP BY up.id, up.email, up.full_name, up.role, up.created_at
    ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. TRIGGER: Auto-create user profile
-- ========================================
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        'user'  -- Default role
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- ========================================
-- 9. GRANT PERMISSIONS
-- ========================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.devices TO authenticated;
GRANT ALL ON public.kml_overlays TO authenticated;
GRANT INSERT, SELECT ON public.sensor_readings TO anon, authenticated;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Multi-User System Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Created:';
    RAISE NOTICE '   - user_profiles table (user management)';
    RAISE NOTICE '   - devices table (device ownership)';
    RAISE NOTICE '   - Updated kml_overlays (device linking)';
    RAISE NOTICE '   - Updated sensor_readings (user filtering)';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Security:';
    RAISE NOTICE '   - Row Level Security enabled';
    RAISE NOTICE '   - Users see only their own data';
    RAISE NOTICE '   - Admins can view all users';
    RAISE NOTICE '';
    RAISE NOTICE '⚙️  Functions:';
    RAISE NOTICE '   - claim_device(device_id, password)';
    RAISE NOTICE '   - link_device_to_kml(device_id, kml_id)';
    RAISE NOTICE '   - admin_get_all_users()';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next Steps:';
    RAISE NOTICE '   1. Make your account admin: UPDATE user_profiles SET role = ''admin'' WHERE email = ''your@email.com'';';
    RAISE NOTICE '   2. Update frontend to use new claim_device function';
    RAISE NOTICE '   3. Test device claiming and KML linking';
    RAISE NOTICE '';
END $$;
