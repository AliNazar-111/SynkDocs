// Example usage of CollaborationProvider with TipTap editor

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { CollaborationProvider, useCollaboration } from '@/components/providers/CollaborationProvider';
import { useAutoSave } from '@/hooks/useAutoSave';
import { usePresence } from '@/hooks/usePresence';
import * as Y from 'yjs';

function CollaborativeEditor({ documentId, title }: { documentId: string; title: string }) {
    const { ydoc, isConnected, isSynced } = useCollaboration();
    const { users } = usePresence();
    const { save, editCount } = useAutoSave({ documentId, title });

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false, // Yjs handles undo/redo
            }),
            Collaboration.configure({
                document: ydoc!,
            }),
            CollaborationCursor.configure({
                provider: null, // Provider is handled separately
                user: {
                    name: 'Current User',
                    color: '#f86734',
                },
            }),
        ],
        editorProps: {
            attributes: {
                class: 'prose max-w-none focus:outline-none p-4',
            },
        },
    }, [ydoc]);

    if (!ydoc) {
        return <div>Loading collaboration...</div>;
    }

    return (
        <div>
            {/* Connection status */}
            <div className="flex items-center gap-4 p-2 border-b">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">
                        {isConnected ? (isSynced ? 'Synced' : 'Syncing...') : 'Disconnected'}
                    </span>
                </div>

                {/* Active users */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{users.length} active user{users.length !== 1 ? 's' : ''}</span>
                    <div className="flex -space-x-2">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                                style={{ backgroundColor: user.color }}
                                title={user.email}
                            >
                                {user.email[0].toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Save status */}
                <div className="ml-auto text-xs text-gray-500">
                    {editCount > 0 ? `${editCount} unsaved changes` : 'All changes saved'}
                </div>

                {/* Manual save button */}
                <button
                    onClick={save}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Save
                </button>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />
        </div>
    );
}

// Usage in page
export default function DocumentPage({ params }: { params: { id: string } }) {
    return (
        <CollaborationProvider documentId={params.id}>
            <CollaborativeEditor documentId={params.id} title="My Document" />
        </CollaborationProvider>
    );
}
