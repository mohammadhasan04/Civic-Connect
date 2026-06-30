'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Complaint } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatRelative, exportToCSV } from '@/lib/utils';
import { Loader2, Search, Download, ChevronRight } from 'lucide-react';

export default function SuperAdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from('complaints').select('*, category:categories(name_en), ward:wards(name)').order('created_at', { ascending: false }).limit(200);
      setComplaints((data || []) as unknown as Complaint[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = complaints.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) return c.title.toLowerCase().includes(search.toLowerCase()) || c.ticket_id?.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>All Complaints</h1>
        <button onClick={() => exportToCSV(filtered.map(c => ({ ticket_id: c.ticket_id, title: c.title, status: c.status, created: c.created_at })), 'all-complaints')} className="btn-secondary text-sm"><Download className="w-4 h-4" /> Export</button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="glass-input !pl-10 !py-2.5" /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-select !py-2.5 w-full sm:w-40">
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div> : (
        <div className="grid gap-2">
          {filtered.map(c => {
            const cfg = STATUS_CONFIG[c.status];
            return (
              <Link key={c.id} href={`/superadmin/complaints/${c.id}`} className="glass-card p-4 flex items-center justify-between gap-3 group cursor-pointer hover:border-[var(--primary)]/30">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`badge ${cfg?.bg} text-[10px] flex-shrink-0`}>{cfg?.label}</span>
                  <span className="text-xs font-mono text-[var(--outline)]">{c.ticket_id}</span>
                  <span className="text-sm font-bold truncate">{c.title}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-[var(--outline)] hidden sm:block">{formatRelative(c.created_at)}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--outline)]" />
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && <div className="glass-card p-8 text-center text-[var(--outline)]">No complaints</div>}
        </div>
      )}
    </DashboardShell>
  );
}
