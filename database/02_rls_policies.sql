-- ============================================
-- SYNKDOCS RLS POLICIES - COMPLETE MIGRATION
-- ============================================
-- Run this AFTER 01_schema.sql
-- ============================================

-- ============================================
-- 1. DOCUMENTS TABLE RLS
-- ============================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can view accessible documents
CREATE POLICY "users_can_view_accessible_documents"
  ON documents
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND user_has_document_access(id, auth.uid())
  );

-- Policy: INSERT - Users can create documents
CREATE POLICY "authenticated_users_can_create_documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND deleted_at IS NULL
  );

-- Policy: UPDATE - Editors can update documents
CREATE POLICY "editors_can_update_documents"
  ON documents
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND user_has_role(id, 'editor'::document_role, auth.uid())
  )
  WITH CHECK (
    deleted_at IS NULL
    AND owner_id = (SELECT owner_id FROM documents WHERE id = documents.id)
  );

-- Policy: SOFT DELETE - Only owners can soft-delete
CREATE POLICY "owners_can_soft_delete_documents"
  ON documents
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================
-- 2. DOCUMENT COLLABORATORS RLS
-- ============================================

ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - View collaborators of accessible docs
CREATE POLICY "users_can_view_collaborators_of_accessible_docs"
  ON document_collaborators
  FOR SELECT
  USING (
    user_has_document_access(document_id, auth.uid())
  );

-- Policy: INSERT - Owners can add collaborators
CREATE POLICY "owners_can_add_collaborators"
  ON document_collaborators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE id = document_id
        AND owner_id = auth.uid()
        AND deleted_at IS NULL
    )
    AND user_id != (
      SELECT owner_id FROM documents WHERE id = document_id
    )
  );

-- Policy: UPDATE - Owners can change roles
CREATE POLICY "owners_can_update_collaborator_roles"
  ON document_collaborators
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE id = document_id
        AND owner_id = auth.uid()
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE id = document_id
        AND owner_id = auth.uid()
        AND deleted_at IS NULL
    )
  );

-- Policy: DELETE - Owners can remove, users can leave
CREATE POLICY "owners_can_remove_collaborators_or_users_can_leave"
  ON document_collaborators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE id = document_id
        AND owner_id = auth.uid()
        AND deleted_at IS NULL
    )
    OR user_id = auth.uid()
  );

-- ============================================
-- 3. COMMENTS TABLE RLS
-- ============================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - View comments on accessible documents
CREATE POLICY "users_can_view_comments_on_accessible_docs"
  ON comments
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND user_has_document_access(document_id, auth.uid())
  );

-- Policy: INSERT - Editors can create comments
CREATE POLICY "editors_can_create_comments"
  ON comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND user_has_role(document_id, 'editor'::document_role, auth.uid())
  );

-- Policy: UPDATE - Users can edit own comments
CREATE POLICY "users_can_update_own_comments"
  ON comments
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND user_id = (SELECT user_id FROM comments WHERE id = comments.id)
  );

-- Policy: UPDATE (Resolve) - Editors can resolve comments
CREATE POLICY "editors_can_resolve_comments"
  ON comments
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND user_has_role(document_id, 'editor'::document_role, auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT user_id FROM comments WHERE id = comments.id)
    AND document_id = (SELECT document_id FROM comments WHERE id = comments.id)
  );

-- Policy: SOFT DELETE - Users delete own, owners delete any
CREATE POLICY "users_can_delete_own_comments_owners_can_delete_any"
  ON comments
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM documents
      WHERE id = document_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (true);

-- ============================================
-- 4. DOCUMENT VERSIONS RLS
-- ============================================

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - View versions of accessible documents
CREATE POLICY "users_can_view_versions_of_accessible_docs"
  ON document_versions
  FOR SELECT
  USING (
    user_has_document_access(document_id, auth.uid())
  );

-- Policy: INSERT - Editors can create versions
CREATE POLICY "editors_can_create_versions"
  ON document_versions
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND user_has_role(document_id, 'editor'::document_role, auth.uid())
  );

-- Policy: DELETE - Owners can delete versions
CREATE POLICY "owners_can_delete_versions"
  ON document_versions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE id = document_id
        AND owner_id = auth.uid()
    )
  );

-- ============================================
-- 5. VERSION CONFIG RLS
-- ============================================

ALTER TABLE document_version_config ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - View config of accessible documents
CREATE POLICY "users_can_view_version_config_of_accessible_docs"
  ON document_version_config
  FOR SELECT
  USING (
    user_has_document_access(document_id, auth.uid())
  );

-- Policy: ALL - Owners manage config
CREATE POLICY "owners_can_manage_version_config"
  ON document_version_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE id = document_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE id = document_id
        AND owner_id = auth.uid()
    )
  );

-- ============================================
-- 6. SECURITY AUDIT LOG RLS
-- ============================================

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can view their own audit logs
CREATE POLICY "users_can_view_own_audit_logs"
  ON security_audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: INSERT - System can insert (SECURITY DEFINER functions)
-- No explicit INSERT policy needed, handled by triggers

-- ============================================
-- RLS MIGRATION COMPLETE
-- ============================================
-- All tables now have Row Level Security enabled
-- Users can only access data they have permission for
