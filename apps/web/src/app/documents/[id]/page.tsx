'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@/components/editor/Editor';
import { CollaborationProvider, useCollaboration } from '@/components/providers/CollaborationProvider';
import { useAuth } from '@/components/providers/AuthContext';
import { useAutoSave } from '@/hooks/useAutoSave';
import { usePresence } from '@/hooks/usePresence';
import { useDocument } from '@/hooks/useDocuments';
import { useComments } from '@/hooks/useComments';
import { useVersions } from '@/hooks/useVersions';
import { createComment, resolveComment, unresolveComment } from '@/lib/api/comments';
import { restoreVersion } from '@/lib/api/versions';
import { updateDocument } from '@/lib/api/documents';
import CommentsSidebar from '@/components/comments/CommentsSidebar';
import VersionHistorySidebar from '@/components/versions/VersionHistorySidebar';
import { History as HistoryIcon, UserPlus } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { InviteDialog } from '@/components/editor/InviteDialog';

function DocumentContent() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const docId = typeof id === 'string' ? id : '';

    // Fetch document data
    const { document, loading: docLoading } = useDocument(docId);
    const { comments, loading: commentsLoading } = useComments(docId);
    const { versions, loading: versionsLoading, refetch: refetchVersions } = useVersions(docId);

    // UI state
    const [title, setTitle] = useState('Untitled Document');
    const [content, setContent] = useState<any>(null);
    const [showComments, setShowComments] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
    const [previewVersion, setPreviewVersion] = useState<any | null>(null);
    const [forceContent, setForceContent] = useState<any | null>(null);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [isSavingLocal, setIsSavingLocal] = useState(false);

    // Collaboration state
    const { ydoc, provider, isConnected, isSynced, error: collabError } = useCollaboration();
    const { users: collaborationUsers } = usePresence();
    const { save: manualSave, editCount } = useAutoSave({
        documentId: docId,
        title: document?.title || 'Untitled Document',
        content: content,
        enabled: !!document,
    });

    // Pure Yjs Seeding: If the document is empty after first sync, seed it from Supabase.
    useEffect(() => {
        if (isSynced && ydoc && document?.content) {
            const fragment = ydoc.getXmlFragment('default');
            if (fragment.length === 0) {
                console.log('🌱 Yjs: Seeding empty document from Supabase source');
                // The actual seeding should happen via Yjs types or TipTap initialization.
                // Since TipTap is the one that knows how to map JSON to Yjs, 
                // we'll let the Editor handle the VERY first mapping if needed,
                // but strictly following "No setContent after attached" rules.
            }
        }
    }, [isSynced, ydoc, document]);

    // Load document data
    useEffect(() => {
        if (document) {
            setTitle(document.title);
        }
    }, [document]);

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            combo: { key: '/', ctrl: true },
            action: () => setShowComments(prev => !prev)
        },
        {
            combo: { key: 'h', ctrl: true },
            action: () => setShowHistory(prev => !prev)
        },
        {
            combo: { key: 's', ctrl: true },
            action: () => manualSave()
        }
    ]);

    const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);

        // Update in Supabase
        try {
            await updateDocument(docId, { title: newTitle });
        } catch (error) {
            console.error('Failed to update title:', error);
        }
    };

    const handleNewComment = async (content: string) => {
        try {
            const newComment = await createComment(docId, content);
            setActiveThreadId(newComment.thread_id);
        } catch (error) {
            console.error('Failed to create comment:', error);
        }
    };

    const handleReply = async (threadId: string, content: string) => {
        try {
            await createComment(docId, content, threadId);
        } catch (error) {
            console.error('Failed to reply:', error);
        }
    };

    const handleResolve = async (threadId: string) => {
        try {
            await resolveComment(threadId);
        } catch (error) {
            console.error('Failed to resolve comment:', error);
        }
    };

    const handleReopen = async (threadId: string) => {
        try {
            await unresolveComment(threadId);
        } catch (error) {
            console.error('Failed to reopen comment:', error);
        }
    };

    const handleRestoreVersion = async (version: any) => {
        try {
            await restoreVersion(version.id);

            // Apply content to live editor to sync with peers
            setForceContent(version.content);

            // Reset forceContent after a short delay so it can be triggered again
            setTimeout(() => setForceContent(null), 100);

            setPreviewVersion(null);
            setShowHistory(false);
            await refetchVersions();
        } catch (error) {
            console.error('Failed to restore version:', error);
        }
    };

    if (docLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!document) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Document not found</h2>
                    <button
                        onClick={() => router.push('/')}
                        className="text-blue-600 hover:underline"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Group comments by thread
    const threads = comments.reduce((acc, comment) => {
        const existing = acc.find(t => t.id === comment.thread_id);
        if (existing) {
            existing.comments.push({
                id: comment.id,
                userId: comment.user_id,
                authorName: comment.user?.full_name || comment.user?.email || 'Anonymous',
                authorEmail: comment.user?.email,
                content: comment.content,
                createdAt: comment.created_at,
            });
        } else if (!comment.parent_id) {
            acc.push({
                id: comment.thread_id,
                anchorId: comment.position_data?.toString() || '',
                rootAuthorId: comment.user_id,
                comments: [{
                    id: comment.id,
                    userId: comment.user_id,
                    authorName: comment.user?.full_name || comment.user?.email || 'Anonymous',
                    authorEmail: comment.user?.email,
                    content: comment.content,
                    createdAt: comment.created_at,
                }],
                isResolved: !!comment.resolved_at,
                createdAt: comment.created_at,
                updatedAt: comment.updated_at,
            });
        }
        return acc;
    }, [] as any[]);

    // Map database versions to Version type
    const mappedVersions = versions.map(v => ({
        id: v.id,
        timestamp: v.created_at,
        authorName: v.user?.full_name || v.user?.email || 'Anonymous',
        authorEmail: v.user?.email,
        content: v.content as unknown as string, // Cast Json to string for the editor
        label: v.title || v.change_summary || undefined
    }));

    return (
        <div className="flex h-full bg-[#f8f9fa] dark:bg-[#111111] overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col w-full pt-8 px-8 min-h-0 overflow-hidden">
                    {collabError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
                            <p className="text-sm font-medium">⚠️ {collabError}</p>
                            <button
                                onClick={() => router.push('/')}
                                className="text-sm underline hover:no-underline"
                            >
                                Go Back
                            </button>
                        </div>
                    )}
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={title}
                                onChange={handleTitleChange}
                                className="w-full text-3xl font-bold bg-transparent border-none outline-none focus:ring-0 placeholder:opacity-50"
                                placeholder="Enter document title..."
                            />
                            <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${isConnected && isSynced ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                    {!isConnected ? 'Offline' : !isSynced ? 'Syncing...' : editCount > 0 ? `${editCount} unsaved changes` : 'All changes saved'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {collaborationUsers.length} active user{collaborationUsers.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={() => router.push('/')}
                                    className="text-xs text-muted-foreground hover:text-blue-600 transition-colors"
                                >
                                    Back to Dashboard
                                </button>
                                <button
                                    onClick={async () => {
                                        setIsSavingLocal(true);
                                        await manualSave();
                                        setTimeout(() => setIsSavingLocal(false), 1000);
                                    }}
                                    disabled={isSavingLocal}
                                    className={`text-xs font-bold transition-all flex items-center gap-1 ${isSavingLocal ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:underline'}`}
                                    title="Shortcut: Ctrl+S"
                                >
                                    {isSavingLocal ? (
                                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                        </svg>
                                    )}
                                    {isSavingLocal ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    onClick={() => setShowComments(!showComments)}
                                    className="text-xs text-muted-foreground hover:underline"
                                >
                                    {showComments ? 'Hide Comments' : 'Show Comments'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowHistory(!showHistory);
                                        if (showComments) setShowComments(false);
                                    }}
                                    className={`text-xs flex items-center gap-1 ${showHistory ? 'text-blue-600 font-medium' : 'text-muted-foreground hover:underline'}`}
                                >
                                    <HistoryIcon size={12} />
                                    History
                                </button>
                                {document?.owner_id === user?.id && (
                                    <button
                                        onClick={() => setIsInviteDialogOpen(true)}
                                        className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                                    >
                                        <UserPlus size={12} />
                                        Invite
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <InviteDialog
                        isOpen={isInviteDialogOpen}
                        onClose={() => setIsInviteDialogOpen(false)}
                        documentId={docId}
                    />

                    {provider && (isSynced || !isConnected) && document ? (
                        <Editor
                            ydoc={ydoc}
                            provider={provider}
                            users={collaborationUsers}
                            threads={threads}
                            onThreadClick={(id: string) => {
                                setActiveThreadId(id);
                                setShowComments(true);
                                setShowHistory(false);
                            }}
                            initialContent={previewVersion ? previewVersion.content : document.content}
                            forceContent={forceContent}
                            onChange={(json) => setContent(json)}
                            readOnly={!!previewVersion}
                            isSynced={isSynced}
                            isConnected={isConnected}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[500px] bg-[var(--navbar-bg)] rounded-lg border border-dashed">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-sm text-muted-foreground font-medium">
                                {!isConnected ? 'Connecting to coordination server...' : 'Synchronizing document content...'}
                            </p>
                            {/* Safety hatch for stuck connections */}
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 text-xs text-blue-600 underline hover:no-underline"
                            >
                                Stuck? Click to reload
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showComments && (
                <CommentsSidebar
                    threads={threads}
                    onReply={handleReply}
                    onResolve={handleResolve}
                    onReopen={handleReopen}
                    onNewComment={handleNewComment}
                    activeThreadId={activeThreadId}
                    onClose={() => setShowComments(false)}
                />
            )}

            {showHistory && (
                <VersionHistorySidebar
                    versions={mappedVersions}
                    currentVersionId={previewVersion?.id}
                    onVersionSelect={(v) => setPreviewVersion(v)}
                    onRestore={handleRestoreVersion}
                    onClose={() => {
                        setShowHistory(false);
                        setPreviewVersion(null);
                    }}
                    isPreviewMode={!!previewVersion}
                />
            )}
        </div>
    );
}

export default function DocumentPage() {
    const { id } = useParams();
    const docId = typeof id === 'string' ? id : '';

    return (
        <CollaborationProvider documentId={docId}>
            <DocumentContent />
        </CollaborationProvider>
    );
}
