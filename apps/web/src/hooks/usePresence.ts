import { useEffect, useState } from 'react';
import { useCollaboration } from '@/components/providers/CollaborationProvider';
import type { Awareness } from 'y-protocols/awareness';

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
        if (!provider) return;

        const awareness = provider.awareness;

        const updatePresence = () => {
            const states = Array.from(awareness.getStates().entries());

            const presenceUsers: PresenceUser[] = states
                .filter(([_, state]) => state.user) // Only filter out states without user data
                .map(([_, state]) => ({
                    id: state.user?.id || 'anonymous',
                    email: state.user?.email || 'Anonymous',
                    name: state.user?.name,
                    color: state.user?.color || '#' + Math.floor(Math.random() * 16777215).toString(16),
                    cursor: state.cursor,
                    isTyping: state.user?.isTyping,
                }));

            setUsers(presenceUsers);
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
