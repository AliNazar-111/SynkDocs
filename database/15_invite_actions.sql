-- ============================================
-- SYNKDOCS INVITE ACTIONS (ATOMIC)
-- ============================================

-- Atomic function to accept an invite
CREATE OR REPLACE FUNCTION accept_document_invite(p_invite_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_invite RECORD;
    v_user_id UUID;
    v_acceptance_id UUID;
    v_doc_title TEXT;
    v_acceptor_name TEXT;
BEGIN
    -- 1. Get current user ID
    v_user_id := auth.uid();
    
    -- 2. Fetch and lock invite for update
    SELECT * INTO v_invite 
    FROM document_invites 
    WHERE id = p_invite_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;

    -- 3. Validation
    IF v_invite.status != 'pending' THEN
        RAISE EXCEPTION 'Invite is already %', v_invite.status;
    END IF;

    -- Verify the invited email matches the current user's email
    IF v_invite.invited_email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
        RAISE EXCEPTION 'This invite was sent to a different email address';
    END IF;

    -- 4. Update invite status
    UPDATE document_invites 
    SET status = 'accepted', 
        accepted_at = now() 
    WHERE id = p_invite_id;

    -- 5. Add to collaborators
    -- Use UPSERT to handle cases where user might already be there
    INSERT INTO document_collaborators (document_id, user_id, role)
    VALUES (v_invite.document_id, v_user_id, v_invite.role)
    ON CONFLICT (document_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role;

    -- 6. Notify the inviter
    SELECT title INTO v_doc_title FROM documents WHERE id = v_invite.document_id;
    SELECT COALESCE(full_name, email) INTO v_acceptor_name FROM profiles WHERE id = v_user_id;

    PERFORM create_notification(
        v_invite.inviter_user_id,
        'invite_accepted',
        'Invite Accepted',
        v_acceptor_name || ' accepted your invitation to ' || v_doc_title,
        '/documents/' || v_invite.document_id,
        jsonb_build_object('document_id', v_invite.document_id, 'acceptor_id', v_user_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'document_id', v_invite.document_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject an invite
CREATE OR REPLACE FUNCTION reject_document_invite(p_invite_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE document_invites 
    SET status = 'rejected' 
    WHERE id = p_invite_id 
    AND status = 'pending'
    AND invited_email = (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
