'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';


import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Complaint, TimelineEntry } from '@/lib/types';
import { STATUS_CONFIG, STATUS_TRANSITIONS } from '@/lib/constants';
import { formatDateTime, getSLACountdown, fileToBase64 } from '@/lib/utils';
import { ArrowLeft, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const _router = null;
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadData() {

    const supabase = createBrowserSupabaseClient();

    const { data: comp } = await supabase
      .from('complaints')
      .select('*, category:categories(name_en, color), ward:wards(name), department:departments(name)')
      .eq('id', id)
      .single();

    if (comp) setComplaint(comp as unknown as Complaint);

    const { data: tl } = await supabase
      .from('complaint_status_history')
      .select('*')
      .eq('complaint_id', id)
      .order('created_at', { ascending: true });

    if (tl) setTimeline(tl as unknown as TimelineEntry[]);
    setLoading(false);
  }

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {

      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'RESOLVED') updates.resolved_at = new Date().toISOString();
      if (newStatus === 'IN_PROGRESS' && complaint?.status === 'ASSIGNED') updates.assigned_at = new Date().toISOString();

      const { error } = await supabase.from('complaints').update(updates).eq('id', id);
      
      if (error) { toast.error(error.message); return; }

      // Add timeline entry
      await supabase.from('complaint_status_history').insert({
        complaint_id: id,
        old_status: complaint?.status,
        new_status: newStatus,
        changed_by: user?.id,
        note: note || null,
      });

      toast.success(`Status updated to ${newStatus}`);
      setNote('');
      loadData();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleEvidenceAnalysis = async (file: File) => {
    setAnalyzing(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAiResult(JSON.stringify(data.analysis, null, 2));
        toast.success('Evidence analyzed by AI');
      }
    } catch {
      toast.error('AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return <DashboardShell><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" /></div></DashboardShell>;
  }

  if (!complaint) {
    return <DashboardShell><div className="glass-card p-12 text-center rounded-[2rem]"><AlertTriangle className="w-12 h-12 text-[var(--danger)] mx-auto mb-4" /><h2 className="text-xl font-bold">Not Found</h2></div></DashboardShell>;
  }

  const cfg = STATUS_CONFIG[complaint.status];
  const allowedTransitions = STATUS_TRANSITIONS[complaint.status] || [];
  const sla = complaint.resolution_sla_deadline ? getSLACountdown(complaint.resolution_sla_deadline) : null;

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/staff/dashboard" className="p-2 rounded-xl hover:bg-[var(--glass-bg)] text-[var(--outline)]"><ArrowLeft className="w-5 h-5" /></Link>
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
            {/* Description & AI Triage */}
            <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider">Description</h2>
                {aiResult && !aiResult.includes('analysis') ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] bg-[rgba(0,105,72,0.1)] px-2 py-1 rounded border border-[rgba(0,105,72,0.2)]">
                    <Sparkles className="w-3 h-3" /> Triaged by Gemini
                  </span>
                ) : (
                  <button 
                    onClick={async () => {
                      setAnalyzing(true);
                      try {
                        const res = await fetch('/api/ai/triage', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ text: complaint.description, category: complaint.category?.name_en, priority: complaint.priority })
                        });
                        const data = await res.json();
                        if (data.triage) setAiResult(JSON.stringify(data.triage));
                      } catch {
                        toast.error('Triage failed');
                      } finally { setAnalyzing(false); }
                    }}
                    disabled={analyzing}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors"
                  >
                    {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Smart Triage
                  </button>
                )}
              </div>
              
              <p className="text-[var(--on-surface)] leading-relaxed relative z-10">{complaint.description}</p>
              
              {/* Intelligence Brief */}
              {aiResult && !aiResult.includes('analysis') && (() => {
                try {
                  const triage = JSON.parse(aiResult);
                  return (
                    <div className="mt-6 pt-6 border-t border-[rgba(0,105,72,0.2)] animate-fade-in-up">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] mix-blend-screen filter blur-[50px] opacity-10 pointer-events-none" />
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] mb-3 flex items-center gap-2">
                        Intelligence Brief
                        <div className="h-px flex-1 bg-gradient-to-r from-[var(--primary)] to-transparent opacity-30" />
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-[var(--outline)] uppercase tracking-wider mb-1">TL;DR Summary</p>
                          <p className="text-sm font-medium text-[var(--on-surface)]">{triage.summary}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-xl bg-[var(--surface-container-highest)] border border-[var(--glass-border)]">
                            <p className="text-[10px] font-bold text-[var(--outline)] uppercase tracking-wider mb-1">AI Severity</p>
                            <p className={`text-xs font-bold uppercase tracking-widest ${triage.severity === 'CRITICAL' || triage.severity === 'HIGH' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
                              {triage.severity}
                            </p>
                          </div>
                          <div className="p-3 rounded-xl bg-[var(--surface-container-highest)] border border-[var(--glass-border)]">
                            <p className="text-[10px] font-bold text-[var(--outline)] uppercase tracking-wider mb-1">Action Engine</p>
                            <p className="text-xs font-bold text-[var(--on-surface-variant)]">{triage.actionable_insight}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>

            {/* Status Update */}
            {allowedTransitions.length > 0 && (
              <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4">Update Status</h2>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)" className="glass-input mb-4 min-h-[80px]" rows={3} />
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions.map(status => {
                    const statusCfg = STATUS_CONFIG[status];
                    return (
                      <button key={status} onClick={() => updateStatus(status)} disabled={updating} className="px-4 py-2.5 rounded-xl text-sm font-bold border transition-all hover:scale-105" style={{ borderColor: statusCfg?.color, color: statusCfg?.color, background: `${statusCfg?.color}15` }}>
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : statusCfg?.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Evidence Analysis */}
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4">AI Evidence Analysis</h2>
              <label className="block">
                <div className="flex items-center gap-3 p-4 border-2 border-dashed border-[var(--glass-border)] rounded-xl cursor-pointer hover:border-[var(--primary)] transition-colors">
                  {analyzing ? <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" /> : <Sparkles className="w-5 h-5 text-[var(--primary)]" />}
                  <span className="text-sm font-bold text-[var(--on-surface-variant)]">{analyzing ? 'Analyzing...' : 'Upload photo for AI analysis'}</span>
                </div>
                <input type="file" className="hidden" accept="image/*" disabled={analyzing} onChange={e => { if (e.target.files?.[0]) handleEvidenceAnalysis(e.target.files[0]); }} />
              </label>
              {aiResult && (
                <pre className="mt-4 p-4 rounded-xl bg-[var(--background)] text-xs text-[var(--on-surface-variant)] overflow-x-auto border border-[var(--glass-border)]">{aiResult}</pre>
              )}
            </div>

            {/* Timeline */}
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4">Timeline</h2>
              <div className="space-y-3">
                {timeline.map((entry, i) => {
                  const entryCfg = STATUS_CONFIG[entry.new_status];
                  return (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full" style={{ background: entryCfg?.color || '#6b7280' }} />
                        {i < timeline.length - 1 && <div className="w-px flex-1 bg-[var(--glass-border)] mt-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-bold">{entryCfg?.label}</p>
                        {entry.note && <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">{entry.note}</p>}
                        <p className="text-xs text-[var(--outline)] mt-1">{formatDateTime(entry.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                {timeline.length === 0 && <p className="text-sm text-[var(--outline)]">No status changes yet</p>}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {sla && (
              <div className={`glass-card p-4 rounded-2xl border-l-4 ${sla.isOverdue ? 'border-l-[var(--danger)]' : 'border-l-[var(--success)]'}`}>
                <p className="text-xs font-bold text-[var(--outline)] uppercase mb-1">SLA Deadline</p>
                <p className={`text-sm font-bold ${sla.isOverdue ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>{sla.text}</p>
              </div>
            )}
            <div className="glass-card p-5 rounded-2xl space-y-3 text-sm">
              <div><p className="text-xs font-bold text-[var(--outline)] uppercase">Priority</p><p className="font-semibold">{complaint.priority}</p></div>
              <div><p className="text-xs font-bold text-[var(--outline)] uppercase">Filed</p><p className="font-semibold">{formatDateTime(complaint.created_at)}</p></div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
