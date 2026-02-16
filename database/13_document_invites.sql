-- ============================================
-- SYNKDOCS DOCUMENT INVITES
-- ============================================

-- Invite status enum
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined');

-- Document invites table
CREATE TABLE document_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role document_role NOT NULL DEFAULT 'viewer',
  status invite_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ NULL,

  -- Constraint: Role cannot be 'owner' for invites through this table
  CONSTRAINT valid_invite_role CHECK (role IN ('editor', 'viewer')),
  -- Unique pending invite per user per document
  UNIQUE(document_id, invited_email)
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE document_invites ENABLE ROW LEVEL SECURITY;

-- 1. Owners can view invites for their documents
CREATE POLICY "owners_can_view_invites"
  ON document_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_invites.document_id 
      AND documents.owner_id = auth.uid()
    )
  );

-- 2. Owners can create invites
CREATE POLICY "owners_can_create_invites"
  ON document_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_invites.document_id 
      AND documents.owner_id = auth.uid()
    )
  );

-- 3. Owners can delete invites
CREATE POLICY "owners_can_delete_invites"
  ON document_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_invites.document_id 
      AND documents.owner_id = auth.uid()
    )
  );

-- 4. Users can view invites sent to them (by email)
CREATE POLICY "invited_users_can_view_own_invites"
  ON document_invites
  FOR SELECT
  USING (LOWER(invited_email) = LOWER(auth.jwt() ->> 'email'));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_invites_document_id ON document_invites(document_id);
CREATE INDEX idx_invites_invited_email ON document_invites(invited_email);
CREATE INDEX idx_invites_status ON document_invites(status);
