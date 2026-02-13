'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { supabase } from '@/lib/supabase-client';

interface CollaborationContextType {
    ydoc: Y.Doc | null;
    provider: WebsocketProvider | null;
    isConnected: boolean;
    isSynced: boolean;
    error: string | null;
}

const CollaborationContext = createContext<CollaborationContextType>({
    ydoc: null,
    provider: null,
    isConnected: false,
    isSynced: false,
    error: null,
});

export function useCollaboration() {
    return useContext(CollaborationContext);
}

interface CollaborationProviderProps {
    documentId: string;
    children: React.ReactNode;
    onSync?: (ydoc: Y.Doc) => void;
}

export function CollaborationProvider({
    documentId,
    children,
    onSync
}: CollaborationProviderProps) {
    const [ydoc] = useState(() => new Y.Doc());
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const providerRef = useRef<WebsocketProvider | null>(null);
    const setupInProgress = useRef(false);

    // Watch for stuck sync
    useEffect(() => {
        if (isConnected && !isSynced) {
            const timeout = setTimeout(() => {
                console.warn('⚠️ Syncing is taking a long time...');
            }, 10000);
            return () => clearTimeout(timeout);
        }
    }, [isConnected, isSynced]);

    useEffect(() => {
        let mounted = true;
        let setupTimeout: NodeJS.Timeout;

        async function setupCollaboration() {
            if (setupInProgress.current) return;
            setupInProgress.current = true;

            try {
                // Ensure previous provider is destroyed
                if (providerRef.current) {
                    providerRef.current.destroy();
                    providerRef.current = null;
                }

                // Get auth user
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                    if (mounted) setError('Authentication required');
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();
                let currentSession = session;
                if (!currentSession || !mounted) return;

                // Refresh if close to expiry
                const expiresAt = currentSession.expires_at ? currentSession.expires_at * 1000 : 0;
                if (expiresAt - Date.now() < 30000) {
                    const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
                    if (refreshedSession) currentSession = refreshedSession;
                }

                if (!mounted) return;

                const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:1234';
                const roomName = `document:${documentId}`;

                console.log(`🔌 Connecting: ${roomName}`);
                const wsProvider = new WebsocketProvider(
                    wsUrl,
                    roomName,
                    ydoc,
                    {
                        connect: true,
                        params: { token: currentSession.access_token },
                    }
                );

                // Set initial user awareness
                const userColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
                wsProvider.awareness.setLocalStateField('user', {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email,
                    color: userColor,
                });

                wsProvider.on('status', (event: { status: string }) => {
                    if (!mounted) return;
                    console.log(`🔌 WebSocket Status: ${event.status}`);
                    setIsConnected(event.status === 'connected');
                    if (event.status === 'connected') setError(null);
                });

                wsProvider.on('sync', (synced: boolean) => {
                    if (!mounted) return;
                    console.log(`🔄 WebSocket Sync: ${synced}`);
                    setIsSynced(synced);
                    if (synced && onSync) onSync(ydoc);
                });

                wsProvider.on('connection-error', (err: any) => {
                    console.error('❌ WebSocket Connection Error:', err);
                    if (mounted) setError(`Connection failed: ${err?.message || 'Server unreachable'}`);
                });

                providerRef.current = wsProvider;
                setProvider(wsProvider);

                // Clear timeout since setup succeeded
                if (setupTimeout) clearTimeout(setupTimeout);

            } catch (err) {
                console.error('Setup error:', err);
                if (mounted) setError('Failed to initialize collaboration');
            } finally {
                setupInProgress.current = false;
            }
        }

        // Set timeout to prevent infinite loading
        setupTimeout = setTimeout(() => {
            if (!provider && mounted) {
                console.warn('⚠️ Collaboration setup timeout - allowing editor to load anyway');
                // Force setup to complete even if it's taking too long
                setupInProgress.current = false;
            }
        }, 10000);

        setupCollaboration();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
                setupCollaboration();
            } else if (event === 'SIGNED_OUT') {
                if (providerRef.current) {
                    providerRef.current.destroy();
                    providerRef.current = null;
                }
                setIsConnected(false);
                setIsSynced(false);
                setError('Signed out');
            }
        });

        return () => {
            mounted = false;
            if (setupTimeout) clearTimeout(setupTimeout);
            subscription.unsubscribe();
            if (providerRef.current) {
                providerRef.current.destroy();
                providerRef.current = null;
            }
        };
    }, [documentId, ydoc, onSync]);

    return (
        <CollaborationContext.Provider
            value={{ ydoc, provider, isConnected, isSynced, error }}
        >
            {error && error.toLowerCase().includes('token') && (
                <div className="fixed bottom-4 right-4 z-50 p-4 bg-yellow-100 border border-yellow-300 rounded-lg shadow-lg flex flex-col gap-2">
                    <p className="text-sm text-yellow-800 font-medium">Authentication issue detected.</p>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/login';
                        }}
                        className="text-xs bg-yellow-800 text-white px-3 py-1.5 rounded hover:bg-yellow-900 transition-colors"
                    >
                        Sign Out & Reset Session
                    </button>
                </div>
            )}
            {children}
        </CollaborationContext.Provider>
    );
}
