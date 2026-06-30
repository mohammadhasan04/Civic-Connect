'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';


import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Loader2, Shield, Users, FileText, Server, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ users: 0, complaints: 0, admins: 0, resolved: 0, escalated: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {

      const supabase = createBrowserSupabaseClient();

      const [usersRes, complaintsRes, adminsRes, resolvedRes, escalatedRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('complaints').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'taluk_admin'),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['RESOLVED', 'CLOSED']),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'ESCALATED'),
      ]);

      setStats({
        users: usersRes.count || 0,
        complaints: complaintsRes.count || 0,
        admins: adminsRes.count || 0,
        resolved: resolvedRes.count || 0,
        escalated: escalatedRes.count || 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'var(--secondary)' },
    { label: 'Total Complaints', value: stats.complaints, icon: FileText, color: 'var(--primary)' },
    { label: 'Taluk Admins', value: stats.admins, icon: Shield, color: 'var(--danger)' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'var(--success)' },
    { label: 'Escalated', value: stats.escalated, icon: AlertTriangle, color: 'var(--warning)' },
  ];

  const quickLinks = [
    { href: '/superadmin/branding', label: 'Branding', desc: 'Logo, colors & identity', color: 'var(--primary)' },
    { href: '/superadmin/taluk-admins', label: 'Taluk Admins', desc: 'Manage administrators', color: 'var(--secondary)' },
    { href: '/superadmin/users', label: 'All Users', desc: 'System-wide user management', color: 'var(--success)' },
    { href: '/superadmin/config', label: 'App Config', desc: 'System configuration', color: 'var(--warning)' },
    { href: '/superadmin/audit-log', label: 'Audit Log', desc: 'System activity log', color: 'var(--danger)' },
    { href: '/superadmin/complaints', label: 'All Complaints', desc: 'System-wide oversight', color: 'var(--info)' },
  ];

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-10 border-b border-[var(--glass-border)] pb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--danger)] to-[#DC2626] flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Super Admin</h1>
            <p className="text-sm text-[var(--on-surface-variant)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--danger)] rounded-full animate-pulse" /> Root Level Access
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
              {statCards.map(s => (
                <div key={s.label} className="glass-card p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: s.color }} />
                  <p className="text-3xl font-black relative z-10" style={{ fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</p>
                  <p className="text-[9px] font-bold text-[var(--outline)] uppercase tracking-wide mt-1 relative z-10">{s.label}</p>
                  <s.icon className="absolute bottom-3 right-3 w-5 h-5 opacity-15" style={{ color: s.color }} />
                </div>
              ))}
            </div>

            <h2 className="text-lg font-bold mb-4">System Modules</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickLinks.map(link => (
                <Link key={link.href} href={link.href} className="glass-card p-6 group cursor-pointer hover:border-[var(--primary)]/30 transition-all">
                  <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: `${link.color}20` }}>
                    <Server className="w-5 h-5" style={{ color: link.color }} />
                  </div>
                  <h3 className="text-sm font-bold mb-1 group-hover:text-[var(--primary)] transition-colors">{link.label}</h3>
                  <p className="text-xs text-[var(--outline)]">{link.desc}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
