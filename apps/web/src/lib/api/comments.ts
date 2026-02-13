import { supabase, Tables, Insertable } from '@/lib/supabase-client';
import { handleSupabaseError } from '@/lib/errors';

export type Comment = Tables<'comments'>;

export interface CommentWithUser extends Comment {
    user?: {
        id: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
    };
}

export interface CommentThread {
    thread_id: string;
    root_content: string;
    reply_count: number;
    latest_reply_at: string | null;
    position_data: any | null;
}

/**
 * Fetch all comments for a document
 */
export async function getDocumentComments(
    documentId: string
): Promise<CommentWithUser[]> {
    const { data, error } = await supabase
        .from('comments')
        .select(`
            *,
            user:profiles!user_id(id, email, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

    if (error) handleSupabaseError(error);
    return (data || []) as unknown as CommentWithUser[];
}

/**
 * Fetch all comments in a specific thread
 */
export async function getCommentThread(
    threadId: string
): Promise<CommentWithUser[]> {
    const { data, error } = await supabase
        .from('comments')
        .select(`
            *,
            user:profiles!user_id(id, email, full_name, avatar_url)
        `)
        .eq('thread_id', threadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

    if (error) handleSupabaseError(error);
    return (data || []) as unknown as CommentWithUser[];
}

/**
 * Get unresolved comment threads for a document
 */
export async function getUnresolvedThreads(
    documentId: string
): Promise<CommentThread[]> {
    const { data, error } = await supabase.rpc('get_unresolved_threads', {
        doc_id: documentId,
    });

    if (error) handleSupabaseError(error);
    return (data || []) as unknown as CommentThread[];
}

/**
 * Create a new comment (root or reply)
 */
export async function createComment(
    documentId: string,
    content: string,
    parentId?: string,
    positionData?: any
): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('comments')
        .insert({
            document_id: documentId,
            user_id: user.id,
            parent_id: parentId || null,
            content,
            position_data: positionData || null,
        })
        .select()
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Update a comment's content
 */
export async function updateComment(
    commentId: string,
    content: string
): Promise<Comment> {
    const { data, error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', commentId)
        .select()
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Resolve a comment thread
 */
export async function resolveComment(commentId: string): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('comments')
        .update({
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
        })
        .eq('id', commentId)
        .select()
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Unresolve a comment thread
 */
export async function unresolveComment(commentId: string): Promise<Comment> {
    const { data, error } = await supabase
        .from('comments')
        .update({
            resolved_at: null,
            resolved_by: null,
        })
        .eq('id', commentId)
        .select()
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Soft delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId);

    if (error) handleSupabaseError(error);
}

/**
 * Subscribe to comment changes for a document (real-time)
 */
export function subscribeToComments(
    documentId: string,
    callback: (comment: Comment, event: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
    const channel = supabase
        .channel(`comments:${documentId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'comments',
                filter: `document_id=eq.${documentId}`,
            },
            (payload) => {
                const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
                // For DELETE events, payload.new is null, so we use payload.old to get the deleted record's data.
                // For INSERT/UPDATE, payload.new contains the current state.
                const comment = (event === 'DELETE' ? payload.old : payload.new) as Comment;
                callback(comment, event);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
