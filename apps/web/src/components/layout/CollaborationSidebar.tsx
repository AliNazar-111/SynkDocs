'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Users, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { CreateDocumentDialog } from '../ui/CreateDocumentDialog';

/**
 * CollaborationSidebar Component
 * 
 * Displays a list of documents owned by the user or shared with them.
 * Groups documents into "My Documents" and "Shared With Me".
 */

interface Document {
    id: string;
    title: string;
    owner_id: string;
    updated_at: string;
    is_owner: boolean;
}

const CollaborationSidebar = () => {
    const router = useRouter();
    const params = useParams();
    const currentDocId = params?.id;

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Initial fetch of user and documents
        const initialize = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                setUserId(user.id);
                await fetchDocuments(user.id);
            } catch (error) {
                console.error('Initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        initialize();
    }, []);

    /**
     * Create a new document and navigate to it
     */
    const handleConfirmCreate = async (docName: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('documents')
                .insert({
                    owner_id: user.id,
                    title: docName,
                    content: {},
                })
                .select()
                .single();

            if (error) throw error;
            router.push(`/documents/${data.id}`);
            setIsCreateDialogOpen(false);
        } catch (error) {
            console.error('Failed to create document:', error);
            throw error;
        }
    };

    /**
     * Fetch documents where user is owner or collaborator
     */
    const fetchDocuments = async (currentUserId: string) => {
        // Fetch documents owned by the user
        const ownedQuery = supabase
            .from('documents')
            .select('id, title, owner_id, updated_at')
            .eq('owner_id', currentUserId)
            .is('deleted_at', null);

        // Fetch documents shared with the user
        const sharedQuery = supabase
            .from('document_collaborators')
            .select('document_id, documents(id, title, owner_id, updated_at)')
            .eq('user_id', currentUserId);

        const [ownedRes, sharedRes] = await Promise.all([ownedQuery, sharedQuery]);

        if (ownedRes.error) console.error('Error fetching owned docs:', ownedRes.error);
        if (sharedRes.error) console.error('Error fetching shared docs:', sharedRes.error);

        const ownedDocs = (ownedRes.data || []).map(d => ({ ...d, is_owner: true }));

        const sharedDocs = (sharedRes.data || [])
            .map(item => item.documents)
            .filter(Boolean)
            .map((d: any) => ({ ...d, is_owner: false }));

        // Combine and sort by updated_at desc
        const allDocs = [...ownedDocs, ...sharedDocs].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        // Remove duplicates (in case user is both owner and explicitly in collaborators table)
        const uniqueDocs = Array.from(new Map(allDocs.map(item => [item.id, item])).values());

        setDocuments(uniqueDocs);
    };

    const myDocuments = documents.filter(doc => doc.is_owner);
    const sharedDocuments = documents.filter(doc => !doc.is_owner);

    if (loading) {
        return (
            <div className="w-72 h-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 border-r">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <>
            <aside className="w-72 h-full flex flex-col bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">SynkDocs</h1>
                        <button
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Plus size={18} className="text-blue-600" />
                        </button>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest pl-1">
                        Collaboration Hub
                    </div>
                </div>

                {/* Document List */}
                <div className="flex-1 overflow-y-auto pt-4">
                    {/* My Documents Section */}
                    <section className="mb-6">
                        <div className="px-5 mb-2 flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            <FileText size={12} />
                            My Documents
                        </div>
                        <div className="px-2 space-y-0.5">
                            {myDocuments.length === 0 ? (
                                <p className="px-3 py-2 text-[10px] text-gray-400 italic">No owned documents</p>
                            ) : (
                                myDocuments.map(doc => (
                                    <DocumentItem key={doc.id} doc={doc} isActive={currentDocId === doc.id} />
                                ))
                            )}
                        </div>
                    </section>

                    {/* Shared With Me Section */}
                    <section className="mb-6">
                        <div className="px-5 mb-2 flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            <Users size={12} />
                            Shared With Me
                        </div>
                        <div className="px-2 space-y-0.5">
                            {sharedDocuments.length === 0 ? (
                                <p className="px-3 py-2 text-[10px] text-gray-400 italic">No shared documents</p>
                            ) : (
                                sharedDocuments.map(doc => (
                                    <DocumentItem key={doc.id} doc={doc} isActive={currentDocId === doc.id} />
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
                    <div className="text-[10px] text-gray-500 text-center">
                        &copy; 2026 SynkDocs Collaboration
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

interface DocumentItemProps {
    doc: Document;
    isActive: boolean;
}

const DocumentItem = ({ doc, isActive }: DocumentItemProps) => {
    return (
        <Link
            href={`/documents/${doc.id}`}
            className={`group flex flex-col px-3 py-2 rounded-lg transition-all duration-150 ${isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'hover:bg-white dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                }`}
        >
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate flex-1">{doc.title || 'Untitled'}</span>
                {doc.is_owner && !isActive && (
                    <span className="text-[8px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 px-1 rounded uppercase font-bold">Owner</span>
                )}
            </div>
            <div className={`text-[10px] flex items-center gap-1 ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                <span>Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}</span>
            </div>
        </Link>
    );
};

export default CollaborationSidebar;
