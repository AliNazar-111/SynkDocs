import { supabase, Tables } from '@/lib/supabase-client';
import { handleSupabaseError } from '@/lib/errors';

export type DocumentVersion = Tables<'document_versions'>;

export interface DocumentVersionWithUser extends DocumentVersion {
    user?: {
        id: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
    };
}

/**
 * Fetch all versions for a document
 */
export async function getDocumentVersions(
    documentId: string
): Promise<DocumentVersionWithUser[]> {
    const { data, error } = await supabase
        .from('document_versions')
        .select(`
            *,
            user:profiles!created_by(id, email, full_name, avatar_url)
        `)
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

    if (error) handleSupabaseError(error);
    return (data || []) as unknown as DocumentVersionWithUser[];
}

/**
 * Fetch a specific version by ID
 */
export async function getVersion(versionId: string): Promise<DocumentVersion> {
    const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('id', versionId)
        .single();

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Create a version snapshot
 */
export async function createVersionSnapshot(
    documentId: string,
    title: string,
    content: any,
    changeSummary?: string
): Promise<string> {
    const { data, error } = await supabase.rpc('create_version_snapshot', {
        p_document_id: documentId,
        p_title: title,
        p_content: content,
        p_change_summary: changeSummary || undefined,
    } as any);

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Restore a previous version
 */
export async function restoreVersion(versionId: string): Promise<string> {
    const { data, error } = await supabase.rpc('restore_version', {
        p_version_id: versionId,
    });

    if (error) handleSupabaseError(error);
    return data;
}

/**
 * Delete a specific version
 */
export async function deleteVersion(versionId: string): Promise<void> {
    const { error } = await supabase
        .from('document_versions')
        .delete()
        .eq('id', versionId);

    if (error) handleSupabaseError(error);
}

/**
 * Get storage usage for a document's versions
 */
export async function getVersionStorageUsage(documentId: string): Promise<{
    total_versions: number;
    total_size_bytes: number;
    avg_version_size_bytes: number;
    oldest_version_date: string;
    newest_version_date: string;
}> {
    const { data, error } = await supabase.rpc('get_document_storage_usage', {
        p_document_id: documentId,
    });

    if (error) handleSupabaseError(error);
    return data as any;
}
