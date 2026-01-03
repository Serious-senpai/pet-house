'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './NotificationBell.module.css';

type Notification = {
    id: string;
    title: string;
    message: string;
    link: string | null;
    is_read: boolean;
    created_at: string;
};

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10); // Lấy 10 tin mới nhất

        if (data) {
            setNotifications(data as Notification[]);
            setUnreadCount(data.filter((n: any) => !n.is_read).length);
        }
    };

    // Lắng nghe Realtime (Tùy chọn, nếu không muốn thì bỏ qua useEffect này)
    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    // Khi có tin mới, fetch lại list
                    console.log('New notification!', payload);
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string, link: string | null) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        // Update DB
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);

        setIsOpen(false);
        if (link) router.push(link);
    };

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id);
    };

    if (!user) return null;

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button className={styles.bellBtn} onClick={() => setIsOpen(!isOpen)}>
                🔔
                {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <span className={styles.title}>Notifications</span>
                        {unreadCount > 0 && (
                            <button className={styles.markAllBtn} onClick={markAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {notifications.length === 0 ? (
                            <div className={styles.empty}>No notifications</div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`${styles.item} ${!n.is_read ? styles.unread : ''}`}
                                    onClick={() => markAsRead(n.id, n.link)}
                                >
                                    <div className={styles.itemTitle}>{n.title}</div>
                                    <div className={styles.itemMessage}>{n.message}</div>
                                    <div className={styles.itemDate}>
                                        {new Date(n.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}