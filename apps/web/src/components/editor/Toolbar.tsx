'use client';

import React from 'react';
import { type Editor } from '@tiptap/react';
import { MessageSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ToolbarProps {
    editor: Editor | null;
}

const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
    if (!editor) return null;

    const buttons = [
        {
            label: 'Bold',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                </svg>
            ),
            onClick: () => editor.chain().focus().toggleBold().run(),
            isActive: editor.isActive('bold'),
        },
        {
            label: 'Italic',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 0h-4m-4 16h4" />
                </svg>
            ),
            onClick: () => editor.chain().focus().toggleItalic().run(),
            isActive: editor.isActive('italic'),
        },
        {
            label: 'List',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            ),
            onClick: () => editor.chain().focus().toggleBulletList().run(),
            isActive: editor.isActive('bulletList'),
        },
        {
            label: 'Comment',
            icon: <MessageSquare className="w-5 h-5" />,
            onClick: () => {
                const threadId = uuidv4();
                editor.chain().focus().setMark('comment', { threadId }).run();
            },
            isActive: editor.isActive('comment'),
        },
    ];

    return (
        <div className="sticky top-0 z-10 bg-[var(--navbar-bg)] border-b px-4 py-2 flex items-center gap-1 shadow-sm overflow-x-auto no-scrollbar">
            <div className="flex items-center border-r pr-2 mr-2 gap-1">
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    aria-label="Toggle Heading 1"
                    className={`p-1.5 rounded transition-colors text-sm font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-muted/10'
                        }`}
                >
                    H1
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    aria-label="Toggle Heading 2"
                    className={`p-1.5 rounded transition-colors text-sm font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-muted/10'
                        }`}
                >
                    H2
                </button>
            </div>

            <div className="flex items-center gap-1">
                {buttons.map((btn) => (
                    <button
                        key={btn.label}
                        onClick={btn.onClick}
                        className={`p-1.5 rounded transition-colors ${btn.isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-muted/10'
                            }`}
                        title={btn.label}
                        aria-label={btn.label}
                    >
                        {btn.icon}
                    </button>
                ))}
            </div>

            <div className="flex-1" />

            <div className="text-xs text-muted-foreground hidden md:block italic">
                Changes saved locally
            </div>
        </div>
    );
};

export default Toolbar;
