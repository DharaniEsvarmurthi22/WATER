-- Check if locations exist for Salem taluks
-- Run this in Supabase SQL Editor

SELECT location_id, name, metadata
FROM public.locations
WHERE location_id IN ('salemsouth', 'yercaud', 'sankari', 'edappadi', 'omalur', 'mettur')
ORDER BY location_id;

-- If no results, run this to create them:
/*
INSERT INTO public.locations (location_id, name, metadata, created_at)
VALUES
  ('salemsouth', 'Salem South', '{"taluk": "Salem South", "district": "Salem", "auto_created": false}'::jsonb, now()),
  ('yercaud', 'Yercaud', '{"taluk": "Yercaud", "district": "Salem", "auto_created": false}'::jsonb, now()),
  ('sankari', 'Sankari', '{"taluk": "Sankari", "district": "Salem", "auto_created": false}'::jsonb, now()),
  ('edappadi', 'Edappadi', '{"taluk": "Edappadi", "district": "Salem", "auto_created": false}'::jsonb, now()),
  ('omalur', 'Omalur', '{"taluk": "Omalur", "district": "Salem", "auto_created": false}'::jsonb, now()),
  ('mettur', 'Mettur', '{"taluk": "Mettur", "district": "Salem", "auto_created": false}'::jsonb, now())
ON CONFLICT (location_id) DO UPDATE SET
  name = EXCLUDED.name,
  metadata = EXCLUDED.metadata,
  updated_at = now();
*/
