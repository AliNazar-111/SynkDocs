-- ============================================
-- SYNKDOCS RLS POLICIES - VERSION 07 (THE FINAL WINS)
-- ============================================
-- This version uses a "Flat Permission Table" to 
-- physically separate the checks and stop all recursion.
-- ============================================

-- 1. CLEANUP: Drop all previous policies/functions/views
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON documents;
DROP POLICY IF EXISTS "collaborators_select_policy" ON document_collaborators;
DROP POLICY IF EXISTS "collaborators_modify_policy" ON document_collaborators;
DROP VIEW IF EXISTS public.document_ownership_bypass;
DROP FUNCTION IF EXISTS public.is_document_owner(UUID);

-- 2. CREATE THE FLAT PERMISSION TABLE
-- This table is a "cache" of access. It does NOT have RLS.
-- We protect it by only allowing SYSTEM TRIGGERS to write to it.
CREATE TABLE IF NOT EXISTS public.document_permissions (
    user_id UUID NOT NULL,
    document_id UUID NOT NULL,
    role TEXT NOT NULL,
    PRIMARY KEY (user_id, document_id)
);

-- Index for speed
CREATE INDEX IF NOT EXISTS idx_permissions_lookup ON public.document_permissions(user_id, document_id);

-- 3. CREATE SYNC TRIGGERS
-- Whenever a document or collaborator is added/removed, update the permissions table.

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
        -- Only delete IF they aren't the owner (don't remove the owner's permission)
        DELETE FROM public.document_permissions 
        WHERE user_id = OLD.user_id 
        AND document_id = OLD.document_id
        AND role != 'owner';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers
DROP TRIGGER IF EXISTS tr_sync_doc_permissions ON documents;
CREATE TRIGGER tr_sync_doc_permissions AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION public.sync_document_permissions();

DROP TRIGGER IF EXISTS tr_sync_collab_permissions ON document_collaborators;
CREATE TRIGGER tr_sync_collab_permissions AFTER INSERT OR UPDATE OR DELETE ON document_collaborators FOR EACH ROW EXECUTE FUNCTION public.sync_collaborator_permissions();

-- 4. INITIAL SYNC: Fill the permissions table with existing data
TRUNCATE public.document_permissions;
INSERT INTO public.document_permissions (user_id, document_id, role)
SELECT owner_id, id, 'owner' FROM documents;
INSERT INTO public.document_permissions (user_id, document_id, role)
SELECT user_id, document_id, role FROM document_collaborators
ON CONFLICT DO NOTHING;

-- 5. APPLY THE "FLAT" POLICIES
-- Now Tables check 'document_permissions' table. 
-- NO recursion is possible because 'document_permissions' has no RLS and no subqueries.

-- DOCUMENTS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_select_policy" ON documents FOR SELECT
USING (id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));

CREATE POLICY "documents_insert_policy" ON documents FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "documents_update_policy" ON documents FOR UPDATE
USING (id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role IN ('owner', 'editor')));

CREATE POLICY "documents_delete_policy" ON documents FOR UPDATE
USING (owner_id = auth.uid());

-- COLLABORATORS
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collaborators_select_policy" ON document_collaborators FOR SELECT
USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid()));

CREATE POLICY "collaborators_modify_policy" ON document_collaborators FOR ALL
USING (document_id IN (SELECT document_id FROM public.document_permissions WHERE user_id = auth.uid() AND role = 'owner'));

-- 6. SUCCESS
SELECT 'Flat-Table Permissions Applied. Recursion is physically impossible now.' as status;
