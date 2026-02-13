-- ========================================================
-- SYNKDOCS CONSOLIDATED RLS POLICIES
-- ========================================================
-- This script cleans up and reapplies all RLS policies
-- using the "Flat Permission Table" pattern to prevent recursion.
-- ========================================================

-- 1. CLEANUP: Drop all existing policies to avoid "already exists" errors
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN 
    FOR policy_record IN 
        SELECT policyname, tablename, schemaname
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('documents', 'document_collaborators', 'comments', 'document_versions', 'profiles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
    END LOOP;
END $$;

-- 2. SETUP: Flat Permission Table
CREATE TABLE IF NOT EXISTS public.document_permissions (
    user_id UUID NOT NULL,
    document_id UUID NOT NULL,
    role TEXT NOT NULL,
    PRIMARY KEY (user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_permissions_lookup ON public.document_permissions(user_id, document_id);

-- 3. SYNC HELPERS (Security Definer)
CREATE OR REPLACE FUNCTION public.sync_document_permissions()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.document_permissions (user_id, document_id, role)
        VALUES (NEW.owner_id, NEW.id, 'owner')
        ON CONFLICT (user_id, document_id) DO UPDATE SET role = 'owner';
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.owner_id != NEW.owner_id) THEN
            DELETE FROM public.document_permissions WHERE user_id = OLD.owner_id AND document_id = OLD.id;
            INSERT INTO public.document_permissions (user_id, document_id, role)
            VALUES (NEW.owner_id, NEW.id, 'owner')
            ON CONFLICT (user_id, document_id) DO UPDATE SET role = 'owner';
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.document_permissions WHERE document_id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_collaborator_permissions()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        INSERT INTO public.document_permissions (user_id, document_id, role)
        VALUES (NEW.user_id, NEW.document_id, NEW.role)
        ON CONFLICT (user_id, document_id) DO UPDATE SET role = EXCLUDED.role;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.document_permissions 
        WHERE user_id = OLD.user_id 
        AND document_id = OLD.document_id
        AND role != 'owner';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Triggers
DROP TRIGGER IF EXISTS tr_sync_doc_permissions ON documents;
CREATE TRIGGER tr_sync_doc_permissions AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION public.sync_document_permissions();

DROP TRIGGER IF EXISTS tr_sync_collab_permissions ON document_collaborators;
CREATE TRIGGER tr_sync_collab_permissions AFTER INSERT OR UPDATE OR DELETE ON document_collaborators FOR EACH ROW EXECUTE FUNCTION public.sync_collaborator_permissions();

-- 4. RE-SYNC DATA
TRUNCATE public.document_permissions;
INSERT INTO public.document_permissions (user_id, document_id, role)
SELECT owner_id, id, 'owner' FROM documents;
INSERT INTO public.document_permissions (user_id, document_id, role)
SELECT user_id, document_id, role FROM document_collaborators
ON CONFLICT DO NOTHING;

-- 5. APPLY POLICIES

-- DOCUMENTS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_docs" ON documents FOR SELECT USING (owner_id = auth.uid() OR id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));
CREATE POLICY "insert_docs" ON documents FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update_docs" ON documents FOR UPDATE USING (owner_id = auth.uid() OR id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role IN ('owner', 'editor')));
CREATE POLICY "delete_docs_soft" ON documents FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "delete_docs_hard" ON documents FOR DELETE USING (owner_id = auth.uid());

-- PERMISSIONS TABLE (Security)
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_own_permissions" ON document_permissions FOR SELECT USING (user_id = auth.uid());

-- COLLABORATORS
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_collabs" ON document_collaborators FOR SELECT USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));
CREATE POLICY "modify_collabs" ON document_collaborators FOR ALL USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role = 'owner'));

-- COMMENTS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_comments" ON comments FOR SELECT USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));
CREATE POLICY "insert_comments" ON comments FOR INSERT WITH CHECK (user_id = auth.uid() AND document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role IN ('owner', 'editor')));
CREATE POLICY "update_comments" ON comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "delete_comments" ON comments FOR DELETE USING (user_id = auth.uid() OR document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role = 'owner'));

-- VERSIONS
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_versions" ON document_versions FOR SELECT USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));
CREATE POLICY "insert_versions" ON document_versions FOR INSERT WITH CHECK (created_by = auth.uid() AND document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role IN ('owner', 'editor')));

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

SELECT 'SynkDocs Policies Consolidated & Hardened Successfully!' as status;
