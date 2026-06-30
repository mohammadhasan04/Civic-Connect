'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Complaint } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatRelative } from '@/lib/utils';
import { Loader2, ChevronRight } from 'lucide-react';

export default function StaffComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Get staff's department
      const { data: profile } = await supabase.from('profiles').select('department_id').eq('id', user.id).single();
      // Show all complaints in this department (assigned to this staff OR in their department)
      let query = supabase.from('complaints').select('*, category:categories(name_en, color), ward:wards(name)')
        .order('created_at', { ascending: false });
      if (profile?.department_id) {
        query = query.or(`assigned_to.eq.${user.id},department_id.eq.${profile.department_id}`);
      } else {
        query = query.eq('assigned_to', user.id);
      }
      const { data } = await query;
      setComplaints((data || []) as unknown as Complaint[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter === 'active'
    ? complaints.filter(c => !['CLOSED', 'RESOLVED'].includes(c.status))
    : filter === 'resolved' ? complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)) : complaints;

  return (
    <DashboardShell>
      <div className="mb-8"><h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>My Assignments</h1></div>
      <div className="flex gap-2 mb-6">
        {['all', 'active', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === f ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'bg-[var(--glass-bg)] text-[var(--on-surface-variant)] border border-[var(--glass-border)]'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div> : (
        <div className="grid gap-2">
          {filtered.map(c => {
            const cfg = STATUS_CONFIG[c.status];
            return (
              <Link key={c.id} href={`/staff/complaints/${c.id}`} className="glass-card p-4 group cursor-pointer hover:border-[var(--primary)]/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`badge ${cfg?.bg} text-[10px]`}>{cfg?.label}</span>
                    <span className="text-xs font-mono text-[var(--outline)]">{c.ticket_id}</span>
                    <span className="text-sm font-bold truncate">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-[var(--outline)] hidden sm:block">{formatRelative(c.created_at)}</span>
                    <ChevronRight className="w-4 h-4 text-[var(--outline)]" />
                  </div>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && <div className="glass-card p-8 text-center text-[var(--outline)]">No complaints match this filter</div>}
        </div>
      )}
    </DashboardShell>
  );
}
