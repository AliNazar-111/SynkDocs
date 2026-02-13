'use client';

import React from 'react';
import { PresenceUser } from '@/hooks/usePresence';

interface PresenceBarProps {
    users: PresenceUser[];
}

const PresenceBar: React.FC<PresenceBarProps> = ({ users }) => {
    return (
        <div className="flex items-center -space-x-2 overflow-hidden px-4 py-2 border-b bg-[var(--navbar-bg)]">
            {users.map((user) => (
                <div
                    key={user.id}
                    className="relative inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-900 group"
                    style={{ backgroundColor: user.color }}
                    title={user.name || user.email}
                >
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white uppercase">
                        {(user.name || user.email || 'A').charAt(0)}
                    </div>

                    {user.isTyping && (
                        <div className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-900 animate-bounce">
                            <span className="sr-only">Typing</span>
                            <div className="h-1 w-1 bg-white rounded-full"></div>
                        </div>
                    )}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block transition-all">
                        <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                            {user.name || user.email}
                        </div>
                    </div>
                </div>
            ))}

            {users.length > 5 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900 text-[10px] font-medium text-gray-500">
                    +{users.length - 5}
                </div>
            )}

            <div className="ml-6 text-xs text-muted-foreground hidden sm:block" style={{ padding: '0 17px' }}>
                {users.length} collaborator{users.length !== 1 ? 's' : ''} online
            </div>
        </div>
    );
};

export default PresenceBar;
