'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth-context';
import { Complaint } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatRelative, truncateText } from '@/lib/utils';
import { PlusCircle, FileText, Loader2, ChevronRight, MapPin, Clock } from 'lucide-react';

const TABS = [
  { key: 'all', label: 'All Tickets' },
  { key: 'active', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
];

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadComplaints() {
      try {
        const supabase = createBrowserSupabaseClient();

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { setError('Not logged in'); setLoading(false); return; }

        const { data, error: fetchError } = await supabase
          .from('complaints')
          .select('*, category:categories(name_en, slug, color, icon), ward:wards(name), department:departments(name)')
          .eq('citizen_id', authUser.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setComplaints((data || []) as unknown as Complaint[]);
        }

        // Subscribe to realtime updates
        const channel = supabase
          .channel('citizen-complaints')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'complaints',
            filter: `citizen_id=eq.${authUser.id}`
          }, () => {
            // Reload on any change
            loadComplaints();
          })
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load complaints');
      } finally {
        setLoading(false);
      }
    }

    loadComplaints();
  }, []);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'active': return complaints.filter(c => !['CLOSED', 'RESOLVED'].includes(c.status));
      case 'resolved': return complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status));
      default: return complaints;
    }
  }, [activeTab, complaints]);

  const stats = [
    { label: 'Total Reports', value: complaints.length, color: 'var(--secondary)', border: 'rgba(59,130,246,0.3)' },
    { label: 'In Progress', value: complaints.filter(c => ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'].includes(c.status)).length, color: 'var(--warning)', border: 'rgba(0,105,72,0.3)' },
    { label: 'Resolved', value: complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length, color: 'var(--success)', border: 'rgba(16,185,129,0.3)' },
  ];

  return (
    <DashboardShell>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--on-surface)] tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome, {user?.full_name?.split(' ')[0] || 'Citizen'}
          </h1>
          <p className="text-sm font-medium text-[var(--on-surface-variant)]">Manage and track your civic reports.</p>
        </div>
        <Link href="/citizen/complaints/new" className="btn-primary shadow-[0_0_20px_rgba(0,105,72,0.3)]">
          <PlusCircle className="w-5 h-5" /> New Report
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
        {stats.map((s, _i) => (
          <div key={s.label} className="glass-card p-6 relative overflow-hidden group">
            <div className="absolute inset-0 opacity-10 blur-xl transition-opacity duration-500 group-hover:opacity-20" style={{ background: s.color }} />
            <p className="text-4xl font-black mb-1 relative z-10" style={{ fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</p>
            <p className="text-sm font-bold text-[var(--outline)] tracking-wide uppercase relative z-10">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--glass-border)] sticky top-[56px] md:top-0 z-30 bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-[var(--primary)] bg-[var(--surface-container-highest)] border border-[var(--ring)]'
                  : 'text-[var(--on-surface-variant)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading && (
          <div className="glass-card p-16 text-center rounded-[2rem]">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)] mx-auto mb-4" />
            <p className="text-base font-semibold text-[var(--on-surface-variant)]">Loading your complaints...</p>
          </div>
        )}

        {error && !loading && (
          <div className="glass-card p-12 text-center rounded-[2rem] border-[rgba(239,68,68,0.3)]">
            <p className="text-lg font-bold text-[var(--danger)] mb-2">{error}</p>
            <Link href="/login" className="btn-primary mt-4 inline-flex">Return to Login</Link>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-4">
            {filtered.map((c) => {
              const statusCfg = STATUS_CONFIG[c.status];
              return (
                <Link key={c.id} href={`/citizen/complaints/${c.id}`} className="glass-card p-5 sm:p-6 group cursor-pointer hover:border-[var(--primary)]/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`badge ${statusCfg?.bg}`}>{statusCfg?.label}</span>
                        <span className="text-xs font-mono text-[var(--outline)]">{c.ticket_id}</span>
                      </div>
                      <h3 className="text-base font-bold text-[var(--on-surface)] mb-1 truncate group-hover:text-[var(--primary)] transition-colors">{c.title}</h3>
                      <p className="text-sm text-[var(--on-surface-variant)] line-clamp-2">{truncateText(c.description, 120)}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-[var(--outline)]">
                        {c.location_address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{truncateText(c.location_address, 30)}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(c.created_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--outline)] group-hover:text-[var(--primary)] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="glass-card p-16 text-center rounded-[2.5rem]">
            <FileText className="w-16 h-16 text-[var(--outline)] mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-extrabold mb-3" style={{ fontFamily: 'var(--font-display)' }}>No reports found</h3>
            <p className="text-base font-medium text-[var(--on-surface-variant)] mb-8 max-w-sm mx-auto">
              {activeTab === 'all' ? "You haven't filed any complaints yet. Report your first civic issue now!" : "No complaints match this filter."}
            </p>
            <Link href="/citizen/complaints/new" className="btn-primary text-base !px-8 shadow-[0_0_20px_rgba(0,105,72,0.2)]">
              <PlusCircle className="w-5 h-5" /> File New Report
            </Link>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
