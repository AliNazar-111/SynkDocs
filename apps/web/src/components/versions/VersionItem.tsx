'use client';

import React from 'react';
import { Version } from '@/types/version';
import { Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VersionItemProps {
    version: Version;
    isActive?: boolean;
    onClick: (version: Version) => void;
}

const VersionItem: React.FC<VersionItemProps> = ({ version, isActive, onClick }) => {
    return (
        <button
            onClick={() => onClick(version)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${isActive
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-1 ring-blue-500/20'
                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800'
                }`}
        >
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {version.label || 'Auto-saved version'}
                </span>
                {isActive && (
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                        Active
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User size={12} />
                    {version.authorName}
                </div>
            </div>
        </button>
    );
};

export default React.memo(VersionItem);
