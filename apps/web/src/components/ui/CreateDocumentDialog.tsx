'use client';

import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { Loader2 } from 'lucide-react';

interface CreateDocumentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
    existingNames: string[];
}

export const CreateDocumentDialog: React.FC<CreateDocumentDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    existingNames
}) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const trimmedName = name.trim();
        const exists = existingNames.some(n => n.toLowerCase() === trimmedName.toLowerCase());

        if (exists) {
            setError('A document with this name already exists');
            return;
        }

        setLoading(true);
        try {
            await onConfirm(trimmedName);
            setName('');
            setError('');
            onClose();
        } catch (err) {
            setError('Failed to create document');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="New Document">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                        Document Name
                    </label>
                    <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError('');
                        }}
                        placeholder="e.g. Weekly Report"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-xl outline-none transition-all placeholder:text-gray-400 text-sm font-medium"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] font-semibold px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/50">
                        {error}
                    </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!name.trim() || loading}
                        className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Document'}
                    </button>
                </div>
            </form>
        </Dialog>
    );
};
