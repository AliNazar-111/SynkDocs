'use client';

import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Loader2, Mail, Shield, UserPlus } from 'lucide-react';
import { inviteDocument } from '@/lib/api/documents';

interface InviteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
}

export const InviteDialog: React.FC<InviteDialogProps> = ({
    isOpen,
    onClose,
    documentId
}) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const validateEmail = (email: string) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!email.trim()) {
            setError('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            await inviteDocument(documentId, email.trim(), role);
            setSuccess(true);
            setEmail('');
            // Optional: close after delay or keep open for more invites
            setTimeout(() => {
                setSuccess(false);
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to send invite');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Invite Collaborator">
            <form onSubmit={handleInvite} className="space-y-5">
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                        Email Address
                    </label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <Mail size={16} />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="colleague@example.com"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/50 rounded-xl outline-none transition-all placeholder:text-gray-400 text-sm font-medium"
                            disabled={loading}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                        Select Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setRole('viewer')}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${role === 'viewer'
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600'
                                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                                }`}
                        >
                            <div className={`p-2 rounded-lg ${role === 'viewer' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                <Shield size={14} />
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-bold">Viewer</div>
                                <div className="text-[10px] opacity-70">Read only</div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setRole('editor')}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${role === 'editor'
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600'
                                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200'
                                }`}
                        >
                            <div className={`p-2 rounded-lg ${role === 'editor' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                <UserPlus size={14} />
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-bold">Editor</div>
                                <div className="text-[10px] opacity-70">Full access</div>
                            </div>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] font-semibold rounded-lg border border-red-100 dark:border-red-900/50 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[11px] font-semibold rounded-lg border border-green-100 dark:border-green-900/50 animate-in fade-in slide-in-from-top-1">
                        Invite sent successfully!
                    </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                    >
                        Close
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : (
                            <>
                                <UserPlus size={14} />
                                Send Invite
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Dialog>
    );
};
