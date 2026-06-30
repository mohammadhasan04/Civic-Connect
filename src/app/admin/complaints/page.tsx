'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Complaint } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatRelative, exportToCSV } from '@/lib/utils';
import { Loader2, ChevronRight, Search, Download } from 'lucide-react';

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const [compRes, wardRes] = await Promise.all([
        supabase.from('complaints').select('*, category:categories(name_en), ward:wards(name), assigned_staff:profiles!complaints_assigned_to_fkey(full_name)').order('created_at', { ascending: false }).limit(200),
        supabase.from('wards').select('id, name').eq('is_active', true).order('name'),
      ]);
      setComplaints((compRes.data || []) as unknown as Complaint[]);
      setWards((wardRes.data || []) as { id: string; name: string }[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = complaints.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (wardFilter !== 'all' && c.ward_id !== wardFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.ticket_id?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleExport = () => {
    exportToCSV(filtered.map(c => ({
      ticket_id: c.ticket_id, title: c.title, status: c.status, priority: c.priority,
      ward: (c.ward as unknown as { name: string })?.name || '', created: c.created_at,
    })), 'complaints-export');
  };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>All Complaints</h1>
          <p className="text-sm text-[var(--on-surface-variant)]">{filtered.length} complaints</p>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="glass-input !pl-10 !py-2.5" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-select !py-2.5 w-full sm:w-40">
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={wardFilter} onChange={e => setWardFilter(e.target.value)} className="glass-select !py-2.5 w-full sm:w-40">
          <option value="all">All Wards</option>
          {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(c => {
            const cfg = STATUS_CONFIG[c.status];
            return (
              <Link key={c.id} href={`/admin/complaints/${c.id}`} className="glass-card p-4 group cursor-pointer hover:border-[var(--primary)]/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`badge ${cfg?.bg} text-[10px] flex-shrink-0`}>{cfg?.label}</span>
                    <span className="text-xs font-mono text-[var(--outline)] flex-shrink-0">{c.ticket_id}</span>
                    <span className="text-sm font-bold truncate">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-[var(--outline)] hidden sm:block">{formatRelative(c.created_at)}</span>
                    <ChevronRight className="w-4 h-4 text-[var(--outline)]" />
                  </div>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && <div className="glass-card p-8 text-center"><p className="text-sm text-[var(--outline)]">No complaints match filters</p></div>}
        </div>
      )}
    </DashboardShell>
  );
}
