import React from 'react';
import { Document } from '@/types/document';
import Link from 'next/link';

interface DocumentCardProps {
    doc: Document;
    onDelete: (id: string) => void;
    currentUserId?: string;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ doc, onDelete, currentUserId }) => {
    const isOwner = currentUserId && doc.owner_id === currentUserId;
    const formattedDate = new Date(doc.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="group relative bg-[var(--navbar-bg)] border rounded-xl p-5 hover:shadow-md transition-all hover:border-blue-500/50">
            <Link href={`/documents/${doc.id}`} className="block">
                <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    {isOwner && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onDelete(doc.id);
                            }}
                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-md transition-all"
                            title="Delete document"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>

                <h3 className="font-bold text-lg mb-1 truncate pr-6">{doc.title}</h3>
                <p className="text-xs text-muted-foreground">
                    Edited {formattedDate}
                </p>
            </Link>
        </div>
    );
};

export default DocumentCard;
