-- ============================================
-- SYNKDOCS CLEANUP: DROP ALL POLICIES
-- ============================================
-- This script will remove every policy from the 
-- main tables to ensure a clean state.
-- ============================================

DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN 
    FOR policy_record IN 
        SELECT policyname, tablename, schemaname
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
    END LOOP;
END $$;

-- Also drop triggers that might be causing issues
DROP TRIGGER IF EXISTS tr_sync_doc_permissions ON documents;
DROP TRIGGER IF EXISTS tr_sync_collab_permissions ON document_collaborators;
DROP FUNCTION IF EXISTS public.sync_document_permissions();
DROP FUNCTION IF EXISTS public.sync_collaborator_permissions();

-- Drop helper tables/views/functions from previous attempts
DROP VIEW IF EXISTS public.document_ownership_bypass;
DROP FUNCTION IF EXISTS public.is_document_owner(UUID);
DROP FUNCTION IF EXISTS public.user_owns_document(UUID);
DROP FUNCTION IF EXISTS public.user_is_collaborator(UUID);
DROP FUNCTION IF EXISTS public.user_is_editor(UUID);
DROP TABLE IF EXISTS public.document_permissions;

-- profiles cleanup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles;

SELECT 'All public policies, triggers, and helper objects have been dropped.' as status;
