'use client';

import { useEffect, useState, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface UseCollaborationProps {
    docId: string;
    username: string;
}

export interface PresenceUser {
    clientId: number;
    name: string;
    color: string;
    isTyping?: boolean;
}

export function useCollaboration({ docId, username }: UseCollaborationProps) {
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [users, setUsers] = useState<PresenceUser[]>([]);

    // Stable color based on username
    const color = useMemo(() => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }, [username]);

    const ydoc = useMemo(() => new Y.Doc(), []);

    useEffect(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:1234';
        const websocketProvider = new WebsocketProvider(
            wsUrl,
            `doc-${docId}`,
            ydoc,
            { connect: true }
        );

        websocketProvider.on('status', ({ status }: { status: string }) => {
            setIsConnected(status === 'connected');
        });

        const updateUsers = () => {
            const states = websocketProvider.awareness.getStates();
            const userList: PresenceUser[] = [];
            states.forEach((state, clientId) => {
                if (state.user) {
                    userList.push({
                        clientId,
                        name: state.user.name,
                        color: state.user.color,
                        isTyping: state.user.isTyping,
                    });
                }
            });
            setUsers(userList);
        };

        websocketProvider.awareness.on('change', updateUsers);

        // Set user presence/awareness
        websocketProvider.awareness.setLocalStateField('user', {
            name: username,
            color: color,
        });

        setProvider(websocketProvider);

        return () => {
            websocketProvider.awareness.off('change', updateUsers);
            websocketProvider.disconnect();
            websocketProvider.destroy();
            ydoc.destroy();
        };
    }, [docId, username, color, ydoc]);

    return { ydoc, provider, isConnected, users };
}
