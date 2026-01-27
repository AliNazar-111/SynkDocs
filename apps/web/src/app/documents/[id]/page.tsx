'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@/components/editor/Editor';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useAuth } from '@/components/providers/AuthContext';
import { CommentThread as ThreadType, Comment } from '@/types/comment';
import CommentsSidebar from '@/components/comments/CommentsSidebar';
import { v4 as uuidv4 } from 'uuid';
import { Version } from '@/types/version';
import VersionHistorySidebar from '@/components/versions/VersionHistorySidebar';
import { History as HistoryIcon } from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function DocumentPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [title, setTitle] = useState('Untitled Document');
    const [isSaving, setIsSaving] = useState(false);
    const [threads, setThreads] = useState<ThreadType[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
    const [showComments, setShowComments] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [versions, setVersions] = useState<Version[]>([]);
    const [previewVersion, setPreviewVersion] = useState<Version | null>(null);

    const docId = typeof id === 'string' ? id : '';
    const username = user?.email?.split('@')[0] || 'Anonymous';

    const { ydoc, provider, isConnected, users: collaborationUsers } = useCollaboration({
        docId,
        username,
    });

    useKeyboardShortcuts([
        {
            combo: { key: '/', ctrl: true },
            action: () => setShowComments(prev => !prev)
        },
        {
            combo: { key: 'h', ctrl: true },
            action: () => setShowHistory(prev => !prev)
        }
    ]);

    // Mock initial load
    useEffect(() => {
        const savedDoc = localStorage.getItem(`doc_${id}`);
        if (savedDoc) {
            const { title } = JSON.parse(savedDoc);
            setTitle(title);
        }
    }, [id]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        autoSave(newTitle);
    };

    const handleContentChange = (content: string) => {
        autoSave(undefined, content);
    };

    const autoSave = (newTitle?: string, content?: string) => {
        setIsSaving(true);
        // Simulate network delay
        setTimeout(() => {
            const existing = JSON.parse(localStorage.getItem(`doc_${id}`) || '{}');
            const data = {
                title: newTitle ?? title,
                content: content ?? existing.content ?? '',
                updated_at: new Date().toISOString(),
            };
            localStorage.setItem(`doc_${id}`, JSON.stringify(data));
            setIsSaving(false);
        }, 500);
    };

    const handleNewComment = (content: string) => {
        const newThread: ThreadType = {
            id: uuidv4(),
            anchorId: uuidv4(), // In a real app, this would be tied to selection range ID
            comments: [{
                id: uuidv4(),
                authorName: username,
                authorEmail: user?.email ?? undefined,
                content,
                createdAt: new Date().toISOString(),
            }],
            isResolved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setThreads([...threads, newThread]);
        setActiveThreadId(newThread.id);
    };

    const handleReply = (threadId: string, content: string) => {
        setThreads(threads.map((t: ThreadType) => {
            if (t.id === threadId) {
                const newComment: Comment = {
                    id: uuidv4(),
                    authorName: username,
                    authorEmail: user?.email ?? undefined,
                    content,
                    createdAt: new Date().toISOString(),
                };
                return {
                    ...t,
                    comments: [...t.comments, newComment],
                    updatedAt: new Date().toISOString(),
                };
            }
            return t;
        }));
    };

    const handleResolve = (threadId: string) => {
        setThreads(threads.map((t: ThreadType) => t.id === threadId ? { ...t, isResolved: true } : t));
    };

    const handleReopen = (threadId: string) => {
        setThreads(threads.map((t: ThreadType) => t.id === threadId ? { ...t, isResolved: false } : t));
    };

    return (
        <div className="flex h-screen bg-[#f8f9fa] dark:bg-[#111111]">
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="max-w-4xl w-full mx-auto pt-8 px-4">
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
                                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                    {isConnected ? (isSaving ? 'Saving...' : 'All changes saved') : 'Connecting...'}
                                </span>
                                <button
                                    onClick={() => router.push('/')}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Back to Dashboard
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
                        initialContent={previewVersion ? previewVersion.content : JSON.parse(localStorage.getItem(`doc_${id}`) || '{}').content}
                        onChange={handleContentChange}
                        readOnly={!!previewVersion}
                    />
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
                    versions={versions}
                    currentVersionId={previewVersion?.id}
                    onVersionSelect={(v: Version) => setPreviewVersion(v)}
                    onRestore={(v: Version) => {
                        handleContentChange(v.content);
                        setPreviewVersion(null);
                        setShowHistory(false);
                    }}
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
