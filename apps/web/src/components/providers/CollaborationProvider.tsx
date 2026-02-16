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
    // Treat Y.Doc as a persistent singleton for the document session
    const [ydoc] = useState(() => new Y.Doc());
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const providerRef = useRef<WebsocketProvider | null>(null);

    useEffect(() => {
        let mounted = true;

        async function setupCollaboration() {
            if (!mounted) return;

            // Cleanup existing connection if any
            if (providerRef.current) {
                providerRef.current.destroy();
                providerRef.current = null;
                setProvider(null);
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session || !mounted) return;

                const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:1234';
                const roomName = `document:${documentId}`;

                console.log(`🔌 Yjs: Connecting to room ${roomName}`);

                const wsProvider = new WebsocketProvider(
                    wsUrl,
                    roomName,
                    ydoc,
                    {
                        connect: false, // Critical Fix: Do not connect immediately to avoid missing events
                        params: { token: session.access_token },
                    }
                );

                // Initial presence setup
                wsProvider.awareness.setLocalStateField('user', {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email,
                    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                });

                wsProvider.on('status', ({ status }: { status: string }) => {
                    if (!mounted) return;
                    setIsConnected(status === 'connected');
                    console.log(`📡 WebSocket: ${status}`);
                });

                wsProvider.on('sync', (synced: boolean) => {
                    if (!mounted) return;
                    setIsSynced(synced);
                    console.log(`🔄 Yjs: Synced: ${synced}`);
                    if (synced && onSync) onSync(ydoc);
                });

                if (mounted) {
                    providerRef.current = wsProvider;
                    setProvider(wsProvider);
                    wsProvider.connect(); // Connect AFTER listeners are attached
                }

            } catch (err: any) {
                console.error('❌ Yjs: Setup failed', err);
                if (mounted) setError(err.message);
            }
        }

        setupCollaboration();

        return () => {
            mounted = false;
            if (providerRef.current) {
                providerRef.current.destroy();
                providerRef.current = null;
            }
        };
    }, [documentId, ydoc]); // Doc and ID are the only valid dependencies for a stable provider

    return (
        <CollaborationContext.Provider
            value={{ ydoc, provider, isConnected, isSynced, error }}
        >
            {children}
        </CollaborationContext.Provider>
    );
}
