'use client';

import React from 'react';
import { useAuth } from '@/components/providers/AuthContext';

const Navbar = () => {
    const { user, signOut } = useAuth();

    const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';

    return (
        <nav className="h-14 border-b px-4 flex items-center justify-between sticky top-0 bg-[var(--navbar-bg)] z-50">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold text-xl">S</span>
                </div>
                <span className="font-semibold text-lg hidden md:block">SynkDocs</span>
            </div>

            <div className="flex-1 max-w-md mx-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="w-full h-9 bg-muted/20 border rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {user && (
                    <button
                        onClick={() => signOut()}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Logout
                    </button>
                )}
                <button className="text-sm font-medium hover:bg-muted/10 px-3 py-1 rounded-md transition-colors">
                    Share
                </button>
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 overflow-hidden border flex items-center justify-center">
                    <span className="text-xs font-medium">{userInitial}</span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
