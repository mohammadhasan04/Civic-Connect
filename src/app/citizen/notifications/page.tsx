'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Notification } from '@/lib/types';
import { formatRelative } from '@/lib/utils';
import { Bell, Loader2, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications((data || []) as Notification[]);
      setLoading(false);
    }
    load();
  }, []);

  const markAsRead = async (id: string) => {
    const supabase = createBrowserSupabaseClient();
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const supabase = createBrowserSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Notifications</h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`glass-card p-4 rounded-xl flex items-start gap-3 cursor-pointer transition-all ${!n.read ? 'border-l-4 border-l-[var(--primary)]' : 'opacity-70'}`} onClick={() => !n.read && markAsRead(n.id)}>
              <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${!n.read ? 'text-[var(--primary)]' : 'text-[var(--outline)]'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{n.title}</p>
                <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">{n.message}</p>
                <p className="text-xs text-[var(--outline)] mt-1">{formatRelative(n.created_at)}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center rounded-[2rem]">
          <Bell className="w-12 h-12 text-[var(--outline)] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No notifications</h3>
          <p className="text-sm text-[var(--on-surface-variant)]">You&apos;re all caught up!</p>
        </div>
      )}
    </DashboardShell>
  );
}
