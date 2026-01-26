-- disable_kml_overlays_rls.sql
-- Run this in the Supabase SQL editor to disable Row Level Security
-- and remove policies for the `public.kml_overlays` table.
-- WARNING: Disabling RLS reduces database-level access controls.
--          Make sure you understand the security implications.

BEGIN;

-- Disable RLS (turns off policy enforcement for the table)
ALTER TABLE public.kml_overlays DISABLE ROW LEVEL SECURITY;

-- Remove known policies that might have been created previously
DROP POLICY IF EXISTS insert_own ON public.kml_overlays;
DROP POLICY IF EXISTS select_owner ON public.kml_overlays;
DROP POLICY IF EXISTS update_owner ON public.kml_overlays;
DROP POLICY IF EXISTS delete_owner ON public.kml_overlays;
DROP POLICY IF EXISTS select_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_delete_owner_or_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_insert_owner_or_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_overlays_delete_owner_or_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_overlays_insert_owner ON public.kml_overlays;
DROP POLICY IF EXISTS kml_overlays_select_owner_or_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_overlays_update_owner_or_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_select_owner_or_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_insert_owner_or_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_update_owner_or_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_delete_owner_or_admin ON public.kml_overlays;
DROP POLICY IF EXISTS kml_overlays_insert_owner ON public.kml_overlays;

COMMIT;

-- After running, try an upload. If uploads still fail, check
-- 1) the Supabase console > Authentication that the user is signed in
-- 2) that the anon key in `env-config.js` is correct
-- 3) Storage bucket permissions in Supabase Storage

-- To re-enable RLS later, run:
-- ALTER TABLE public.kml_overlays ENABLE ROW LEVEL SECURITY;
-- and recreate the desired policies (owner-based policies recommended).
