'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Department } from '@/lib/types';
import { Plus, Pencil, X, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { validatePhone } from '@/lib/utils';

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '', contact_email: '', contact_phone: '' });

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.from('departments').select('*').order('name');
        if (data) setDepartments(data);
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', contact_email: '', contact_phone: '' }); setShowModal(true); };
  const openEdit = (d: Department) => { setEditing(d); setForm({ name: d.name, description: d.description || '', contact_email: d.contact_email || '', contact_phone: d.contact_phone || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Designation identifier required'); return; }
    const phoneV = validatePhone(form.contact_phone);
    if (!phoneV.valid) { toast.error(phoneV.error!); return; }
    try {
      const supabase = createBrowserSupabaseClient();

      if (editing) {
        const { error } = await supabase.from('departments').update({ name: form.name, description: form.description || null, contact_email: form.contact_email || null, contact_phone: phoneV.formatted || null }).eq('id', editing.id);
        if (error) { toast.error(error.message); return; }
        setDepartments(prev => prev.map(d => d.id === editing.id ? { ...d, ...form } : d));
        toast.success('Department parameters updated');
      } else {
        const { data, error } = await supabase.from('departments').insert({ name: form.name, description: form.description || null, contact_email: form.contact_email || null, contact_phone: phoneV.formatted || null }).select().single();
        if (error) { toast.error(error.message); return; }
        setDepartments(prev => [...prev, data]);
        toast.success('Department initialized');
      }
      setShowModal(false);
    } catch { toast.error('Core failure'); }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)] mb-4" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Accessing Infrastructure Nodes</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="relative z-10 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold mb-1 flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}><Building2 className="w-8 h-8 text-[var(--primary)]" /> Department Grid</h1>
            <p className="text-sm font-medium text-[var(--on-surface-variant)]">Manage municipal infrastructure departments and routing assignments.</p>
          </div>
          <button onClick={openAdd} className="btn-primary shrink-0 transition-shadow hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"><Plus className="w-4 h-4" /> Initialize Branch</button>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-4 mb-8">
          <div className="glass-card px-5 py-3 rounded-full border border-[rgba(255,255,255,0.05)] inline-flex items-center gap-3 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--secondary)] animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest text-[var(--on-surface)] uppercase">{departments.length} Operational Nodes</span>
          </div>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((d, i) => (
            <div key={d.id} className="glass-card p-6 rounded-2xl border border-[rgba(255,255,255,0.03)] hover:border-[rgba(59,130,246,0.3)] transition-colors group relative overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--secondary)] rounded-full mix-blend-screen filter blur-[50px] opacity-10 group-hover:opacity-20 transition-opacity" />
              
              <div className="relative z-10 flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-[rgba(255,255,255,0.05)] shadow-inner bg-[rgba(59,130,246,0.1)]">
                    <Building2 className="w-6 h-6 text-[var(--secondary)]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--on-surface)] tracking-wide">{d.name}</h3>
                    <p className="text-[10px] font-bold text-[var(--outline)] uppercase tracking-widest mt-0.5">Primary Node</p>
                  </div>
                </div>
              </div>
              
              {d.description && (
                <div className="relative z-10 mb-5">
                  <p className="text-[13px] font-medium text-[var(--on-surface-variant)] leading-relaxed italic border-l-2 border-[var(--glass-border)] pl-3">
                    {d.description}
                  </p>
                </div>
              )}

              <div className="relative z-10 bg-[rgba(0,0,0,0.2)] p-3 rounded-xl border border-[var(--glass-border-light)] flex flex-col gap-2 mb-4">
                {d.contact_email ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Proxy Relay</span>
                    <span className="text-[11px] font-mono text-[var(--on-surface)]">{d.contact_email}</span>
                  </div>
                ) : null}
                {d.contact_phone ? (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--outline)]">Voice Comm</span>
                    <span className="text-[11px] font-mono text-[var(--on-surface)]">{d.contact_phone}</span>
                  </div>
                ) : null}
                {!d.contact_email && !d.contact_phone && (
                  <span className="text-[11px] font-medium text-[var(--outline)] italic text-center">No comms relays configured</span>
                )}
              </div>
              
              <div className="relative z-10 pt-3 border-t border-[var(--glass-border-light)] flex justify-end">
                <button onClick={() => openEdit(d)} className="btn-ghost flex items-center gap-2 !py-1.5 !px-3 hover:text-[var(--secondary)] hover:bg-[rgba(59,130,246,0.1)]"><Pencil className="w-3.5 h-3.5" /> Modify Parameters</button>
              </div>
            </div>
          ))}
        </div>
        
        {departments.length === 0 && (
          <div className="glass-card p-16 mt-4 text-center border-dashed border-[var(--glass-border-light)] relative overflow-hidden">
            <Building2 className="w-12 h-12 text-[var(--outline)] mx-auto mb-4 opacity-50" />
            <p className="text-base font-bold text-[var(--on-surface-variant)] tracking-wide">Infrastructure Offline</p>
            <p className="text-sm font-medium text-[var(--outline)] mt-2">Zero municipal departments have been instantiated.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg glass-card p-8 rounded-[2rem] border border-[rgba(255,255,255,0.05)] shadow-2xl animate-bounce-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--secondary)] to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold tracking-tight text-[var(--on-surface)] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <Building2 className="w-5 h-5 text-[var(--secondary)]" /> {editing ? 'Reconfigure Department' : 'Initialize Node'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--outline)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Department Designation <span className="text-[var(--secondary)]">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] focus:border-[var(--secondary)]" placeholder="e.g. Public Works Authority" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Operational Directive</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="glass-input !py-3.5 !min-h-[100px] resize-none focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] focus:border-[var(--secondary)]" placeholder="Define the primary operational jurisdiction..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Proxy Relay (Email)</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] focus:border-[var(--secondary)]" placeholder="pmo@civic.local" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Voice Comms Server</label>
                  <input type="tel" value={form.contact_phone} onChange={e => { const c = e.target.value.replace(/[^\d+]/g, ''); const f = c.startsWith('+') ? '+' + c.slice(1).replace(/\+/g, '') : c.replace(/\+/g, ''); setForm(ff => ({ ...ff, contact_phone: f })); }} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] focus:border-[var(--secondary)]" placeholder="+91 9876543210" maxLength={13} />
                </div>
              </div>

              <div className="flex gap-4 pt-6 mt-4 border-t border-[var(--glass-border-light)]">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 !py-3.5">Abort</button>
                <button onClick={handleSave} className="btn-primary flex-1 !py-3.5 shadow-[0_0_20px_rgba(59,130,246,0.2)] !bg-[var(--secondary)] !text-white hover:!bg-[#2563EB]">{editing ? 'Commit Edit' : 'Initialize Data'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
