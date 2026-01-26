-- Get the actual claim_device function code
-- Run this in Supabase SQL Editor

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'claim_device'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
