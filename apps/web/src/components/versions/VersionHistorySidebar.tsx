'use client';

import React from 'react';
import { Version } from '@/types/version';
import VersionItem from './VersionItem';
import { History, X, RotateCcw } from 'lucide-react';

interface VersionHistorySidebarProps {
    versions: Version[];
    currentVersionId?: string;
    onVersionSelect: (version: Version) => void;
    onRestore: (version: Version) => void;
    onClose: () => void;
    isPreviewMode?: boolean;
}

const VersionHistorySidebar: React.FC<VersionHistorySidebarProps> = ({
    versions,
    currentVersionId,
    onVersionSelect,
    onRestore,
    onClose,
    isPreviewMode
}) => {
    const activeVersion = versions.find(v => v.id === currentVersionId);

    return (
        <div className="w-80 h-full border-l bg-gray-50 dark:bg-gray-950 flex flex-col shadow-xl">
            <div className="p-4 border-b bg-white dark:bg-gray-900 flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <History size={16} />
                    Version History
                </h2>
                <button
                    onClick={onClose}
                    aria-label="Close version history"
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {versions.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <History size={32} className="mx-auto mb-2" />
                        <p className="text-xs">No version history yet</p>
                    </div>
                ) : (
                    versions.map((v) => (
                        <VersionItem
                            key={v.id}
                            version={v}
                            isActive={v.id === currentVersionId}
                            onClick={onVersionSelect}
                        />
                    ))
                )}
            </div>

            {isPreviewMode && activeVersion && (
                <div className="p-4 border-t bg-white dark:bg-gray-900 space-y-3">
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50">
                        <p className="text-[10px] leading-tight text-amber-700 dark:text-amber-400">
                            You are viewing a previous version. Live collaboration is paused.
                        </p>
                    </div>

                    <div className="px-1 py-2 space-y-1.5 text-xs text-muted-foreground border-b border-gray-100 dark:border-gray-800 mb-2">
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Version ID:</span>
                            <span className="font-mono text-[10px]">{activeVersion.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                            <span>{new Date(activeVersion.timestamp).toLocaleString(undefined, {
                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Author:</span>
                            <span className="truncate max-w-[150px]" title={activeVersion.authorEmail}>{activeVersion.authorName}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => onRestore(activeVersion)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        <RotateCcw size={14} />
                        Restore this version
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel Preview
                    </button>
                </div>
            )}
        </div>
    );
};

export default VersionHistorySidebar;
