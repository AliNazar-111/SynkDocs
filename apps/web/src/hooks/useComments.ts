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

    useEffect(() => {
        console.log(`💬 useComments: Initializing for doc ${documentId}`);
        if (!documentId) {
            console.log('💬 useComments: No documentId provided, skipping');
            setComments([]);
            setLoading(false);
            return;
        }

        let mounted = true;

        async function fetchComments() {
            try {
                setLoading(true);
                console.log('💬 useComments: Fetching comments...');
                const data = await getDocumentComments(documentId!);
                console.log(`💬 useComments: Fetched ${data.length} comments`);
                if (mounted) {
                    setComments(data);
                    setError(null);
                }
            } catch (err) {
                console.error('💬 useComments: Fetch error:', err);
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to fetch comments'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchComments();

        // Subscribe to real-time updates
        const unsubscribe = subscribeToComments(documentId!, (comment, event) => {
            if (event === 'INSERT') {
                setComments(prev => [...prev, comment as CommentWithUser]);
            } else if (event === 'UPDATE') {
                setComments(prev =>
                    prev.map(c => c.id === comment.id ? { ...c, ...comment } : c)
                );
            } else if (event === 'DELETE') {
                setComments(prev => prev.filter(c => c.id !== comment.id));
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [documentId]);

    return { comments, loading, error };
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
