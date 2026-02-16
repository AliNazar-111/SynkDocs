import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDocumentsData } from '@/hooks/useDocuments';
import { Search, Loader2, FileText, X } from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navbar = () => {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const { documents } = useDocumentsData();

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';

    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const filtered = documents.filter(doc =>
            doc.title.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 5); // Limit to top 5 results

        setResults(filtered);
    }, [searchQuery, documents]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleResultClick = (docId: string) => {
        router.push(`/documents/${docId}`);
        setSearchQuery('');
        setIsSearchOpen(false);
    };

    return (
        <nav className="h-14 border-b px-4 flex items-center justify-between sticky top-0 bg-[var(--navbar-bg)] z-50 shadow-sm">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-xl">S</span>
                </div>
                <span className="font-bold text-lg hidden md:block tracking-tight">SynkDocs</span>
            </Link>

            <div className="flex-1 max-w-md mx-4 relative" ref={searchRef}>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsSearchOpen(true);
                        }}
                        onFocus={() => setIsSearchOpen(true)}
                        placeholder="Search documents..."
                        className="w-full h-9 bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-blue-500/50 rounded-full pl-10 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {isSearchOpen && (searchQuery.trim() || results.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {results.length > 0 ? (
                            <div className="px-2">
                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Documents</div>
                                {results.map((doc) => (
                                    <button
                                        key={doc.id}
                                        onClick={() => handleResultClick(doc.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors text-left group"
                                    >
                                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-md group-hover:bg-blue-100 transition-colors">
                                            <FileText size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.title || 'Untitled'}</div>
                                            <div className="text-[10px] text-gray-400">Last updated {new Date(doc.updated_at).toLocaleDateString()}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : searchQuery.trim() ? (
                            <div className="px-4 py-8 text-center">
                                <Search size={24} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500 italic">No documents found matching "{searchQuery}"</p>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <NotificationBell />
                {user && (
                    <button
                        onClick={() => signOut()}
                        className="text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors px-2 py-1"
                    >
                        Logout
                    </button>
                )}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md border-2 border-white dark:border-gray-800 overflow-hidden flex items-center justify-center">
                    <span className="text-xs font-bold leading-none">{userInitial}</span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
