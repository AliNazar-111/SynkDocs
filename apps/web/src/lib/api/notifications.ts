import { supabase } from '@/lib/supabase-client';
import { handleSupabaseError } from '@/lib/errors';

export type NotificationType = 'invite' | 'invite_accepted' | 'comment_reply' | 'system';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    link: string | null;
    metadata: any;
    is_read: boolean;
    created_at: string;
}

/**
 * Fetch all notifications for the current user
 */
export async function getNotifications(): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await (supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as any);

    if (error) handleSupabaseError(error);
    return (data || []) as Notification[];
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
    const { error } = await (supabase
        .from('notifications' as any)
        .update({ is_read: true })
        .eq('id', notificationId) as any);

    if (error) handleSupabaseError(error);
}

/**
 * Mark all notifications for the current user as read
 */
export async function markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase
        .from('notifications' as any)
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false) as any);

    if (error) handleSupabaseError(error);
}

/**
 * Subscribe to real-time notification updates
 */
export function subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
) {
    const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                callback(payload.new as Notification);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
