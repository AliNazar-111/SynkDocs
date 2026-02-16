'use client';

import { useEffect, useState } from 'react';
import { useCollaboration } from '@/components/providers/CollaborationProvider';

export interface PresenceUser {
    id: string;
    email: string;
    name?: string;
    color: string;
    cursor?: {
        x: number;
        y: number;
    };
    isTyping?: boolean;
}

export function usePresence() {
    const { provider } = useCollaboration();
    const [users, setUsers] = useState<PresenceUser[]>([]);

    useEffect(() => {
        if (!provider) {
            setUsers([]);
            return;
        }

        const awareness = provider.awareness;

        const updatePresence = () => {
            const states = Array.from(awareness.getStates().entries());

            // Deduplicate by user ID to show unique people
            const seenUsers = new Map<string, PresenceUser>();

            states.forEach(([clientId, state]: [number, any]) => {
                const userData = state.user;
                if (!userData || !userData.id) return;

                const userId = userData.id;

                // If we haven't seen this user, or if this specific client is typing,
                // prefer this connection's data for the UI representation.
                if (!seenUsers.has(userId) || userData.isTyping) {
                    seenUsers.set(userId, {
                        id: userId,
                        email: userData.email || 'Anonymous',
                        name: userData.name,
                        color: userData.color || '#cccccc',
                        cursor: state.cursor,
                        isTyping: userData.isTyping,
                    });
                }
            });

            setUsers(Array.from(seenUsers.values()));
        };

        awareness.on('change', updatePresence);
        updatePresence();

        return () => {
            awareness.off('change', updatePresence);
        };
    }, [provider]);

    // Update local user presence
    const updateLocalPresence = (data: Partial<PresenceUser>) => {
        if (!provider) return;

        const awareness = provider.awareness;
        const currentState = awareness.getLocalState() || {};

        awareness.setLocalStateField('user', {
            ...currentState.user,
            ...data,
        });
    };

    return {
        users,
        updatePresence: updateLocalPresence,
    };
}
