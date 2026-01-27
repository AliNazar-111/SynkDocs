'use client';

import React, { useState } from 'react';
import { CommentThread as ThreadType } from '@/types/comment';
import CommentThread from './CommentThread';
import { MessageSquare, CheckCircle, X } from 'lucide-react';

interface CommentsSidebarProps {
    threads: ThreadType[];
    onReply: (threadId: string, content: string) => void;
    onResolve: (threadId: string) => void;
    onReopen: (threadId: string) => void;
    onNewComment: (content: string) => void;
    activeThreadId?: string;
    onClose?: () => void;
}

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
    threads,
    onReply,
    onResolve,
    onReopen,
    onNewComment,
    activeThreadId,
    onClose
}) => {
    const [newCommentContent, setNewCommentContent] = useState('');
    const [showResolved, setShowResolved] = useState(false);

    const activeThreads = threads.filter(t => !t.isResolved);
    const resolvedThreads = threads.filter(t => t.isResolved);

    const displayedThreads = showResolved ? threads : activeThreads;

    const handleNewCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCommentContent.trim()) {
            onNewComment(newCommentContent);
            setNewCommentContent('');
        }
    };

    return (
        <div className="w-80 h-full border-l bg-white dark:bg-gray-950 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare size={16} />
                    Comments
                </h2>
                {onClose && (
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {threads.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <MessageSquare size={32} className="mx-auto mb-2" />
                        <p className="text-xs">No comments yet</p>
                    </div>
                ) : (
                    displayedThreads.map(thread => (
                        <CommentThread
                            key={thread.id}
                            thread={thread}
                            onReply={onReply}
                            onResolve={onResolve}
                            onReopen={onReopen}
                            isActive={thread.id === activeThreadId}
                        />
                    ))
                )}
            </div>

            <div className="p-4 border-t space-y-3">
                {resolvedThreads.length > 0 && (
                    <button
                        onClick={() => setShowResolved(!showResolved)}
                        className="text-[10px] text-muted-foreground hover:text-blue-600 flex items-center gap-1 mx-auto"
                    >
                        <CheckCircle size={12} />
                        {showResolved ? 'Hide' : 'Show'} {resolvedThreads.length} resolved threads
                    </button>
                )}

                <form onSubmit={handleNewCommentSubmit}>
                    <textarea
                        value={newCommentContent}
                        onChange={(e) => setNewCommentContent(e.target.value)}
                        placeholder="Add a comment to selection..."
                        className="w-full text-xs p-2 rounded border border-muted-foreground/20 bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-blue-500 outline-none resize-none min-h-[80px]"
                    />
                    <button
                        type="submit"
                        disabled={!newCommentContent.trim()}
                        className="w-full mt-2 py-1.5 text-xs bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        Comment
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CommentsSidebar;
