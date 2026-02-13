-- ============================================
-- SYNKDOCS RLS POLICIES - VERSION 05 (NO RECURSION)
-- ============================================
-- This version uses a View to break the circular dependency
-- between documents and document_collaborators.
-- ============================================

-- 1. CLEANUP: Drop all existing policies and the bridge view
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON documents;
DROP POLICY IF EXISTS "collaborators_select_policy" ON document_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_policy" ON document_collaborators;
DROP POLICY IF EXISTS "collaborators_update_policy" ON document_collaborators;
DROP POLICY IF EXISTS "collaborators_delete_policy" ON document_collaborators;
DROP POLICY IF EXISTS "comments_select_policy" ON comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON comments;
DROP POLICY IF EXISTS "comments_update_policy" ON comments;
DROP POLICY IF EXISTS "comments_delete_policy" ON comments;
DROP POLICY IF EXISTS "versions_select_policy" ON document_versions;
DROP POLICY IF EXISTS "versions_insert_policy" ON document_versions;
DROP POLICY IF EXISTS "versions_delete_policy" ON document_versions;
DROP POLICY IF EXISTS "audit_log_select_policy" ON security_audit_log;

DROP VIEW IF EXISTS public.document_ownership_bypass;

-- 2. CREATE BYPASS VIEW
-- This view runs with 'security_invoker = false' (default), 
-- meaning it bypasses RLS of the underlying table.
CREATE VIEW public.document_ownership_bypass WITH (security_invoker = false) AS
SELECT id as doc_id, owner_id FROM public.documents;

-- 3. DOCUMENTS TABLE RLS
-- Owner can see, OR anyone in collaborators table can see.
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
  TO authenticated
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
  FOR DELETE
  USING (owner_id = auth.uid());

-- 4. DOCUMENT COLLABORATORS RLS
-- To break recursion, we check ownership via the BYPASS VIEW.
CREATE POLICY "collaborators_select_policy"
  ON document_collaborators
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR document_id IN (
      SELECT doc_id 
      FROM public.document_ownership_bypass 
      WHERE owner_id = auth.uid()
    )
  );

-- Only owners can manage collaborators
CREATE POLICY "collaborators_modify_policy"
  ON document_collaborators
  FOR ALL
  USING (
    document_id IN (
      SELECT doc_id 
      FROM public.document_ownership_bypass 
      WHERE owner_id = auth.uid()
    )
  );

-- 5. COMMENTS TABLE RLS
CREATE POLICY "comments_select_policy"
  ON comments
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND document_id IN (
      SELECT id FROM documents -- This triggers document RLS which is now safe
    )
  );

CREATE POLICY "comments_insert_policy"
  ON comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND document_id IN (
       SELECT id FROM documents WHERE owner_id = auth.uid()
       OR id IN (SELECT document_id FROM document_collaborators WHERE user_id = auth.uid() AND role IN ('editor', 'owner'))
    )
  );

-- 6. SUCCESS MESSAGE
SELECT 'RLS Policies Version 05 installed successfully!' as status;
