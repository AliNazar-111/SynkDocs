'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@/components/editor/Editor';
import { CollaborationProvider, useCollaboration } from '@/components/providers/CollaborationProvider';
import { useAuth } from '@/components/providers/AuthContext';
import { useAutoSave } from '@/hooks/useAutoSave';
import { usePresence } from '@/hooks/usePresence';
import { useDocumentData as useDocument } from '@/hooks/useDocuments';
import { useComments } from '@/hooks/useComments';
import { useVersionsData as useVersions } from '@/hooks/useVersions';
import { createComment, resolveComment, unresolveComment } from '@/lib/api/comments';
import { restoreVersion } from '@/lib/api/versions';
import { updateDocument } from '@/lib/api/documents';
import CommentsSidebar from '@/components/comments/CommentsSidebar';
import VersionHistorySidebar from '@/components/versions/VersionHistorySidebar';
import { History as HistoryIcon, Save } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

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
    const [showComments, setShowComments] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
    const [previewVersion, setPreviewVersion] = useState<any | null>(null);
    const [forceContent, setForceContent] = useState<any | null>(null);
    const [editorJson, setEditorJson] = useState<string | null>(null);

    // Collaboration state
    const { ydoc, provider, isConnected, isSynced, error: collabError } = useCollaboration();
    const { users: collaborationUsers } = usePresence();
    const { save: manualSave, editCount } = useAutoSave({
        documentId: docId,
        title: document?.title || 'Untitled Document',
        content: editorJson,
        enabled: !!document, // Decoupled from isSynced to allow saving offline
    });

    // Loading gate state - Moved UP before conditional returns
    const [forceShow, setForceShow] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setForceShow(true), 10000);
        return () => clearTimeout(timer);
    }, []);

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

    // Group comments by thread
    const threads = comments.reduce((acc, comment) => {
        const existing = acc.find(t => t.id === comment.thread_id);
        if (existing) {
            existing.comments.push({
                id: comment.id,
                authorName: comment.user?.full_name || comment.user?.email || 'Anonymous',
                authorEmail: comment.user?.email,
                content: comment.content,
                createdAt: comment.created_at,
            });
        } else if (!comment.parent_id) {
            acc.push({
                id: comment.thread_id,
                anchorId: comment.position_data?.toString() || '',
                comments: [{
                    id: comment.id,
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

    // Conditional Returns
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

    const isReady = (isConnected && isSynced) || forceShow;

    if (!isReady) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4 bg-[#f8f9fa] dark:bg-[#111111]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div className="text-muted-foreground text-sm flex flex-col items-center gap-1">
                    <p>Loading document...</p>
                    <div className="text-xs opacity-70 flex flex-col items-center">
                        <span>{isConnected ? 'Connected to server ✓' : 'Connecting to server...'}</span>
                        <span>{isSynced ? 'Synced ✓' : 'Syncing changes...'}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#f8f9fa] dark:bg-[#111111]">
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="max-w-4xl w-full mx-auto pt-8 px-4">
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
                                    {editCount > 0
                                        ? `${editCount} unsaved changes`
                                        : !isConnected
                                            ? 'Offline (Saved)'
                                            : !isSynced
                                                ? 'Syncing...'
                                                : 'All changes saved'
                                    }
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {collaborationUsers.length} active user{collaborationUsers.length !== 1 ? 's' : ''}
                                </span>
                                <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
                                <button
                                    onClick={() => manualSave()}
                                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                    title="Save to database (Ctrl+S)"
                                >
                                    <Save size={14} />
                                    Save
                                </button>
                                <button
                                    onClick={() => router.push('/')}
                                    className="text-xs text-muted-foreground hover:underline"
                                >
                                    Dashboard
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
                            </div>
                        </div>
                    </div>

                    {
                        ydoc && document ? (
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
                                onChange={setEditorJson}
                                readOnly={!!previewVersion}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[500px] bg-[var(--navbar-bg)] rounded-lg border border-dashed">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                                <p className="text-sm text-muted-foreground font-medium">
                                    {!document ? 'Loading document...' : 'Initializing collaboration...'}
                                </p>
                            </div>
                        )
                    }

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

            {
                showHistory && (
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
                )
            }
        </div>
    );
}

export default function DocumentPage() {
    const { id } = useParams();
    const docId = typeof id === 'string' ? id : '';

    return (
        <CollaborationProvider key={docId} documentId={docId}>
            <DocumentContent />
        </CollaborationProvider>
    );
}
