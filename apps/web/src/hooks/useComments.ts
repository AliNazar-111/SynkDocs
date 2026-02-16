import { useState, useEffect } from 'react';
import {
    getDocumentComments,
    getCommentThread,
    getUnresolvedThreads,
    subscribeToComments,
    CommentWithUser,
    CommentThread
} from '@/lib/api/comments';

/**
 * Hook to fetch all comments for a document
 */
export function useComments(documentId: string | null) {
    const [comments, setComments] = useState<CommentWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refetch = async () => {
        if (!documentId) return;
        try {
            // setLoading(true); // Optional: don't show spinner on background refresh
            const data = await getDocumentComments(documentId);
            setComments(data);
            setError(null);
        } catch (err) {
            console.error('💬 useComments: Fetch error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch comments'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log(`💬 useComments: Initializing for doc ${documentId}`);
        if (!documentId) {
            setComments([]);
            setLoading(false);
            return;
        }

        refetch();

        // Subscribe to real-time updates
        const unsubscribe = subscribeToComments(documentId, (comment, event) => {
            console.log('💬 useComments: Realtime event:', event, comment);
            refetch(); // Correctly fetch fresh data including joins
        });

        return () => {
            unsubscribe();
        };
    }, [documentId]);

    return { comments, loading, error, refetch };
}

/**
 * Hook to fetch a specific comment thread
 */
export function useCommentThread(threadId: string | null) {
    const [thread, setThread] = useState<CommentWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!threadId) {
            setThread([]);
            setLoading(false);
            return;
        }

        let mounted = true;

        async function fetchThread() {
            try {
                setLoading(true);
                const data = await getCommentThread(threadId!);
                if (mounted) {
                    setThread(data);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to fetch thread'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchThread();

        return () => {
            mounted = false;
        };
    }, [threadId]);

    return { thread, loading, error };
}

/**
 * Hook to fetch unresolved comment threads
 */
export function useUnresolvedThreads(documentId: string | null) {
    const [threads, setThreads] = useState<CommentThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!documentId) {
            setThreads([]);
            setLoading(false);
            return;
        }

        let mounted = true;

        async function fetchThreads() {
            try {
                setLoading(true);
                const data = await getUnresolvedThreads(documentId!);
                if (mounted) {
                    setThreads(data);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to fetch threads'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchThreads();

        return () => {
            mounted = false;
        };
    }, [documentId]);

    const refetch = async () => {
        if (!documentId) return;
        try {
            const data = await getUnresolvedThreads(documentId!);
            setThreads(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch threads'));
        }
    };

    return { threads, loading, error, refetch };
}
