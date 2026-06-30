'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth-context';
import { Complaint } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatRelative } from '@/lib/utils';
import { Loader2, ChevronRight, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SupervisorDashboard() {
  const _auth = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {

      const supabase = createBrowserSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase.from('profiles').select('ward_id').eq('id', authUser.id).single();
      if (!profile?.ward_id) { setLoading(false); return; }

      const { data } = await supabase
        .from('complaints')
        .select('*, category:categories(name_en, color), ward:wards(name), assigned_staff:profiles!complaints_assigned_to_fkey(full_name)')
        .eq('ward_id', profile.ward_id)
        .order('created_at', { ascending: false });

      setComplaints((data || []) as unknown as Complaint[]);
      setLoading(false);
    }
    load();
  }, []);

  const active = complaints.filter(c => !['CLOSED', 'RESOLVED'].includes(c.status));
  const resolved = complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status));
  const escalated = complaints.filter(c => c.status === 'ESCALATED');
  const unassigned = complaints.filter(c => c.status === 'NEW' && !c.assigned_to);

  const stats = [
    { label: 'Total Ward', value: complaints.length, icon: BarChart3, color: 'var(--secondary)' },
    { label: 'Unassigned', value: unassigned.length, icon: AlertTriangle, color: 'var(--warning)' },
    { label: 'Resolved', value: resolved.length, icon: CheckCircle, color: 'var(--success)' },
    { label: 'Escalated', value: escalated.length, icon: AlertTriangle, color: 'var(--danger)' },
  ];

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Ward Supervisor</h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Oversee all complaints in your ward</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {stats.map(s => (
          <div key={s.label} className="glass-card p-5 relative overflow-hidden">
            <p className="text-3xl font-black" style={{ fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-bold text-[var(--outline)] uppercase tracking-wide mt-1">{s.label}</p>
            <s.icon className="absolute top-4 right-4 w-6 h-6 opacity-20" style={{ color: s.color }} />
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold mb-4">Active Ward Complaints</h2>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
      ) : active.length > 0 ? (
        <div className="grid gap-3">
          {active.slice(0, 20).map(c => {
            const cfg = STATUS_CONFIG[c.status];
            return (
              <Link key={c.id} href={`/supervisor/complaints/${c.id}`} className="glass-card p-5 group cursor-pointer hover:border-[var(--primary)]/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`badge ${cfg?.bg} text-[10px]`}>{cfg?.label}</span>
                      <span className="text-xs font-mono text-[var(--outline)]">{c.ticket_id}</span>
                    </div>
                    <h3 className="text-sm font-bold truncate group-hover:text-[var(--primary)] transition-colors">{c.title}</h3>
                    <span className="text-xs text-[var(--outline)]">{formatRelative(c.created_at)}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--outline)] flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center rounded-[2rem]">
          <CheckCircle className="w-12 h-12 text-[var(--success)] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">Ward is clear!</h3>
        </div>
      )}
    </DashboardShell>
  );
}
