'use client';

import React, { useState } from 'react';
import { CommentThread as ThreadType } from '@/types/comment';
import CommentCard from './CommentCard';

interface CommentThreadProps {
    thread: ThreadType;
    onReply: (threadId: string, content: string) => void;
    onResolve: (threadId: string) => void;
    onReopen: (threadId: string) => void;
    isActive?: boolean;
}

const CommentThread: React.FC<CommentThreadProps> = ({
    thread,
    onReply,
    onResolve,
    onReopen,
    isActive
}) => {
    const [replyContent, setReplyContent] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (replyContent.trim()) {
            onReply(thread.id, replyContent);
            setReplyContent('');
            setIsReplying(false);
        }
    };

    if (thread.isResolved) {
        return (
            <div className="border border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10 rounded-lg p-3 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Thread resolved</span>
                    <button
                        onClick={() => onReopen(thread.id)}
                        className="text-[10px] text-blue-600 hover:underline"
                    >
                        Reopen
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`border rounded-lg overflow-hidden transition-all shadow-sm ${isActive
                ? 'ring-2 ring-blue-500 border-transparent bg-white dark:bg-gray-800'
                : 'border-muted-foreground/10 bg-gray-50/50 dark:bg-gray-900/50'
            }`}>
            <div className="divide-y divide-muted-foreground/10">
                {thread.comments.map((comment) => (
                    <CommentCard key={comment.id} comment={comment} />
                ))}
            </div>

            <div className="p-2 border-t border-muted-foreground/10 bg-white/50 dark:bg-black/20 flex gap-2">
                {!isReplying ? (
                    <div className="flex w-full items-center justify-between">
                        <button
                            onClick={() => setIsReplying(true)}
                            className="text-xs text-muted-foreground hover:text-blue-600 px-2 py-1"
                        >
                            Reply...
                        </button>
                        <button
                            onClick={() => onResolve(thread.id)}
                            className="text-[10px] text-green-600 font-medium hover:bg-green-100 dark:hover:bg-green-900/30 px-2 py-1 rounded transition-colors"
                        >
                            Resolve
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="w-full">
                        <textarea
                            autoFocus
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="w-full text-sm bg-transparent border-none outline-none focus:ring-0 resize-none min-h-[60px]"
                        />
                        <div className="flex justify-end gap-2 mt-1">
                            <button
                                type="button"
                                onClick={() => setIsReplying(false)}
                                className="px-2 py-1 text-xs text-muted-foreground hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!replyContent.trim()}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                Reply
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CommentThread;
