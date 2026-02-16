import { supabase, Tables, Insertable, Updatable } from '@/lib/supabase-client';
import { handleSupabaseError } from '@/lib/errors';

export type Document = Tables<'documents'>;
export type DocumentCollaborator = Tables<'document_collaborators'>;

export interface DocumentInvite {
    id: string;
    document_id: string;
    invited_email: string;
    inviter_user_id: string;
    role: 'editor' | 'viewer';
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    accepted_at: string | null;
}

// Extended types with joins
export interface DocumentWithCollaborators extends Document {
    collaborators?: DocumentCollaborator[];
    collaborator_count?: number;
}

export interface CollaboratorWithUser extends DocumentCollaborator {
    user?: {
        id: string;
        email: string;
        user_metadata?: {
            full_name?: string;
            avatar_url?: string;
        };
    };
}

/**
 * Fetch all documents accessible by the current user
 */
export async function getUserDocuments(): Promise<Document[]> {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

    if (error) handleSupabaseError(error);
    return data || [];
}

/**
 * Fetch a single document by ID with collaborators
 */
export async function getDocument(
    documentId: string
): Promise<DocumentWithCollaborators> {
    const { data, error } = await supabase
        .from('documents')
        .select(`
            *,
            collaborators:document_collaborators(*)
        `)
        .eq('id', documentId)
        .is('deleted_at', null)
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Create a new document
 */
export async function createDocument(
    title: string,
    content?: any
): Promise<Document> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('documents')
        .insert({
            owner_id: user.id,
            title,
            content: content || {},
        })
        .select()
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Update document metadata (title, content)
 */
export async function updateDocument(
    documentId: string,
    updates: Updatable<'documents'>
): Promise<Document> {
    const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Soft delete a document
 */
export async function deleteDocument(documentId: string): Promise<void> {
    const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentId);

    if (error) handleSupabaseError(error);
}

/**
 * Find a user profile by email
 */
export async function getUserByEmail(email: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('email', email)
        .single();

    if (error) return null;
    return data;
}

/**
 * Get all collaborators for a document
 */
export async function getDocumentCollaborators(
    documentId: string
): Promise<CollaboratorWithUser[]> {
    const { data, error } = await supabase
        .from('document_collaborators')
        .select(`
            *,
            user:user_id(id, email, user_metadata)
        `)
        .eq('document_id', documentId);

    if (error) handleSupabaseError(error);
    return (data || []) as unknown as CollaboratorWithUser[];
}

/**
 * Add a collaborator to a document
 */
export async function addCollaborator(
    documentId: string,
    userId: string,
    role: 'editor' | 'viewer' = 'viewer'
): Promise<DocumentCollaborator> {
    const { data, error } = await supabase
        .from('document_collaborators')
        .insert({
            document_id: documentId,
            user_id: userId,
            role,
        })
        .select()
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Update collaborator role
 */
export async function updateCollaboratorRole(
    collaboratorId: string,
    role: 'owner' | 'editor' | 'viewer'
): Promise<DocumentCollaborator> {
    const { data, error } = await supabase
        .from('document_collaborators')
        .update({ role })
        .eq('id', collaboratorId)
        .select()
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Remove a collaborator from a document
 */
export async function removeCollaborator(collaboratorId: string): Promise<void> {
    const { error } = await supabase
        .from('document_collaborators')
        .delete()
        .eq('id', collaboratorId);

    if (error) handleSupabaseError(error);
}

/**
 * Check if user has access to a document
 */
export async function checkDocumentAccess(
    documentId: string
): Promise<boolean> {
    const { data, error } = await supabase.rpc('user_has_document_access', {
        doc_id: documentId,
    });

    if (error) {
        console.error('Error checking document access:', error);
        return false;
    }

    return data || false;
}

/**
 * Invite a user to a document by email
 */
export async function inviteDocument(
    documentId: string,
    email: string,
    role: 'editor' | 'viewer' = 'viewer'
): Promise<DocumentInvite> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // 1. Check if user is the owner
    const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('owner_id')
        .eq('id', documentId)
        .single();

    if (docError || !doc) throw new Error('Document not found');
    if (doc.owner_id !== user.id) throw new Error('Only the owner can send invites');

    // 2. Check for duplicate pending invite
    const { data: existing } = await (supabase
        .from('document_invites' as any)
        .select('id')
        .eq('document_id', documentId)
        .eq('invited_email', email)
        .eq('status', 'pending')
        .maybeSingle() as any);

    if (existing) throw new Error('Invite already pending for this email');

    // 3. Insert invite
    const { data, error } = await (supabase
        .from('document_invites' as any)
        .insert({
            document_id: documentId,
            invited_email: email,
            inviter_user_id: user.id,
            role,
            status: 'pending'
        })
        .select()
        .single() as any);

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Subscribe to document changes (real-time)
 */
export function subscribeToDocument(
    documentId: string,
    callback: (document: Document) => void
) {
    const channel = supabase
        .channel(`document:${documentId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'documents',
                filter: `id=eq.${documentId}`,
            },
            (payload) => {
                callback(payload.new as Document);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

/**
 * Accept a document invitation
 */
export async function acceptInvite(inviteId: string): Promise<{ success: boolean; document_id: string }> {
    const { data, error } = await (supabase.rpc('accept_document_invite' as any, {
        p_invite_id: inviteId,
    }) as any);

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Reject a document invitation
 */
export async function rejectInvite(inviteId: string): Promise<void> {
    const { error } = await (supabase.rpc('reject_document_invite' as any, {
        p_invite_id: inviteId,
    }) as any);

    if (error) handleSupabaseError(error);
}
