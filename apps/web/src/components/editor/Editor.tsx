'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { Mark, mergeAttributes, Extension } from '@tiptap/core';
import Typography from '@tiptap/extension-typography';
import Toolbar from './Toolbar';
import PresenceBar from './PresenceBar';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { PresenceUser } from '@/hooks/usePresence';
import { CommentThread } from '@/types/comment';
import { EditorView } from '@tiptap/pm/view';
import { useAuth } from '@/components/providers/AuthContext';

// Custom Extension to handle Tab key (Word-like behavior)
const TabExtension = Extension.create({
    name: 'tabHandler',
    addKeyboardShortcuts() {
        return {
            Tab: () => {
                return this.editor.commands.insertContent('\t');
            },
        };
    },
});

// Custom Comment Mark
const CommentMark = Mark.create({
    name: 'comment',

    addAttributes() {
        return {
            threadId: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-thread-id'),
                renderHTML: (attributes: Record<string, any>) => {
                    if (!attributes.threadId) {
                        return {};
                    }

                    return {
                        'data-thread-id': attributes.threadId,
                        class: 'bg-yellow-200/50 dark:bg-yellow-900/30 border-b-2 border-yellow-400 cursor-pointer',
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-thread-id]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
        return ['span', mergeAttributes(HTMLAttributes), 0];
    },
});

interface EditorProps {
    ydoc?: Y.Doc | null;
    provider?: WebsocketProvider | null;
    users?: PresenceUser[];
    threads?: CommentThread[];
    onThreadClick?: (threadId: string) => void;
    onNewComment?: (threadId: string) => void;
    initialContent?: any;
    onChange?: (content: string) => void;
    readOnly?: boolean;
    forceContent?: any;
    isSynced?: boolean;
    isConnected?: boolean;
}

/**
 * Pure Yjs Synchronized Editor
 * 
 * DESIGN PRINCIPLES (Senior Real-Time Engineer):
 * 1. Yjs is the SINGLE source of truth.
 * 2. NO manual content synchronization (setContent, onUpdate manual sync).
 * 3. NO manual broadcasting of editor state.
 * 4. TipTap binds DIRECTLY to the Yjs document fragment.
 * 5. This prevents duplication bugs caused by race conditions between database and real-time sync.
 */
const Editor: React.FC<EditorProps> = ({
    ydoc,
    provider,
    users = [],
    threads = [],
    onThreadClick,
    onNewComment,
    initialContent = '',
    onChange,
    readOnly = false,
    forceContent = null,
    isSynced = false,
    isConnected = false
}: EditorProps) => {
    const { user } = useAuth();

    // Initialize extensions BEFORE creating the editor instance.
    // We treat the Collaboration extension as the ONLY way content enters/leaves the editor.
    const extensions = React.useMemo(() => {
        if (!ydoc) return [];

        return [
            StarterKit.configure({
                history: false, // Yjs handles history/undo internally via Collaboration extension
            }),
            Typography,
            TabExtension,
            Placeholder.configure({
                placeholder: 'Start typing something amazing...',
            }),
            CommentMark,
            Collaboration.configure({
                document: ydoc,
                field: 'default',
            }),
            ...(provider ? [
                CollaborationCursor.configure({
                    provider: provider,
                    user: provider.awareness.getLocalState()?.user,
                })
            ] : []),
        ];
    }, [ydoc, provider]);

    const editor = useEditor({
        extensions,
        // Senior Engineer Fix: 
        // We initialize the editor content ONLY if useEditor is mounting for the first time
        // AND the Yjs document is empty. This effectively "seeds" the Yjs doc
        // from the database without using setContent() after initialization.
        content: ydoc?.getXmlFragment('default').length === 0 ? initialContent : undefined,
        editable: !readOnly,
        // No manual content synchronization is performed here.
        // The Collaboration extension handles all property bindings to Yjs.
        onUpdate: ({ editor, transaction }) => {
            // Awareness updates (typing indicators) are allowed
            if (provider) {
                const localState = provider.awareness.getLocalState();
                if (localState && !localState.user?.isTyping) {
                    provider.awareness.setLocalStateField('user', {
                        ...localState.user,
                        isTyping: true,
                    });
                }
            }

            // Only trigger onChange for LOCAL changes to support database persistence.
            // We EXPLICITLY filter out changes coming from the Yjs sync engine (y-sync$).
            if (transaction.docChanged && !transaction.getMeta('y-sync$')) {
                onChange?.(JSON.stringify(editor.getJSON()));
            }
        },
        editorProps: {
            handleClick: (view: EditorView, pos: number, event: MouseEvent) => {
                const { state } = view;
                const posAt = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (!posAt) return false;

                const node = state.doc.nodeAt(posAt.pos);
                if (!node) return false;

                const mark = node.marks.find((m: any) => m.type.name === 'comment');
                if (mark?.attrs.threadId) {
                    onThreadClick?.(mark.attrs.threadId);
                    return true;
                }
                return false;
            },
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl w-full max-w-none focus:outline-none min-h-[500px] p-8 md:p-12 whitespace-pre-wrap',
            },
        },
    }, [extensions]);

    // Handle editable state reactively
    React.useEffect(() => {
        if (editor) editor.setEditable(!readOnly);
    }, [editor, readOnly]);

    // Force content should only be used for manual overrides like History Restoration.
    // It is NEVER used for initial document loading in the Pure Yjs model.
    React.useEffect(() => {
        if (editor && forceContent) {
            console.log('⚡ Yjs: Explicit content restoration triggered');
            editor.commands.setContent(forceContent);
        }
    }, [editor, forceContent]);

    // Senior Engineer requirement: Ensure we don't render a broken state if editor isn't ready.
    if (!editor) return null;

    return (
        <div className="flex flex-col flex-1 h-full min-h-0 w-full bg-[var(--navbar-bg)] shadow-sm border rounded-b-none md:rounded-b-lg overflow-hidden">
            <PresenceBar users={users} />
            <Toolbar editor={editor} />
            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 custom-scrollbar relative">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default Editor;
