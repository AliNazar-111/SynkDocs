'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { Mark, mergeAttributes } from '@tiptap/core';
import Toolbar from './Toolbar';
import PresenceBar from './PresenceBar';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { PresenceUser } from '@/hooks/useCollaboration';
import { CommentThread } from '@/types/comment';
import { EditorView } from '@tiptap/pm/view';

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
    ydoc?: Y.Doc;
    provider?: WebsocketProvider | null;
    users?: PresenceUser[];
    threads?: CommentThread[];
    onThreadClick?: (threadId: string) => void;
    onNewComment?: (threadId: string) => void;
    initialContent?: string;
    onChange?: (content: string) => void;
    readOnly?: boolean;
}

const Editor: React.FC<EditorProps> = ({
    ydoc,
    provider,
    users = [],
    threads = [],
    onThreadClick,
    onNewComment,
    initialContent = '',
    onChange,
    readOnly = false
}: EditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false, // Collaboration handles history internally
            }),
            Placeholder.configure({
                placeholder: 'Start typing something amazing...',
            }),
            CommentMark,
            ...(ydoc ? [
                Collaboration.configure({
                    document: ydoc,
                })
            ] : []),
            ...(provider ? [
                CollaborationCursor.configure({
                    provider: provider,
                    user: provider.awareness.getLocalState()?.user,
                })
            ] : []),
        ],
        content: ydoc ? undefined : initialContent,
        editable: !readOnly,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());

            // Handle typing indicator
            if (provider) {
                provider.awareness.setLocalStateField('user', {
                    ...provider.awareness.getLocalState()?.user,
                    isTyping: true,
                });

                // Clear typing indicator after 2 seconds of inactivity
                const timeout = setTimeout(() => {
                    provider.awareness.setLocalStateField('user', {
                        ...provider.awareness.getLocalState()?.user,
                        isTyping: false,
                    });
                }, 2000);

                return () => clearTimeout(timeout);
            }
        },
        onSelectionUpdate: ({ editor: currentEditor }: { editor: any }) => {
            // Optional: highight matching thread in sidebar
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
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-8 md:p-12',
            },
        },
    });

    // Update editable state when readOnly prop changes
    React.useEffect(() => {
        if (editor) {
            editor.setEditable(!readOnly);
        }
    }, [editor, readOnly]);

    // Force content update when not in collaboration mode (e.g. previewing history)
    React.useEffect(() => {
        if (editor && !ydoc && initialContent) {
            editor.commands.setContent(initialContent);
        }
    }, [editor, ydoc, initialContent]);

    return (
        <div className="flex flex-col flex-1 h-full max-w-4xl mx-auto bg-[var(--navbar-bg)] shadow-sm border rounded-b-none md:rounded-b-lg overflow-hidden">
            <PresenceBar users={users} />
            <Toolbar editor={editor} />
            <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default Editor;
