import React from 'react';

const Sidebar = () => {
    const documents = [
        { id: '1', title: 'Getting Started with SynkDocs', date: '2 days ago' },
        { id: '2', title: 'Project Roadmap 2026', date: '1 week ago' },
        { id: '3', title: 'Meeting Notes - Architecture', date: 'Jan 24, 2026' },
    ];

    return (
        <aside className="w-64 border-r bg-[var(--sidebar-bg)] hidden md:flex flex-col h-[calc(100vh-3.5rem)] sticky top-14">
            <div className="p-4">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Document
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 mt-4">
                    Recent Documents
                </div>
                <div className="space-y-0.5">
                    {documents.map((doc) => (
                        <button
                            key={doc.id}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/10 transition-colors group"
                        >
                            <div className="text-sm font-medium truncate">{doc.title}</div>
                            <div className="text-[10px] text-muted-foreground">{doc.date}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 border-t border-muted/20">
                <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/10 transition-colors cursor-pointer mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium">Free Tier Status</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
创新
