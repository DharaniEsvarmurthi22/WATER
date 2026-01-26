-- Check what claim_device functions exist in Supabase
-- Run this in Supabase SQL Editor

SELECT 
    routine_name,
    string_agg(parameter_name || ' ' || p.data_type, ', ' ORDER BY ordinal_position) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
    ON r.specific_name = p.specific_name
WHERE routine_schema = 'public' 
    AND routine_name = 'claim_device'
    AND parameter_mode = 'IN'
GROUP BY routine_name, r.specific_name;

-- If no results, the function doesn't exist. Run this to create it:
/*
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
        claimed_at = COALESCE(claimed_at, NOW()),
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

GRANT EXECUTE ON FUNCTION public.claim_device TO authenticated;
*/
