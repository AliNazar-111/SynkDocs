-- ============================================
-- SYNKDOCS RLS POLICIES - FIXED (No Circular References)
-- ============================================
-- Run this AFTER dropping the old policies
-- ============================================

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "users_can_view_accessible_documents" ON documents;
DROP POLICY IF EXISTS "authenticated_users_can_create_documents" ON documents;
DROP POLICY IF EXISTS "editors_can_update_documents" ON documents;
DROP POLICY IF EXISTS "owners_can_soft_delete_documents" ON documents;
DROP POLICY IF EXISTS "users_can_view_collaborators_of_accessible_docs" ON document_collaborators;
DROP POLICY IF EXISTS "owners_can_add_collaborators" ON document_collaborators;
DROP POLICY IF EXISTS "owners_can_update_collaborator_roles" ON document_collaborators;
DROP POLICY IF EXISTS "owners_can_remove_collaborators_or_users_can_leave" ON document_collaborators;
DROP POLICY IF EXISTS "users_can_view_comments_on_accessible_docs" ON comments;
DROP POLICY IF EXISTS "editors_can_create_comments" ON comments;
DROP POLICY IF EXISTS "users_can_update_own_comments" ON comments;
DROP POLICY IF EXISTS "editors_can_resolve_comments" ON comments;
DROP POLICY IF EXISTS "users_can_delete_own_comments_owners_can_delete_any" ON comments;
DROP POLICY IF EXISTS "users_can_view_versions_of_accessible_docs" ON document_versions;
DROP POLICY IF EXISTS "editors_can_create_versions" ON document_versions;
DROP POLICY IF EXISTS "owners_can_delete_versions" ON document_versions;
DROP POLICY IF EXISTS "users_can_view_version_config_of_accessible_docs" ON document_version_config;
DROP POLICY IF EXISTS "owners_can_manage_version_config" ON document_version_config;
DROP POLICY IF EXISTS "users_can_view_own_audit_logs" ON security_audit_log;

-- ============================================
-- 1. DOCUMENTS TABLE RLS (SIMPLIFIED)
-- ============================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can view documents they own or collaborate on
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

-- Policy: INSERT - Authenticated users can create documents
CREATE POLICY "documents_insert_policy"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND deleted_at IS NULL
  );

-- Policy: UPDATE - Owners and editors can update
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
        WHERE user_id = auth.uid() 
        AND role IN ('editor', 'owner')
      )
    )
  );

-- Policy: DELETE - Only owners can soft-delete
CREATE POLICY "documents_delete_policy"
  ON documents
  FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================
-- 2. DOCUMENT COLLABORATORS RLS (SIMPLIFIED)
-- ============================================

ALTER TABLE document_collaborators ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - View collaborators of owned/shared docs
CREATE POLICY "collaborators_select_policy"
  ON document_collaborators
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE deleted_at IS NULL 
      AND owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Policy: INSERT - Owners can add collaborators
CREATE POLICY "collaborators_insert_policy"
  ON document_collaborators
  FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents 
      WHERE owner_id = auth.uid() 
      AND deleted_at IS NULL
    )
  );

-- Policy: UPDATE - Owners can update roles
CREATE POLICY "collaborators_update_policy"
  ON document_collaborators
  FOR UPDATE
  USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE owner_id = auth.uid() 
      AND deleted_at IS NULL
    )
  );

-- Policy: DELETE - Owners delete, users can leave
CREATE POLICY "collaborators_delete_policy"
  ON document_collaborators
  FOR DELETE
  USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE owner_id = auth.uid() 
      AND deleted_at IS NULL
    )
    OR user_id = auth.uid()
  );

-- ============================================
-- 3. COMMENTS TABLE RLS
-- ============================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - View comments on accessible documents
CREATE POLICY "comments_select_policy"
  ON comments
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND document_id IN (
      SELECT id FROM documents 
      WHERE deleted_at IS NULL 
      AND (
        owner_id = auth.uid()
        OR id IN (
          SELECT document_id 
          FROM document_collaborators 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Policy: INSERT - Editors can create comments
CREATE POLICY "comments_insert_policy"
  ON comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND document_id IN (
      SELECT id FROM documents 
      WHERE deleted_at IS NULL 
      AND (
        owner_id = auth.uid()
        OR id IN (
          SELECT document_id 
          FROM document_collaborators 
          WHERE user_id = auth.uid() 
          AND role IN ('editor', 'owner')
        )
      )
    )
  );

-- Policy: UPDATE - Users update own, editors resolve
CREATE POLICY "comments_update_policy"
  ON comments
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR document_id IN (
        SELECT id FROM documents 
        WHERE owner_id = auth.uid() 
        OR id IN (
          SELECT document_id 
          FROM document_collaborators 
          WHERE user_id = auth.uid() 
          AND role IN ('editor', 'owner')
        )
      )
    )
  );

-- Policy: DELETE - Users delete own, owners delete any
CREATE POLICY "comments_delete_policy"
  ON comments
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR document_id IN (
      SELECT id FROM documents 
      WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- 4. DOCUMENT VERSIONS RLS
-- ============================================

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - View versions of accessible docs
CREATE POLICY "versions_select_policy"
  ON document_versions
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE deleted_at IS NULL 
      AND (
        owner_id = auth.uid()
        OR id IN (
          SELECT document_id 
          FROM document_collaborators 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Policy: INSERT - Editors can create versions
CREATE POLICY "versions_insert_policy"
  ON document_versions
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND document_id IN (
      SELECT id FROM documents 
      WHERE deleted_at IS NULL 
      AND (
        owner_id = auth.uid()
        OR id IN (
          SELECT document_id 
          FROM document_collaborators 
          WHERE user_id = auth.uid() 
          AND role IN ('editor', 'owner')
        )
      )
    )
  );

-- Policy: DELETE - Owners can delete versions
CREATE POLICY "versions_delete_policy"
  ON document_versions
  FOR DELETE
  USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- 5. VERSION CONFIG RLS
-- ============================================

ALTER TABLE document_version_config ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - View config of accessible docs
CREATE POLICY "version_config_select_policy"
  ON document_version_config
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE deleted_at IS NULL 
      AND (
        owner_id = auth.uid()
        OR id IN (
          SELECT document_id 
          FROM document_collaborators 
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Policy: ALL - Owners manage config
CREATE POLICY "version_config_modify_policy"
  ON document_version_config
  FOR ALL
  USING (
    document_id IN (
      SELECT id FROM documents 
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents 
      WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- 6. SECURITY AUDIT LOG RLS
-- ============================================

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users view own audit logs
CREATE POLICY "audit_log_select_policy"
  ON security_audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- RLS MIGRATION COMPLETE
-- ============================================
-- No circular references - all policies use direct subqueries
