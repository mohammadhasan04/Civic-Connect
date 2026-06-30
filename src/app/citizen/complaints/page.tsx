'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Complaint } from '@/lib/types';
import { STATUS_CONFIG, PAGE_SIZE } from '@/lib/constants';
import { formatRelative, truncateText } from '@/lib/utils';
import { FileText, Loader2, ChevronRight, MapPin, Clock, Search } from 'lucide-react';

export default function CitizenComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from('complaints')
        .select('*, category:categories(name_en, slug, color), ward:wards(name)')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      setComplaints((data || []) as unknown as Complaint[]);
      setLoading(false);
    }
    load();
  }, [statusFilter]);

  const filtered = search
    ? complaints.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.ticket_id?.toLowerCase().includes(search.toLowerCase()))
    : complaints;

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>My Complaints</h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Track all your submitted civic reports</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or ticket ID..." className="glass-input !pl-10 !py-2.5" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-select !py-2.5 w-full sm:w-48">
          <option value="all">All Statuses</option>
          <option value="NEW">New</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-card p-16 text-center rounded-[2rem]">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)] mx-auto mb-4" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map(c => {
            const cfg = STATUS_CONFIG[c.status];
            return (
              <Link key={c.id} href={`/citizen/complaints/${c.id}`} className="glass-card p-5 group cursor-pointer hover:border-[var(--primary)]/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`badge ${cfg?.bg} text-[10px]`}>{cfg?.label}</span>
                      <span className="text-xs font-mono text-[var(--outline)]">{c.ticket_id}</span>
                    </div>
                    <h3 className="text-sm font-bold truncate group-hover:text-[var(--primary)] transition-colors">{c.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--outline)]">
                      {c.location_address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{truncateText(c.location_address, 25)}</span>}
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
          <FileText className="w-12 h-12 text-[var(--outline)] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No complaints found</h3>
          <p className="text-sm text-[var(--on-surface-variant)]">Try adjusting your filters or search term.</p>
        </div>
      )}
    </DashboardShell>
  );
}
