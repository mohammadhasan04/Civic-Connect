'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';


import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Complaint, TimelineEntry } from '@/lib/types';
import { STATUS_CONFIG } from '@/lib/constants';
import { formatDateTime, getSLACountdown } from '@/lib/utils';
import { ArrowLeft, Loader2, MapPin, Calendar, User, Building2, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {

      const supabase = createBrowserSupabaseClient();

      const { data: comp } = await supabase
        .from('complaints')
        .select('*, category:categories(name_en, slug, color), ward:wards(name), department:departments(name), assigned_staff:profiles!complaints_assigned_to_fkey(full_name)')
        .eq('id', id)
        .single();

      if (comp) setComplaint(comp as unknown as Complaint);

      const { data: tl } = await supabase
        .from('complaint_status_history')
        .select('*, changer:profiles!complaint_status_history_changed_by_fkey(full_name)')
        .eq('complaint_id', id)
        .order('created_at', { ascending: true });

      if (tl) setTimeline(tl as unknown as TimelineEntry[]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
        </div>
      </DashboardShell>
    );
  }

  if (!complaint) {
    return (
      <DashboardShell>
        <div className="glass-card p-12 text-center rounded-[2rem]">
          <AlertTriangle className="w-12 h-12 text-[var(--danger)] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Complaint Not Found</h2>
          <Link href="/citizen/complaints" className="btn-primary mt-4 inline-flex">Back to Complaints</Link>
        </div>
      </DashboardShell>
    );
  }

  const cfg = STATUS_CONFIG[complaint.status];
  const sla = complaint.resolution_sla_deadline ? getSLACountdown(complaint.resolution_sla_deadline) : null;

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/citizen/complaints" className="p-2 rounded-xl hover:bg-[var(--glass-bg)] text-[var(--outline)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className={`badge ${cfg?.bg}`}>{cfg?.label}</span>
              <button onClick={() => { navigator.clipboard.writeText(complaint.ticket_id); toast.success('Copied!'); }} className="flex items-center gap-1 text-xs font-mono text-[var(--outline)] hover:text-[var(--primary)]">
                {complaint.ticket_id} <Copy className="w-3 h-3" />
              </button>
            </div>
            <h1 className="text-xl font-extrabold truncate" style={{ fontFamily: 'var(--font-display)' }}>{complaint.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-3">Description</h2>
              <p className="text-[var(--on-surface)] leading-relaxed">{complaint.description}</p>
              {complaint.ai_description && complaint.ai_description !== complaint.description && (
                <div className="mt-4 p-3 rounded-xl bg-[var(--info-bg)] border border-[rgba(14,165,233,0.2)]">
                  <p className="text-xs font-bold text-[var(--info)] mb-1">AI Enhanced Version</p>
                  <p className="text-sm text-[var(--on-surface-variant)]">{complaint.ai_description}</p>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4">Timeline</h2>
              <div className="space-y-4">
                {timeline.length > 0 ? timeline.map((entry, i) => {
                  const entryCfg = STATUS_CONFIG[entry.new_status];
                  return (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full" style={{ background: entryCfg?.color || '#6b7280' }} />
                        {i < timeline.length - 1 && <div className="w-px flex-1 bg-[var(--glass-border)] mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-bold">{entryCfg?.label}</p>
                        {entry.note && <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">{entry.note}</p>}
                        <p className="text-xs text-[var(--outline)] mt-1">{formatDateTime(entry.created_at)}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-[var(--outline)]">Complaint filed — awaiting assignment</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-4">
            {sla && (
              <div className={`glass-card p-4 rounded-2xl border-l-4 ${sla.color === 'red' ? 'border-l-[var(--danger)]' : sla.color === 'yellow' ? 'border-l-[var(--warning)]' : 'border-l-[var(--success)]'}`}>
                <p className="text-xs font-bold text-[var(--outline)] uppercase mb-1">SLA Deadline</p>
                <p className={`text-sm font-bold ${sla.color === 'red' ? 'text-[var(--danger)]' : sla.color === 'yellow' ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>{sla.text}</p>
              </div>
            )}

            <div className="glass-card p-5 rounded-2xl space-y-4">
              <div>
                <p className="text-xs font-bold text-[var(--outline)] uppercase mb-1">Filed On</p>
                <p className="text-sm font-semibold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDateTime(complaint.created_at)}</p>
              </div>
              {(complaint.category as unknown as { name_en: string })?.name_en && (
                <div>
                  <p className="text-xs font-bold text-[var(--outline)] uppercase mb-1">Category</p>
                  <p className="text-sm font-semibold">{(complaint.category as unknown as { name_en: string }).name_en}</p>
                </div>
              )}
              {(complaint.ward as unknown as { name: string })?.name && (
                <div>
                  <p className="text-xs font-bold text-[var(--outline)] uppercase mb-1">Ward</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{(complaint.ward as unknown as { name: string }).name}</p>
                </div>
              )}
              {(complaint.department as unknown as { name: string })?.name && (
                <div>
                  <p className="text-xs font-bold text-[var(--outline)] uppercase mb-1">Department</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{(complaint.department as unknown as { name: string }).name}</p>
                </div>
              )}
              {(complaint.assigned_staff as unknown as { full_name: string })?.full_name && (
                <div>
                  <p className="text-xs font-bold text-[var(--outline)] uppercase mb-1">Assigned To</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{(complaint.assigned_staff as unknown as { full_name: string }).full_name}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-[var(--outline)] uppercase mb-1">Priority</p>
                <p className="text-sm font-semibold">{complaint.priority}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
