-- ============================================
-- SYNKDOCS NOTIFICATIONS
-- ============================================

-- Notification types enum
CREATE TYPE notification_type AS ENUM ('invite', 'invite_accepted', 'comment_reply', 'system');

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT NULL, -- Optional link to navigate to
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. Users can only view their own notifications
CREATE POLICY "users_view_own_notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- 2. Users can only update their own notifications (e.g. mark as read)
CREATE POLICY "users_update_own_notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. System can insert notifications (Security Definer function)
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUTOMATION TRIGGER (Invite System)
-- ============================================

-- Automatically notify user when they are invited (if they exist in profiles)
CREATE OR REPLACE FUNCTION handle_new_invite_notification()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    doc_title TEXT;
BEGIN
    -- Try to find the user by email in profiles
    SELECT id INTO target_user_id FROM public.profiles WHERE email = NEW.invited_email;
    SELECT title INTO doc_title FROM documents WHERE id = NEW.document_id;

    IF target_user_id IS NOT NULL THEN
        PERFORM create_notification(
            target_user_id,
            'invite',
            'Document Invitation',
            'You have been invited to collaborate on ' || doc_title,
            '/documents/' || NEW.document_id,
            jsonb_build_object('document_id', NEW.document_id, 'invite_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_document_invite_created
AFTER INSERT ON document_invites
FOR EACH ROW EXECUTE FUNCTION handle_new_invite_notification();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;
