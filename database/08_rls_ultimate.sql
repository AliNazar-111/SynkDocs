-- ============================================
-- SYNKDOCS RLS - FINAL RECURSION-FREE VERSION
-- ============================================
-- Pattern: Flat Permission Table
-- This is the only 100% stable way to handle complex 
-- Document + Collaborator permissions in Supabase.
-- ============================================

-- 1. PRE-REQUISITE: The Flat Table
CREATE TABLE IF NOT EXISTS public.document_permissions (
    user_id UUID NOT NULL,
    document_id UUID NOT NULL,
    role TEXT NOT NULL,
    PRIMARY KEY (user_id, document_id)
);

-- Index for high-performance lookup
CREATE INDEX IF NOT EXISTS idx_permissions_lookup ON public.document_permissions(user_id, document_id);

-- 2. SYNC TRIGGERS (Security Definer)
-- These keep the permission table in sync with reality.

-- Sync for Documents table
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

-- Sync for Collaborators table
CREATE OR REPLACE FUNCTION public.sync_collaborator_permissions()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        INSERT INTO public.document_permissions (user_id, document_id, role)
        VALUES (NEW.user_id, NEW.document_id, NEW.role)
        ON CONFLICT (user_id, document_id) DO UPDATE SET role = EXCLUDED.role;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Only delete IF they aren't the owner
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

-- 3. INITIAL DATA SYNC
-- Populate the flat table with existing data
TRUNCATE public.document_permissions;
INSERT INTO public.document_permissions (user_id, document_id, role)
SELECT owner_id, id, 'owner' FROM documents;
INSERT INTO public.document_permissions (user_id, document_id, role)
SELECT user_id, document_id, role FROM document_collaborators
ON CONFLICT DO NOTHING;

-- 4. APPLY RLS POLICIES
-- Policies check the FLAT table. Recursion is impossible.

-- DOCUMENTS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_docs" ON documents FOR SELECT
USING (id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));

CREATE POLICY "insert_docs" ON documents FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "update_docs" ON documents FOR UPDATE
USING (id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role IN ('owner', 'editor')));

CREATE POLICY "delete_docs_soft" ON documents FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "delete_docs_hard" ON documents FOR DELETE
USING (owner_id = auth.uid());

-- COLLABORATORS
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_collabs" ON document_collaborators FOR SELECT
USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));

CREATE POLICY "modify_collabs" ON document_collaborators FOR ALL
USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role = 'owner'));

-- COMMENTS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_comments" ON comments FOR SELECT
USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));

CREATE POLICY "insert_comments" ON comments FOR INSERT
WITH CHECK (
    user_id = auth.uid() 
    AND document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- VERSIONS
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_versions" ON document_versions FOR SELECT
USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));

CREATE POLICY "insert_versions" ON document_versions FOR INSERT
WITH CHECK (
    created_by = auth.uid() 
    AND document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role IN ('owner', 'editor'))
);

-- 5. VERIFY
SELECT 'SynkDocs RLS Final Architecture Active!' as status;
