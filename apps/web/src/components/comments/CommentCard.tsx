'use client';

import React from 'react';
import { Comment } from '@/types/comment';

interface CommentCardProps {
    comment: Comment;
}

const CommentCard: React.FC<CommentCardProps> = ({ comment }) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xs uppercase">
                {comment.authorName.charAt(0)}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {comment.authorName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {formatDate(comment.createdAt)}
                    </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {comment.content}
                </p>
            </div>
        </div>
    );
};

export default React.memo(CommentCard);
