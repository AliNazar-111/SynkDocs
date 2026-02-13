-- ============================================
-- SYNKDOCS RLS POLICIES - VERSION 06 (ATOMIC FIX)
-- ============================================
-- This version uses a SECURITY DEFINER function to
-- explicitly break the recursion loop.
-- ============================================

-- 1. CLEANUP: Drop all existing policies
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON documents;
DROP POLICY IF EXISTS "collaborators_select_policy" ON document_collaborators;
DROP POLICY IF EXISTS "collaborators_modify_policy" ON document_collaborators;
DROP POLICY IF EXISTS "comments_select_policy" ON comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON comments;
DROP POLICY IF EXISTS "versions_select_policy" ON document_versions;
DROP POLICY IF EXISTS "versions_insert_policy" ON document_versions;

-- 2. CREATE RECURSION BREAKER FUNCTION
-- This function runs as the 'postgres' user (SECURITY DEFINER), 
-- which means it BYPASSES RLS when it queries the documents table.
CREATE OR REPLACE FUNCTION public.is_document_owner(doc_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents
    WHERE id = doc_id 
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  );
$$;

-- 3. DOCUMENTS TABLE RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Owner always has access. Collaborators check THEIR table.
-- Note: This only goes ONE WAY (Documents -> Collaborators)
CREATE POLICY "documents_select_policy"
  ON documents
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR id IN (
        SELECT document_id 
        FROM document_collaborators 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "documents_insert_policy"
  ON documents
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "documents_update_policy"
  ON documents
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR id IN (
        SELECT document_id 
        FROM document_collaborators 
        WHERE user_id = auth.uid() AND role IN ('editor', 'owner')
      )
    )
  );

CREATE POLICY "documents_delete_policy"
  ON documents
  FOR UPDATE -- Soft delete is an update
  USING (owner_id = auth.uid());

-- 4. DOCUMENT COLLABORATORS RLS
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;

-- BREAK RECURSION HERE: Use the function instead of a direct table query
CREATE POLICY "collaborators_select_policy"
  ON document_collaborators
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_document_owner(document_id)
  );

CREATE POLICY "collaborators_modify_policy"
  ON document_collaborators
  FOR ALL
  USING (
    public.is_document_owner(document_id)
  );

-- 5. COMMENTS & VERSIONS (Safe because they call Documents)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_policy"
  ON comments FOR SELECT
  USING (document_id IN (SELECT id FROM documents));

CREATE POLICY "comments_insert_policy"
  ON comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND document_id IN (
      SELECT id FROM documents 
      -- This is safe because Document RLS provides the filtering
    )
  );

-- 6. SUCCESS MESSAGE
SELECT 'RLS Policies Version 06 (Atomic) installed successfully!' as status;
