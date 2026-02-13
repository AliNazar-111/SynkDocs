-- ============================================
-- SYNKDOCS DATABASE SCHEMA - COMPLETE MIGRATION
-- ============================================
-- This file contains the complete database schema for SynkDocs
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

CREATE TYPE document_role AS ENUM ('owner', 'editor', 'viewer');

-- ============================================
-- 2. CORE TABLES
-- ============================================

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

-- Profiles table (synced with auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger: Sync auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Document collaborators (many-to-many with roles)
CREATE TABLE document_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role document_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(document_id, user_id)
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Threading support
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL,
  
  -- Comment content
  content TEXT NOT NULL,
  
  -- Text anchoring
  position_data JSONB NULL,
  
  -- Resolution tracking
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraint: thread_id must be a root comment or self
  CHECK (
    (parent_id IS NULL AND thread_id = id) OR 
    (parent_id IS NOT NULL)
  )
);

-- Document versions table
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Version metadata
  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  
  -- Content storage
  content JSONB NOT NULL,
  
  -- Change tracking
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT,
  
  -- Size tracking
  content_size_bytes INTEGER GENERATED ALWAYS AS (
    octet_length(content::text)
  ) STORED,
  
  UNIQUE(document_id, version_number)
);

-- Version retention configuration
CREATE TABLE document_version_config (
  document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Retention policy
  max_versions INTEGER DEFAULT 10,
  keep_daily_for_days INTEGER DEFAULT 7,
  keep_weekly_for_weeks INTEGER DEFAULT 4,
  keep_monthly_for_months INTEGER DEFAULT 3,
  
  -- Storage quota (bytes)
  max_storage_bytes BIGINT DEFAULT 10485760, -- 10MB
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security audit log
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. INDEXES
-- ============================================

-- Documents indexes
CREATE INDEX idx_documents_owner_id ON documents(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_documents_owner_access ON documents(owner_id, id) WHERE deleted_at IS NULL;

-- Collaborators indexes
CREATE INDEX idx_collaborators_document_id ON document_collaborators(document_id);
CREATE INDEX idx_collaborators_user_id ON document_collaborators(user_id);
CREATE INDEX idx_collaborators_role ON document_collaborators(document_id, role);
CREATE INDEX idx_collaborators_access ON document_collaborators(user_id, document_id);

-- Comments indexes
CREATE INDEX idx_comments_document_id ON comments(document_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_thread_id ON comments(thread_id, created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_comments_unresolved ON comments(document_id, created_at DESC) 
  WHERE resolved_at IS NULL AND deleted_at IS NULL AND parent_id IS NULL;
CREATE INDEX idx_comments_user_id ON comments(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_position ON comments(document_id) 
  USING GIN (position_data jsonb_path_ops) 
  WHERE position_data IS NOT NULL AND deleted_at IS NULL;

-- Versions indexes
CREATE INDEX idx_versions_document_id ON document_versions(document_id, version_number DESC);
CREATE INDEX idx_versions_created_at ON document_versions(document_id, created_at DESC);
CREATE INDEX idx_versions_storage ON document_versions(document_id, content_size_bytes);
CREATE INDEX idx_versions_created_by ON document_versions(created_by, created_at DESC);

-- Audit log indexes
CREATE INDEX idx_audit_log_user_id ON security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_record_id ON security_audit_log(table_name, record_id);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set thread_id for comments
CREATE OR REPLACE FUNCTION set_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.thread_id = NEW.id;
  ELSE
    SELECT thread_id INTO NEW.thread_id 
    FROM comments 
    WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_comment_thread_id
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION set_thread_id();

-- Auto-increment version number
CREATE OR REPLACE FUNCTION set_version_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM document_versions
  WHERE document_id = NEW.document_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_version_number_trigger
  BEFORE INSERT ON document_versions
  FOR EACH ROW
  WHEN (NEW.version_number IS NULL)
  EXECUTE FUNCTION set_version_number();

-- Security audit logging
CREATE OR REPLACE FUNCTION log_security_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    ip_address
  )
  VALUES (
    auth.uid(),
    TG_OP || ' on ' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_document_ownership_changes
  AFTER UPDATE OF owner_id ON documents
  FOR EACH ROW
  WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
  EXECUTE FUNCTION log_security_event();

CREATE TRIGGER audit_collaborator_changes
  AFTER INSERT OR UPDATE OR DELETE ON document_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION log_security_event();

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Check if user has access to document
CREATE OR REPLACE FUNCTION user_has_document_access(
  doc_id UUID,
  user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = doc_id
      AND d.deleted_at IS NULL
      AND (
        d.owner_id = user_id
        OR EXISTS (
          SELECT 1 FROM document_collaborators dc
          WHERE dc.document_id = doc_id
            AND dc.user_id = user_id
        )
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(
  doc_id UUID,
  required_role document_role,
  user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents
    WHERE id = doc_id
      AND owner_id = user_id
      AND deleted_at IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM document_collaborators dc
    WHERE dc.document_id = doc_id
      AND dc.user_id = user_id
      AND (
        (required_role = 'viewer' AND dc.role IN ('viewer', 'editor', 'owner')) OR
        (required_role = 'editor' AND dc.role IN ('editor', 'owner')) OR
        (required_role = 'owner' AND dc.role = 'owner')
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get full comment thread
CREATE OR REPLACE FUNCTION get_comment_thread(root_comment_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  parent_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  depth INTEGER
) AS $$
  WITH RECURSIVE thread_tree AS (
    SELECT 
      c.id,
      c.user_id,
      c.parent_id,
      c.content,
      c.created_at,
      0 AS depth
    FROM comments c
    WHERE c.id = root_comment_id
      AND c.deleted_at IS NULL
    
    UNION ALL
    
    SELECT 
      c.id,
      c.user_id,
      c.parent_id,
      c.content,
      c.created_at,
      tt.depth + 1
    FROM comments c
    INNER JOIN thread_tree tt ON c.parent_id = tt.id
    WHERE c.deleted_at IS NULL
  )
  SELECT * FROM thread_tree
  ORDER BY created_at ASC;
$$ LANGUAGE sql STABLE;

-- Get unresolved threads for a document
CREATE OR REPLACE FUNCTION get_unresolved_threads(doc_id UUID)
RETURNS TABLE (
  thread_id UUID,
  root_content TEXT,
  reply_count BIGINT,
  latest_reply_at TIMESTAMPTZ,
  position_data JSONB
) AS $$
  SELECT 
    c.thread_id,
    c.content AS root_content,
    COUNT(replies.id) AS reply_count,
    MAX(replies.created_at) AS latest_reply_at,
    c.position_data
  FROM comments c
  LEFT JOIN comments replies ON replies.thread_id = c.thread_id AND replies.id != c.id
  WHERE c.document_id = doc_id
    AND c.parent_id IS NULL
    AND c.resolved_at IS NULL
    AND c.deleted_at IS NULL
  GROUP BY c.thread_id, c.content, c.position_data
  ORDER BY latest_reply_at DESC NULLS LAST;
$$ LANGUAGE sql STABLE;

-- Create version snapshot
CREATE OR REPLACE FUNCTION create_version_snapshot(
  p_document_id UUID,
  p_title VARCHAR,
  p_content JSONB,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_version_id UUID;
BEGIN
  -- Permission check
  IF NOT EXISTS (
    SELECT 1 FROM public.document_permissions 
    WHERE user_id = auth.uid() 
      AND document_id = p_document_id 
      AND role IN ('owner', 'editor')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create snapshot';
  END IF;

  INSERT INTO document_versions (
    document_id,
    title,
    content,
    created_by,
    change_summary
  )
  VALUES (
    p_document_id,
    p_title,
    p_content,
    auth.uid(),
    p_change_summary
  )
  RETURNING id INTO new_version_id;
  
  RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore version
CREATE OR REPLACE FUNCTION restore_version(p_version_id UUID)
RETURNS UUID AS $$
DECLARE
  v_old_version RECORD;
  v_new_version_id UUID;
BEGIN
  SELECT * INTO v_old_version
  FROM document_versions
  WHERE id = p_version_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  -- Permission check
  IF NOT EXISTS (
    SELECT 1 FROM public.document_permissions 
    WHERE user_id = auth.uid() 
      AND document_id = v_old_version.document_id 
      AND role IN ('owner', 'editor')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to restore version';
  END IF;
  
  UPDATE documents
  SET 
    content = v_old_version.content,
    title = v_old_version.title,
    updated_at = now()
  WHERE id = v_old_version.document_id;
  
  INSERT INTO document_versions (
    document_id,
    title,
    content,
    created_by,
    change_summary
  )
  VALUES (
    v_old_version.document_id,
    v_old_version.title,
    v_old_version.content,
    auth.uid(),
    'Restored from version ' || v_old_version.version_number
  )
  RETURNING id INTO v_new_version_id;
  
  RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get storage usage
CREATE OR REPLACE FUNCTION get_document_storage_usage(p_document_id UUID)
RETURNS TABLE (
  total_versions INTEGER,
  total_size_bytes BIGINT,
  avg_version_size_bytes BIGINT,
  oldest_version_date TIMESTAMPTZ,
  newest_version_date TIMESTAMPTZ
) AS $$
  SELECT 
    COUNT(*)::INTEGER,
    SUM(content_size_bytes),
    AVG(content_size_bytes)::BIGINT,
    MIN(created_at),
    MAX(created_at)
  FROM document_versions
  WHERE document_id = p_document_id;
$$ LANGUAGE sql STABLE;

-- Transfer document ownership
CREATE OR REPLACE FUNCTION transfer_document_ownership(
  p_document_id UUID,
  p_new_owner_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM documents
    WHERE id = p_document_id
      AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the owner can transfer ownership';
  END IF;
  
  UPDATE documents
  SET owner_id = p_new_owner_id
  WHERE id = p_document_id;
  
  DELETE FROM document_collaborators
  WHERE document_id = p_document_id
    AND user_id = p_new_owner_id;
  
  INSERT INTO document_collaborators (document_id, user_id, role)
  VALUES (p_document_id, auth.uid(), 'editor')
  ON CONFLICT (document_id, user_id) DO UPDATE
  SET role = 'editor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next: Run the RLS policies from 02_rls_policies.sql
