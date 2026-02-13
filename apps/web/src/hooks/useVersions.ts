import { useState, useEffect } from 'react';
import {
    getDocumentVersions,
    getVersion,
    DocumentVersionWithUser,
    DocumentVersion
} from '@/lib/api/versions';

/**
 * Hook to fetch all versions for a document
 */
export function useVersions(documentId: string | null) {
    const [versions, setVersions] = useState<DocumentVersionWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        console.log(`📜 useVersions: Initializing for doc ${documentId}`);
        if (!documentId) {
            console.log('📜 useVersions: No documentId provided, skipping');
            setVersions([]);
            setLoading(false);
            return;
        }

        let mounted = true;

        async function fetchVersions() {
            try {
                setLoading(true);
                console.log('📜 useVersions: Fetching versions...');
                const data = await getDocumentVersions(documentId!);
                console.log(`📜 useVersions: Fetched ${data.length} versions`);
                if (mounted) {
                    setVersions(data);
                    setError(null);
                }
            } catch (err) {
                console.error('📜 useVersions: Fetch error:', err);
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to fetch versions'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchVersions();

        return () => {
            mounted = false;
        };
    }, [documentId]);

    const refetch = async () => {
        if (!documentId) return;
        try {
            setLoading(true);
            const data = await getDocumentVersions(documentId!);
            setVersions(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch versions'));
        } finally {
            setLoading(false);
        }
    };

    return { versions, loading, error, refetch };
}

/**
 * Hook to fetch a specific version
 */
export function useVersion(versionId: string | null) {
    const [version, setVersion] = useState<DocumentVersion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!versionId) {
            setVersion(null);
            setLoading(false);
            return;
        }

        let mounted = true;

        async function fetchVersion() {
            try {
                setLoading(true);
                const data = await getVersion(versionId!);
                if (mounted) {
                    setVersion(data);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to fetch version'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        fetchVersion();

        return () => {
            mounted = false;
        };
    }, [versionId]);

    return { version, loading, error };
}
