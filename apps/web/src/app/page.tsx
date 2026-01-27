'use client';

import React, { useState, useEffect } from 'react';
import { Document } from '@/types/document';
import DocumentCard from '@/components/dashboard/DocumentCard';
import EmptyState from '@/components/dashboard/EmptyState';
import { useAuth } from '@/components/providers/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';

const MOCK_DOCS: Document[] = [
    {
        id: '1',
        title: 'Getting Started with SynkDocs',
        owner_id: 'user-1',
        created_at: '2026-01-20T10:00:00Z',
        updated_at: '2026-01-25T14:30:00Z',
    },
    {
        id: '2',
        title: 'Project Roadmap 2026',
        owner_id: 'user-1',
        created_at: '2026-01-15T09:00:00Z',
        updated_at: '2026-01-22T16:45:00Z',
    },
    {
        id: '3',
        title: 'Meeting Notes - Architecture',
        owner_id: 'user-1',
        created_at: '2026-01-24T11:00:00Z',
        updated_at: '2026-01-24T11:30:00Z',
    },
];

export default function DashboardPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate data fetch
        const timer = setTimeout(() => {
            setDocuments(MOCK_DOCS);
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const handleCreateDocument = () => {
        const newDoc: Document = {
            id: Math.random().toString(36).substring(7),
            title: 'Untitled Document',
            owner_id: user?.id || 'anonymous',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setDocuments([newDoc, ...documents]);
    };

    const handleDeleteDocument = (id: string) => {
        if (confirm('Are you sure you want to delete this document?')) {
            setDocuments(documents.filter((doc) => doc.id !== id));
        }
    };

    if (isLoading) {
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
