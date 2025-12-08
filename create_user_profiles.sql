-- create_user_profiles.sql
-- Run this in your Supabase SQL editor to create a table for user profiles
-- Stores role and allowed overlays per authenticated user

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  role text DEFAULT 'user',
  allowed_overlays jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Optional index for lookup by auth user id
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Example: to give admin access to an existing user (replace user_uuid)
-- INSERT INTO public.user_profiles (user_id, email, role, allowed_overlays) VALUES ('<user_uuid>', 'admin@water.com', 'admin', '[]');
