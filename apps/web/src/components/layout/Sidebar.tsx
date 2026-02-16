'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useDocumentsData } from '@/hooks/useDocuments';
import { createDocument } from '@/lib/api/documents';
import { CreateDocumentDialog } from '@/components/ui/CreateDocumentDialog';

const Sidebar = () => {
    const router = useRouter();
    const params = useParams();
    const currentDocId = params?.id;
    const { documents, loading } = useDocumentsData();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const handleConfirmCreate = async (docName: string) => {
        try {
            const newDoc = await createDocument(docName, {});
            router.push(`/documents/${newDoc.id}`);
            setIsCreateDialogOpen(false);
        } catch (error) {
            console.error('Failed to create document:', error);
            throw error;
        }
    };

    return (
        <>
            <aside className="w-64 border-r bg-[var(--sidebar-bg)] hidden md:flex flex-col h-[calc(100vh-3.5rem)] sticky top-14">
                <div className="p-4">
                    <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Document
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 mt-4">
                        Recent Documents
                    </div>
                    <div className="space-y-0.5">
                        {loading ? (
                            <div className="px-3 py-4 space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="animate-pulse flex flex-col gap-1.5">
                                        <div className="h-3 w-3/4 bg-muted rounded" />
                                        <div className="h-2 w-1/2 bg-muted/60 rounded" />
                                    </div>
                                ))}
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="px-3 py-4 text-xs text-muted-foreground italic">
                                No documents found
                            </div>
                        ) : (
                            documents.slice(0, 7).map((doc) => (
                                <Link
                                    key={doc.id}
                                    href={`/documents/${doc.id}`}
                                    className={`block w-full text-left px-3 py-2 rounded-md transition-colors group ${currentDocId === doc.id
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'hover:bg-muted/10'
                                        }`}
                                >
                                    <div className="text-sm font-medium truncate">
                                        {doc.title || 'Untitled Document'}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(doc.updated_at || doc.created_at), { addSuffix: true })}
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-muted/20">
                    <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/10 transition-colors cursor-pointer mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs font-medium">Free Tier Status</span>
                    </div>
                </div>
            </aside>

            <CreateDocumentDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onConfirm={handleConfirmCreate}
                existingNames={documents.map(d => d.title)}
            />
        </>
    );
};

export default Sidebar;
