'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, BarChart3, FileText, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface PublicStats {
  total: number;
  resolved: number;
  inProgress: number;
  byStatus: { status: string; count: number }[];
}

export default function TransparencyPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();

      const { count: total } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('is_public', true);
      const { count: resolved } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('is_public', true).in('status', ['RESOLVED', 'CLOSED']);
      const { count: inProgress } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('is_public', true).in('status', ['IN_PROGRESS', 'ASSIGNED']);

      setStats({
        total: total || 0,
        resolved: resolved || 0,
        inProgress: inProgress || 0,
        byStatus: [],
      });
      setLoading(false);
    }
    load();
  }, []);

  const resolvedPct = stats && stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <main className="min-h-screen relative">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--glass-border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--on-primary)]" />
            </div>
            <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>Civic Connect</span>
          </Link>
          <div className="flex gap-3">
            <Link href="/login" className="btn-secondary !py-2 !px-4 text-sm">Sign In</Link>
            <Link href="/register" className="btn-primary !py-2 !px-4 text-sm">Report Issue</Link>
          </div>
        </div>
      </nav>

      <section className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--success-bg)] text-[var(--success)] text-xs font-bold uppercase tracking-widest mb-6 border border-[rgba(16,185,129,0.2)]">
            <BarChart3 className="w-3.5 h-3.5" /> Public Transparency Dashboard
          </div>
          <h1 className="text-4xl font-extrabold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Bhatkal Taluk — Civic Performance</h1>
          <p className="text-lg text-[var(--on-surface-variant)]">Real-time visibility into complaint resolution status.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
        ) : stats && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              <div className="glass-card p-8 text-center">
                <FileText className="w-8 h-8 text-[var(--secondary)] mx-auto mb-3" />
                <p className="text-4xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--secondary)' }}>{stats.total}</p>
                <p className="text-sm font-bold text-[var(--outline)] uppercase mt-1">Total Complaints</p>
              </div>
              <div className="glass-card p-8 text-center">
                <CheckCircle className="w-8 h-8 text-[var(--success)] mx-auto mb-3" />
                <p className="text-4xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--success)' }}>{resolvedPct}%</p>
                <p className="text-sm font-bold text-[var(--outline)] uppercase mt-1">Resolution Rate</p>
              </div>
              <div className="glass-card p-8 text-center">
                <Clock className="w-8 h-8 text-[var(--warning)] mx-auto mb-3" />
                <p className="text-4xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--warning)' }}>{stats.inProgress}</p>
                <p className="text-sm font-bold text-[var(--outline)] uppercase mt-1">In Progress</p>
              </div>
            </div>

            {/* Resolution bar */}
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4">Resolution Progress</h2>
              <div className="w-full h-4 bg-[var(--glass-bg)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[var(--success)] to-[#34D399] rounded-full transition-all duration-1000" style={{ width: `${resolvedPct}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-[var(--outline)]">
                <span>{stats.resolved} resolved</span>
                <span>{stats.total - stats.resolved} remaining</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
