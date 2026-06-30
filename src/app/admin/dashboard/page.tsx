'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth-context';
import { Complaint } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatRelative } from '@/lib/utils';
import { Loader2, ChevronRight, BarChart3, Users, FileText, AlertTriangle, CheckCircle, TrendingUp, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {

      const supabase = createBrowserSupabaseClient();

      const [compRes, userRes] = await Promise.all([
        supabase.from('complaints').select('*, category:categories(name_en, color), ward:wards(name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ]);

      setComplaints((compRes.data || []) as unknown as Complaint[]);
      setUserCount(userRes.count || 0);
      setLoading(false);
    }
    load();
  }, []);

  const total = complaints.length;
  const active = complaints.filter(c => !['CLOSED', 'RESOLVED'].includes(c.status)).length;
  const resolved = complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
  const escalated = complaints.filter(c => c.status === 'ESCALATED').length;
  const overdue = complaints.filter(c => c.resolution_sla_breached).length;
  const resolvedPct = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const stats = [
    { label: 'Total Complaints', value: total, icon: FileText, color: 'var(--secondary)' },
    { label: 'Active', value: active, icon: Clock, color: 'var(--warning)' },
    { label: 'Resolved', value: `${resolved} (${resolvedPct}%)`, icon: CheckCircle, color: 'var(--success)' },
    { label: 'Escalated', value: escalated, icon: AlertTriangle, color: 'var(--danger)' },
    { label: 'SLA Breached', value: overdue, icon: TrendingUp, color: 'var(--danger)' },
    { label: 'Total Users', value: userCount, icon: Users, color: 'var(--primary)' },
  ];

  const recentComplaints = complaints.slice(0, 10);

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Taluk Admin Dashboard</h1>
        <p className="text-sm text-[var(--on-surface-variant)]">Welcome, {user?.full_name || 'Admin'} — Bhatkal Taluk Overview</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {stats.map(s => (
              <div key={s.label} className="glass-card p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: s.color }} />
                <p className="text-2xl sm:text-3xl font-black relative z-10" style={{ fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-[var(--outline)] uppercase tracking-wide mt-1 relative z-10">{s.label}</p>
                <s.icon className="absolute bottom-3 right-3 w-5 h-5 opacity-15" style={{ color: s.color }} />
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            <Link href="/admin/complaints" className="glass-card p-4 text-center group hover:border-[var(--primary)]/30">
              <FileText className="w-6 h-6 mx-auto mb-2 text-[var(--secondary)] group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold">All Complaints</p>
            </Link>
            <Link href="/admin/users/staff" className="glass-card p-4 text-center group hover:border-[var(--primary)]/30">
              <Users className="w-6 h-6 mx-auto mb-2 text-[var(--primary)] group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold">Manage Staff</p>
            </Link>
            <Link href="/admin/analytics" className="glass-card p-4 text-center group hover:border-[var(--primary)]/30">
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-[var(--success)] group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold">Analytics</p>
            </Link>
            <Link href="/admin/info-requests" className="glass-card p-4 text-center group hover:border-[var(--primary)]/30">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-[var(--warning)] group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold">Info Requests</p>
            </Link>
          </div>

          {/* Recent Complaints */}
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--primary)]" /> Recent Complaints
          </h2>
          <div className="grid gap-3">
            {recentComplaints.map(c => {
              const cfg = STATUS_CONFIG[c.status];
              return (
                <Link key={c.id} href={`/admin/complaints/${c.id}`} className="glass-card p-4 group cursor-pointer hover:border-[var(--primary)]/30">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`badge ${cfg?.bg} text-[10px]`}>{cfg?.label}</span>
                      <span className="text-xs font-mono text-[var(--outline)]">{c.ticket_id}</span>
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
          </div>
        </>
      )}
    </DashboardShell>
  );
}
