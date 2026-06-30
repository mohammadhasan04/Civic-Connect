'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Complaint } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatRelative } from '@/lib/utils';
import { Loader2, ChevronRight, Search } from 'lucide-react';

export default function SupervisorComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('ward_id').eq('id', user.id).single();
      if (!profile?.ward_id) { setLoading(false); return; }
      const { data } = await supabase.from('complaints').select('*, category:categories(name_en, color), ward:wards(name), assigned_staff:profiles!complaints_assigned_to_fkey(full_name)')
        .eq('ward_id', profile.ward_id).order('created_at', { ascending: false });
      setComplaints((data || []) as unknown as Complaint[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = search ? complaints.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.ticket_id?.toLowerCase().includes(search.toLowerCase())) : complaints;

  return (
    <DashboardShell>
      <div className="mb-8"><h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Ward Complaints</h1></div>
      <div className="relative mb-6"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="glass-input !pl-10 !py-2.5" /></div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div> : (
        <div className="grid gap-2">
          {filtered.map(c => {
            const cfg = STATUS_CONFIG[c.status];
            return (
              <Link key={c.id} href={`/supervisor/complaints/${c.id}`} className="glass-card p-4 group cursor-pointer hover:border-[var(--primary)]/30">
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
          {filtered.length === 0 && <div className="glass-card p-8 text-center text-[var(--outline)]">No complaints found</div>}
        </div>
      )}
    </DashboardShell>
  );
}
