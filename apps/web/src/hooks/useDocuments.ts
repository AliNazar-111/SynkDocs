import { useState, useEffect, useCallback } from 'react';
import { getUserDocuments, getDocument, DocumentWithCollaborators } from '@/lib/api/documents';
import { Document } from '@/types/document';
import { supabase } from '@/lib/supabase-client';

/**
 * Hook to fetch all user documents
 */
export function useDocuments() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refetch = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getUserDocuments();
            setDocuments(data as Document[]);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch documents'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { documents, loading, error, refetch };
}

/**
 * Hook to subscribe to document list changes (real-time)
 */
export function useDocumentsData() {
    const { documents, loading, error, refetch } = useDocuments();
    const [realtimeDocuments, setRealtimeDocuments] = useState<Document[]>([]);

    useEffect(() => {
        setRealtimeDocuments(documents);
    }, [documents]);

    useEffect(() => {
        console.log('📡 Sidebar: Connecting to real-time document updates...');

        const channel = supabase
            .channel('public:documents:sidebar')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'documents'
                },
                (payload) => {
                    console.log('🔄 Sidebar: Document change detected!', payload.eventType);
                    refetch();
                }
            )
            .subscribe((status) => {
                console.log('📡 Sidebar: Subscription status:', status);
            });

        return () => {
            console.log('📡 Sidebar: Cleaning up real-time subscription');
            supabase.removeChannel(channel);
        };
    }, [refetch]);

    return { documents: realtimeDocuments, loading, error, refetch };
}

/**
 * Hook to fetch a single document with collaborators
 */
export function useDocument(documentId: string | null) {
    const [document, setDocument] = useState<DocumentWithCollaborators | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!documentId) {
            setDocument(null);
            setLoading(false);
            return;
        }

        let mounted = true;

        async function fetchDocument() {
            try {
                setLoading(true);
                const data = await getDocument(documentId!);
                if (mounted) {
                    setDocument(data);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to fetch document'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchDocument();

        return () => {
            mounted = false;
        };
    }, [documentId]);

    const refetch = async () => {
        if (!documentId) return;
        try {
            setLoading(true);
            const data = await getDocument(documentId!);
            setDocument(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch document'));
        } finally {
            setLoading(false);
        }
    };

    return { document, loading, error, refetch };
}

/**
 * Hook to subscribe to single document changes (real-time)
 */
export function useDocumentData(documentId: string | null) {
    const { document, loading, error, refetch } = useDocument(documentId);
    const [realtimeDocument, setRealtimeDocument] = useState<DocumentWithCollaborators | null>(null);

    useEffect(() => {
        setRealtimeDocument(document);
    }, [document]);

    useEffect(() => {
        if (!documentId) return;

        console.log(`📡 Document Data: Connecting to real-time updates for ${documentId}...`);

        const channel = supabase
            .channel(`public:document:${documentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'documents',
                    filter: `id=eq.${documentId}`
                },
                (payload) => {
                    console.log('🔄 Document Data: Change detected!', payload.eventType);
                    refetch();
                }
            )
            .subscribe((status) => {
                console.log('📡 Document Data: Subscription status:', status);
            });

        return () => {
            console.log('📡 Document Data: Cleaning up subscription');
            supabase.removeChannel(channel);
        };
    }, [documentId, refetch]);

    return { document: realtimeDocument, loading, error, refetch };
}
