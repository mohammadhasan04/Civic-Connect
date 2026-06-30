'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Complaint, TimelineEntry } from '@/lib/types';
import { STATUS_CONFIG, STATUS_TRANSITIONS } from '@/lib/constants';
import { formatDateTime, getSLACountdown } from '@/lib/utils';
import { ArrowLeft, Loader2, AlertTriangle, Sparkles, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function SupervisorComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    const supabase = createBrowserSupabaseClient();
    const { data: comp } = await supabase.from('complaints')
      .select('*, category:categories(name_en, color), ward:wards(name), department:departments(name)')
      .eq('id', id).single();
    if (comp) setComplaint(comp as unknown as Complaint);
    const { data: tl } = await supabase.from('complaint_status_history')
      .select('*').eq('complaint_id', id).order('created_at', { ascending: true });
    if (tl) setTimeline(tl as unknown as TimelineEntry[]);
    const { data: staff } = await supabase.from('profiles').select('id, full_name')
      .eq('role', 'dept_staff').eq('is_active', true).order('full_name');
    if (staff) setStaffList(staff);
    setLoading(false);
  }

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'RESOLVED') updates.resolved_at = new Date().toISOString();
      if (newStatus === 'CLOSED') updates.closed_at = new Date().toISOString();
      if (newStatus === 'ASSIGNED' && selectedStaff) {
        updates.assigned_to = selectedStaff;
        updates.assigned_at = new Date().toISOString();
      }
      const { error } = await supabase.from('complaints').update(updates).eq('id', id);
      if (error) { toast.error(error.message); return; }
      await supabase.from('complaint_status_history').insert({
        complaint_id: id, old_status: complaint?.status, new_status: newStatus,
        changed_by: user?.id, note: note || null,
      });
      toast.success(`Status updated to ${newStatus}`);
      setNote(''); setSelectedStaff(''); loadData();
    } catch { toast.error('Failed to update status'); }
    finally { setUpdating(false); }
  };

  if (loading) return <DashboardShell><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" /></div></DashboardShell>;
  if (!complaint) return <DashboardShell><div className="glass-card p-12 text-center rounded-[2rem]"><AlertTriangle className="w-12 h-12 text-[var(--danger)] mx-auto mb-4" /><h2 className="text-xl font-bold">Complaint Not Found</h2></div></DashboardShell>;

  const cfg = STATUS_CONFIG[complaint.status];
  const allowedTransitions = STATUS_TRANSITIONS[complaint.status] || [];
  const sla = complaint.resolution_sla_deadline ? getSLACountdown(complaint.resolution_sla_deadline) : null;

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/supervisor/complaints" className="p-2 rounded-xl hover:bg-[var(--glass-bg)] text-[var(--outline)]"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className={`badge ${cfg?.bg}`}>{cfg?.label}</span>
              <span className="text-xs font-mono text-[var(--outline)]">{complaint.ticket_id}</span>
            </div>
            <h1 className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>{complaint.title}</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider">Description</h2>
                <button onClick={async () => {
                  setAnalyzing(true);
                  try {
                    const res = await fetch('/api/ai/triage', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: complaint.description, category: complaint.category?.name_en, priority: complaint.priority }) });
                    const data = await res.json();
                    if (data.triage) setAiResult(JSON.stringify(data.triage));
                  } catch { toast.error('Triage failed'); } finally { setAnalyzing(false); }
                }} disabled={analyzing} className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors">
                  {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Smart Triage
                </button>
              </div>
              <p className="text-[var(--on-surface)] leading-relaxed">{complaint.description}</p>
              {aiResult && (() => { try { const t = JSON.parse(aiResult); return (
                <div className="mt-6 pt-6 border-t border-[rgba(0,105,72,0.2)]">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] mb-3">Intelligence Brief</h3>
                  <div className="space-y-3">
                    <div><p className="text-[10px] font-bold text-[var(--outline)] uppercase mb-1">Summary</p><p className="text-sm font-medium">{t.summary}</p></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-[var(--surface-container-highest)] border border-[var(--glass-border)]">
                        <p className="text-[10px] font-bold text-[var(--outline)] uppercase mb-1">Severity</p>
                        <p className={`text-xs font-bold uppercase ${t.severity === 'CRITICAL' || t.severity === 'HIGH' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>{t.severity}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--surface-container-highest)] border border-[var(--glass-border)]">
                        <p className="text-[10px] font-bold text-[var(--outline)] uppercase mb-1">Action</p>
                        <p className="text-xs font-bold text-[var(--on-surface-variant)]">{t.actionable_insight}</p>
                      </div>
                    </div>
                  </div>
                </div>); } catch { return null; } })()}
            </div>
            {['NEW', 'ESCALATED', 'REOPENED'].includes(complaint.status) && (
              <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Assign to Staff</h2>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} className="glass-select mb-3">
                  <option value="">Select staff member...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                {selectedStaff && <button onClick={() => updateStatus('ASSIGNED')} disabled={updating} className="btn-primary !py-2.5 text-sm w-full">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign & Update Status'}
                </button>}
              </div>
            )}
            {allowedTransitions.length > 0 && (
              <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4">Update Status</h2>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)" className="glass-input mb-4 min-h-[80px]" rows={3} />
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions.filter(s => s !== 'ASSIGNED').map(status => {
                    const sc = STATUS_CONFIG[status];
                    return <button key={status} onClick={() => updateStatus(status)} disabled={updating} className="px-4 py-2.5 rounded-xl text-sm font-bold border transition-all hover:scale-105" style={{ borderColor: sc?.color, color: sc?.color, background: `${sc?.color}15` }}>
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : sc?.label}
                    </button>;
                  })}
                </div>
              </div>
            )}
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4">Timeline</h2>
              <div className="space-y-3">
                {timeline.map((entry, i) => {
                  const ec = STATUS_CONFIG[entry.new_status];
                  return <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full" style={{ background: ec?.color || '#6b7280' }} />
                      {i < timeline.length - 1 && <div className="w-px flex-1 bg-[var(--glass-border)] mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-bold">{ec?.label}</p>
                      {entry.note && <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">{entry.note}</p>}
                      <p className="text-xs text-[var(--outline)] mt-1">{formatDateTime(entry.created_at)}</p>
                    </div>
                  </div>;
                })}
                {timeline.length === 0 && <p className="text-sm text-[var(--outline)]">No status changes yet</p>}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {sla && <div className={`glass-card p-4 rounded-2xl border-l-4 ${sla.isOverdue ? 'border-l-[var(--danger)]' : 'border-l-[var(--success)]'}`}>
              <p className="text-xs font-bold text-[var(--outline)] uppercase mb-1">SLA Deadline</p>
              <p className={`text-sm font-bold ${sla.isOverdue ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>{sla.text}</p>
            </div>}
            <div className="glass-card p-5 rounded-2xl space-y-3 text-sm">
              <div><p className="text-xs font-bold text-[var(--outline)] uppercase">Priority</p><p className="font-semibold">{complaint.priority}</p></div>
              <div><p className="text-xs font-bold text-[var(--outline)] uppercase">Category</p><p className="font-semibold">{complaint.category?.name_en || '-'}</p></div>
              <div><p className="text-xs font-bold text-[var(--outline)] uppercase">Ward</p><p className="font-semibold">{(complaint.ward as unknown as { name: string })?.name || '-'}</p></div>
              <div><p className="text-xs font-bold text-[var(--outline)] uppercase">Department</p><p className="font-semibold">{(complaint.department as unknown as { name: string })?.name || '-'}</p></div>
              <div><p className="text-xs font-bold text-[var(--outline)] uppercase">Filed</p><p className="font-semibold">{formatDateTime(complaint.created_at)}</p></div>
              {complaint.address && <div><p className="text-xs font-bold text-[var(--outline)] uppercase">Address</p><p className="font-semibold">{complaint.address}</p></div>}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
