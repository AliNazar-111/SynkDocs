-- ========================================================
-- FIX: REDIRECT FOREIGN KEYS TO PROFILES TABLE
-- ========================================================
-- This script updates the foreign keys in comments and document_versions
-- to point to public.profiles instead of auth.users.
-- This is necessary for Supabase's join syntax to work.
-- ========================================================

-- 1. Update Comments table
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_user_id_fkey,
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 2. Update Document Versions table
ALTER TABLE public.document_versions 
DROP CONSTRAINT IF EXISTS document_versions_created_by_fkey,
ADD CONSTRAINT document_versions_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 3. Update Resolved By (if used)
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_resolved_by_fkey,
ADD CONSTRAINT comments_resolved_by_fkey 
FOREIGN KEY (resolved_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- 4. Re-verify RLS (should be fine as they use auth.uid() mostly)
-- But ensuring profiles are available to the join
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Policy already exists from 01_schema but let's be sure
DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
CREATE POLICY "select_profiles" ON public.profiles FOR SELECT USING (true);

SELECT 'Relationships fixed! Please refresh your browser.' as status;
