'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth-context';
import { Complaint } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatRelative, truncateText } from '@/lib/utils';
import { Loader2, ChevronRight, Clock, FolderKanban, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data } = await supabase
        .from('complaints')
        .select('*, category:categories(name_en, color), ward:wards(name)')
        .eq('assigned_to', authUser.id)
        .order('created_at', { ascending: false });

      setComplaints((data || []) as unknown as Complaint[]);
      setLoading(false);
    }
    load();
  }, []);

  const activeComplaints = complaints.filter(c => !['CLOSED', 'RESOLVED'].includes(c.status));
  const resolvedComplaints = complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status));
  const escalated = complaints.filter(c => c.status === 'ESCALATED');

  const stats = [
    { label: 'Assigned', value: activeComplaints.length, icon: FolderKanban, color: 'var(--secondary)' },
    { label: 'Resolved', value: resolvedComplaints.length, icon: CheckCircle, color: 'var(--success)' },
    { label: 'Escalated', value: escalated.length, icon: AlertTriangle, color: 'var(--danger)' },
  ];

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Staff Workboard
        </h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Welcome, {user?.full_name || 'Staff'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-3xl font-black" style={{ fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</p>
                <p className="text-xs font-bold text-[var(--outline)] uppercase tracking-wide mt-1">{s.label}</p>
              </div>
              <s.icon className="w-8 h-8 opacity-30" style={{ color: s.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--primary)]" /> Active Assignments
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
      ) : activeComplaints.length > 0 ? (
        <div className="grid gap-3">
          {activeComplaints.map(c => {
            const cfg = STATUS_CONFIG[c.status];
            return (
              <Link key={c.id} href={`/staff/complaints/${c.id}`} className="glass-card p-5 group cursor-pointer hover:border-[var(--primary)]/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`badge ${cfg?.bg} text-[10px]`}>{cfg?.label}</span>
                      <span className="text-xs font-mono text-[var(--outline)]">{c.ticket_id}</span>
                    </div>
                    <h3 className="text-sm font-bold truncate group-hover:text-[var(--primary)] transition-colors">{c.title}</h3>
                    <p className="text-xs text-[var(--on-surface-variant)] mt-1 line-clamp-1">{truncateText(c.description, 80)}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--outline)]">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(c.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--outline)] group-hover:text-[var(--primary)] flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center rounded-[2rem]">
          <CheckCircle className="w-12 h-12 text-[var(--success)] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">All clear!</h3>
          <p className="text-sm text-[var(--on-surface-variant)]">No active assignments. Great work!</p>
        </div>
      )}
    </DashboardShell>
  );
}
