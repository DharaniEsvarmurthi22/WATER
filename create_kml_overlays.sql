-- create_kml_overlays.sql
-- Run this in Supabase SQL editor to create a table tracking uploaded KML overlays
-- Enhanced version with device_id linking and replace functionality

CREATE TABLE IF NOT EXISTS public.kml_overlays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  device_id text,
  device_identifier text,  -- Links to devices.device_identifier for claimed devices
  enabled boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kml_overlays_owner ON public.kml_overlays(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_kml_overlays_device_id ON public.kml_overlays(device_id);
CREATE INDEX IF NOT EXISTS idx_kml_overlays_device_identifier ON public.kml_overlays(device_identifier);

-- Unique constraint: one KML per device_identifier per owner (for replace functionality)
CREATE UNIQUE INDEX IF NOT EXISTS idx_kml_one_per_device_owner 
ON public.kml_overlays(owner_user_id, device_identifier) 
WHERE device_identifier IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kml_overlays_updated_at
BEFORE UPDATE ON public.kml_overlays
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Function to replace KML for a device (upsert)
CREATE OR REPLACE FUNCTION public.upsert_device_kml(
  p_owner_user_id uuid,
  p_device_identifier text,
  p_name text,
  p_file_name text,
  p_storage_path text,
  p_device_id text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_overlay_id uuid;
BEGIN
  -- Check if KML exists for this device and owner
  SELECT id INTO v_overlay_id
  FROM public.kml_overlays
  WHERE owner_user_id = p_owner_user_id
    AND device_identifier = p_device_identifier;
  
  IF v_overlay_id IS NOT NULL THEN
    -- Update existing KML
    UPDATE public.kml_overlays
    SET
      name = p_name,
      file_name = p_file_name,
      storage_path = p_storage_path,
      device_id = COALESCE(p_device_id, device_id),
      updated_at = now()
    WHERE id = v_overlay_id;
  ELSE
    -- Insert new KML
    INSERT INTO public.kml_overlays (
      owner_user_id,
      device_identifier,
      device_id,
      name,
      file_name,
      storage_path
    ) VALUES (
      p_owner_user_id,
      p_device_identifier,
      p_device_id,
      p_name,
      p_file_name,
      p_storage_path
    )
    RETURNING id INTO v_overlay_id;
  END IF;
  
  RETURN v_overlay_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_device_kml TO authenticated;

-- RLS Policies
ALTER TABLE public.kml_overlays ENABLE ROW LEVEL SECURITY;

-- Users can see their own overlays
CREATE POLICY "Users can view own KML overlays"
ON public.kml_overlays FOR SELECT
USING (auth.uid() = owner_user_id);

-- Users can insert their own overlays
CREATE POLICY "Users can insert own KML overlays"
ON public.kml_overlays FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

-- Users can update their own overlays
CREATE POLICY "Users can update own KML overlays"
ON public.kml_overlays FOR UPDATE
USING (auth.uid() = owner_user_id);

-- Users can delete their own overlays
CREATE POLICY "Users can delete own KML overlays"
ON public.kml_overlays FOR DELETE
USING (auth.uid() = owner_user_id);

-- Admins can see all overlays
CREATE POLICY "Admins can view all KML overlays"
ON public.kml_overlays FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Example insert (adjust user id/file)
-- INSERT INTO public.kml_overlays (owner_user_id, name, file_name, storage_path, device_identifier)
-- VALUES ('<user_uuid>', 'My Village KML', 'my_village.kml', 'kml-overlays/my_village.kml', 'ESP32_001');
