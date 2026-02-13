-- ============================================
-- SYNKDOCS RLS POLICIES - TRULY NON-CIRCULAR
-- ============================================
-- This version completely eliminates circular references
-- by making policies independent
-- ============================================

-- First, drop all existing policies
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
DROP POLICY IF EXISTS "version_config_select_policy" ON document_version_config;
DROP POLICY IF EXISTS "version_config_modify_policy" ON document_version_config;
DROP POLICY IF EXISTS "audit_log_select_policy" ON security_audit_log;

-- ============================================
-- STRATEGY: Use SECURITY DEFINER functions
-- These break the circular dependency chain
-- ============================================

-- Disable RLS temporarily to create functions
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_collaborators DISABLE ROW LEVEL SECURITY;

-- Function: Check if user owns document (no RLS check)
CREATE OR REPLACE FUNCTION auth.user_owns_document(doc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM documents
    WHERE id = doc_id
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function: Check if user is collaborator (no RLS check)
CREATE OR REPLACE FUNCTION auth.user_is_collaborator(doc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM document_collaborators
    WHERE document_id = doc_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function: Check if user has editor role (no RLS check)
CREATE OR REPLACE FUNCTION auth.user_is_editor(doc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM document_collaborators
    WHERE document_id = doc_id
    AND user_id = auth.uid()
    AND role IN ('editor', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Re-enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 1. DOCUMENTS TABLE RLS
-- ============================================

-- SELECT: Show owned docs OR docs where user is collaborator
CREATE POLICY "documents_select_policy"
  ON documents
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR auth.user_is_collaborator(id)
    )
  );

-- INSERT: Authenticated users can create
CREATE POLICY "documents_insert_policy"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
  );

-- UPDATE: Owners and editors can update
CREATE POLICY "documents_update_policy"
  ON documents
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR auth.user_is_editor(id)
    )
  );

-- DELETE: Only owners can soft-delete  
CREATE POLICY "documents_delete_policy"
  ON documents
  FOR DELETE
  USING (
    owner_id = auth.uid()
  );

-- ============================================
-- 2. DOCUMENT COLLABORATORS RLS
-- ============================================

-- SELECT: View if you own the doc OR you're the collaborator
CREATE POLICY "collaborators_select_policy"
  ON document_collaborators
  FOR SELECT
  USING (
    auth.user_owns_document(document_id)
    OR user_id = auth.uid()
  );

-- INSERT: Only document owners can add
CREATE POLICY "collaborators_insert_policy"
  ON document_collaborators
  FOR INSERT
  WITH CHECK (
    auth.user_owns_document(document_id)
  );

-- UPDATE: Only owners can change roles
CREATE POLICY "collaborators_update_policy"
  ON document_collaborators
  FOR UPDATE
  USING (
    auth.user_owns_document(document_id)
  );

-- DELETE: Owners can remove, users can leave
CREATE POLICY "collaborators_delete_policy"
  ON document_collaborators
  FOR DELETE
  USING (
    auth.user_owns_document(document_id)
    OR user_id = auth.uid()
  );

-- ============================================
-- 3. COMMENTS TABLE RLS
-- ============================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- SELECT: View comments on accessible documents
CREATE POLICY "comments_select_policy"
  ON comments
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      auth.user_owns_document(document_id)
      OR auth.user_is_collaborator(document_id)
    )
  );

-- INSERT: Editors can create
CREATE POLICY "comments_insert_policy"
  ON comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      auth.user_owns_document(document_id)
      OR auth.user_is_editor(document_id)
    )
  );

-- UPDATE: Own comments or editors can resolve
CREATE POLICY "comments_update_policy"
  ON comments
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR auth.user_owns_document(document_id)
      OR auth.user_is_editor(document_id)
    )
  );

-- DELETE: Own comments or owner
CREATE POLICY "comments_delete_policy"
  ON comments
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR auth.user_owns_document(document_id)
  );

-- ============================================
-- 4. DOCUMENT VERSIONS RLS
-- ============================================

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- SELECT: View versions of accessible docs
CREATE POLICY "versions_select_policy"
  ON document_versions
  FOR SELECT
  USING (
    auth.user_owns_document(document_id)
    OR auth.user_is_collaborator(document_id)
  );

-- INSERT: Editors can create
CREATE POLICY "versions_insert_policy"
  ON document_versions
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      auth.user_owns_document(document_id)
      OR auth.user_is_editor(document_id)
    )
  );

-- DELETE: Only owners
CREATE POLICY "versions_delete_policy"
  ON document_versions
  FOR DELETE
  USING (
    auth.user_owns_document(document_id)
  );

-- ============================================
-- 5. VERSION CONFIG RLS
-- ============================================

ALTER TABLE document_version_config ENABLE ROW LEVEL SECURITY;

-- SELECT: View if you have access
CREATE POLICY "version_config_select_policy"
  ON document_version_config
  FOR SELECT
  USING (
    auth.user_owns_document(document_id)
    OR auth.user_is_collaborator(document_id)
  );

-- INSERT/UPDATE/DELETE: Only owners
CREATE POLICY "version_config_modify_policy"
  ON document_version_config
  FOR ALL
  USING (
    auth.user_owns_document(document_id)
  )
  WITH CHECK (
    auth.user_owns_document(document_id)
  );

-- ============================================
-- 6. SECURITY AUDIT LOG RLS
-- ============================================

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: View own logs
CREATE POLICY "audit_log_select_policy"
  ON security_audit_log
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- ============================================
-- COMPLETE!
-- ============================================
-- This version uses SECURITY DEFINER functions
-- to break the circular dependency chain
-- Functions run without RLS, preventing recursion
