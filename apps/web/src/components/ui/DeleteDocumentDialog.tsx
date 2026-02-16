'use client';

import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteDocumentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    documentTitle: string;
}

export const DeleteDocumentDialog: React.FC<DeleteDocumentDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    documentTitle
}) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            // Error handling is typically managed by the parent, 
            // but we ensure loading state is reset if we stay open/fail
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Delete Document">
            <div className="space-y-6">
                <div className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3 text-red-600 dark:text-red-400">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Irreversible Action</h3>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 text-center max-w-[200px]">
                        This document will be permanently removed for all collaborators.
                    </p>
                </div>

                <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to delete
                    </p>
                    <p className="text-base font-bold text-gray-900 dark:text-white mt-1 break-words">
                        "{documentTitle}"
                    </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-[2] py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Delete Permanently'}
                    </button>
                </div>
            </div>
        </Dialog>
    );
};
