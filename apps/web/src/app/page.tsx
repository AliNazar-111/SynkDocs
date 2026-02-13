'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DocumentCard from '@/components/dashboard/DocumentCard';
import EmptyState from '@/components/dashboard/EmptyState';
import { useAuth } from '@/components/providers/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDocuments, useDocumentsData } from '@/hooks/useDocuments';
import { createDocument, deleteDocument } from '@/lib/api/documents';

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { documents, loading, error, refetch } = useDocumentsData();

    const handleCreateDocument = async () => {
        try {
            const newDoc = await createDocument('Untitled Document', {});

            // Navigate to the new document
            router.push(`/documents/${newDoc.id}`);
        } catch (error) {
            console.error('Failed to create document:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to create document: ${message}`);
        }
    };

    const handleDeleteDocument = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            await deleteDocument(id);
            await refetch(); // Refresh the list
        } catch (error) {
            console.error('Failed to delete document:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to delete document: ${message}`);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-44 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex flex-col items-center justify-center h-64">
                    <h2 className="text-2xl font-bold mb-2">Failed to load documents</h2>
                    <p className="text-muted-foreground mb-4">
                        {error instanceof Error ? error.message : String(error)}
                    </p>
                    <button
                        onClick={() => refetch()}
                        className="text-blue-600 hover:underline"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">My Documents</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage your collaborative documents in one place.
                    </p>
                </div>

                {documents.length > 0 && (
                    <button
                        onClick={handleCreateDocument}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Document
                    </button>
                )}
            </div>

            {documents.length === 0 ? (
                <EmptyState onCreate={handleCreateDocument} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                    {documents.map((doc) => (
                        <DocumentCard
                            key={doc.id}
                            doc={doc}
                            onDelete={handleDeleteDocument}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
