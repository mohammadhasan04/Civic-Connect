'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Loader2, ClipboardList } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
  actor?: { full_name: string };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('audit_log')
        .select('*, actor:profiles!audit_log_actor_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      setLogs((data || []) as unknown as AuditEntry[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter ? logs.filter(l => l.action.toLowerCase().includes(filter.toLowerCase()) || l.table_name.toLowerCase().includes(filter.toLowerCase())) : logs;

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--warning)] to-[#D97706] flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Audit Log</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">Immutable system activity record</p>
          </div>
        </div>

        <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by action or table..." className="glass-input mb-6" />

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => (
              <div key={log.id} className="glass-card p-4 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold">{log.action}</p>
                    <p className="text-xs text-[var(--outline)] mt-0.5">Table: <code className="bg-[var(--glass-bg)] px-1 rounded">{log.table_name}</code></p>
                    {log.actor?.full_name && <p className="text-xs text-[var(--on-surface-variant)] mt-1">By: {log.actor.full_name}</p>}
                  </div>
                  <span className="text-xs text-[var(--outline)] flex-shrink-0">{formatDateTime(log.created_at)}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="glass-card p-8 text-center"><p className="text-sm text-[var(--outline)]">No audit logs found</p></div>}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
