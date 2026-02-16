'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Mail, CheckCircle2, MessageSquare, Info, X } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthContext';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    subscribeToNotifications,
    Notification
} from '@/lib/api/notifications';
import { acceptInvite, rejectInvite } from '@/lib/api/documents';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (!user) return;

        // Initial fetch
        const fetchInitial = async () => {
            const data = await getNotifications();
            setNotifications(data);
        };
        fetchInitial();

        // Subscribe to real-time
        const unsubscribe = subscribeToNotifications(user.id, (newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const handleAcceptInvite = async (e: React.MouseEvent, notification: Notification) => {
        e.stopPropagation();
        const inviteId = notification.metadata?.invite_id;
        if (!inviteId) return;

        setLoadingAction(notification.id);
        try {
            await acceptInvite(inviteId);
            await handleMarkAsRead(notification.id);
        } catch (err) {
            console.error('Failed to accept invite:', err);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleRejectInvite = async (e: React.MouseEvent, notification: Notification) => {
        e.stopPropagation();
        const inviteId = notification.metadata?.invite_id;
        if (!inviteId) return;

        setLoadingAction(notification.id);
        try {
            await rejectInvite(inviteId);
            await handleMarkAsRead(notification.id);
        } catch (err) {
            console.error('Failed to reject invite:', err);
        } finally {
            setLoadingAction(null);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'invite': return <Mail size={16} className="text-blue-500" />;
            case 'invite_accepted': return <CheckCircle2 size={16} className="text-green-500" />;
            case 'comment_reply': return <MessageSquare size={16} className="text-indigo-500" />;
            default: return <Info size={16} className="text-gray-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                aria-label="Notifications"
            >
                <Bell size={20} className="text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 animate-in zoom-in duration-300">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900/50 sticky top-0">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400 font-medium">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleMarkAsRead(notif.id)}
                                        className={`relative p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group ${!notif.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`mt-1 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className={`text-sm tracking-tight truncate ${!notif.is_read ? 'font-bold text-gray-900 dark:text-gray-50' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                                                    {notif.message}
                                                </p>

                                                {notif.type === 'invite' && !notif.is_read && notif.metadata?.invite_id && (
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <button
                                                            disabled={loadingAction === notif.id}
                                                            onClick={(e) => handleAcceptInvite(e, notif)}
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[10px] font-bold rounded-md uppercase tracking-wider transition-colors shadow-sm"
                                                        >
                                                            {loadingAction === notif.id ? 'Accepting...' : 'Accept'}
                                                        </button>
                                                        <button
                                                            disabled={loadingAction === notif.id}
                                                            onClick={(e) => handleRejectInvite(e, notif)}
                                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 text-[10px] font-bold rounded-md uppercase tracking-wider transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}

                                                {notif.link && (notif.type !== 'invite' || notif.is_read) && (
                                                    <Link
                                                        href={notif.link}
                                                        className="inline-flex text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest border-b border-blue-200"
                                                    >
                                                        View Details
                                                    </Link>
                                                )}
                                            </div>
                                            {!notif.is_read && (
                                                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-600" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            SynkDocs Notify System
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
