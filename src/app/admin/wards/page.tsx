'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Ward } from '@/lib/types';
import { Plus, Pencil, X, Loader2, Map } from 'lucide-react';
import { toast } from 'sonner';
import { validatePhone } from '@/lib/utils';

export default function AdminWardsPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Ward | null>(null);
  const [form, setForm] = useState({ name: '', ward_number: '', contact_phone: '' });

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.from('wards').select('*').order('ward_number');
        if (data) setWards(data);
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', ward_number: '', contact_phone: '' }); setShowModal(true); };
  const openEdit = (w: Ward) => { setEditing(w); setForm({ name: w.name, ward_number: String(w.ward_number), contact_phone: w.contact_phone || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.ward_number) { toast.error('Zone designation parameters missing'); return; }
    const phoneV = validatePhone(form.contact_phone);
    if (!phoneV.valid) { toast.error(phoneV.error!); return; }
    try {
      const supabase = createBrowserSupabaseClient();

      if (editing) {
        const { error } = await supabase.from('wards').update({ name: form.name, ward_number: parseInt(form.ward_number), contact_phone: phoneV.formatted || null }).eq('id', editing.id);
        if (error) { toast.error(error.message); return; }
        setWards(prev => prev.map(w => w.id === editing.id ? { ...w, name: form.name, ward_number: parseInt(form.ward_number), contact_phone: phoneV.formatted || null } : w));
        toast.success('Zone parameters updated');
      } else {
        const { data, error } = await supabase.from('wards').insert({ name: form.name, ward_number: parseInt(form.ward_number), city: 'Bhatkal', contact_phone: phoneV.formatted || null }).select().single();
        if (error) { toast.error(error.message); return; }
        setWards(prev => [...prev, data]);
        toast.success('New Zone established');
      }
      setShowModal(false);
    } catch { toast.error('System failure'); }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)] mb-4" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Triangulating Sector Map</p>
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
            <h1 className="text-3xl font-extrabold mb-1 flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}><Map className="w-8 h-8 text-[var(--primary)]" /> Sector Division Matrix</h1>
            <p className="text-sm font-medium text-[var(--on-surface-variant)]">Manage municipal districts and supervisory jurisdiction zones.</p>
          </div>
          <button onClick={openAdd} className="btn-primary shrink-0 transition-shadow hover:shadow-[0_0_20px_rgba(0,105,72,0.3)]"><Plus className="w-4 h-4" /> Form New Zone</button>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-4 mb-8">
          <div className="glass-card px-5 py-3 rounded-full border border-[rgba(255,255,255,0.05)] inline-flex items-center gap-3 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
            <span className="text-[11px] font-bold tracking-widest text-[var(--on-surface)] uppercase">{wards.length} Zones Tracked</span>
          </div>
        </div>

        {/* Wards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {wards.sort((a,b) => a.ward_number - b.ward_number).map((w, i) => (
            <div key={w.id} className="glass-card p-6 rounded-2xl border border-[rgba(255,255,255,0.03)] hover:border-[rgba(34,197,94,0.3)] transition-colors group relative overflow-hidden" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--success)] rounded-full mix-blend-screen filter blur-[40px] opacity-[0.05] group-hover:opacity-20 transition-opacity" />
              
              <div className="relative z-10 flex items-center justify-between mb-4">
                <span className="text-[10px] font-extrabold font-mono text-[var(--success)] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] px-3 py-1 rounded-full uppercase tracking-widest shadow-inner">
                  ZONE #{(w.ward_number).toString().padStart(2, '0')}
                </span>
                <button onClick={() => openEdit(w)} className="w-7 h-7 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--outline)] hover:text-[var(--success)] hover:border-[var(--success)] transition-all">
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              
              <div className="relative z-10 mb-5">
                <h3 className="text-xl font-extrabold text-[var(--on-surface)] tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>{w.name}</h3>
                <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--on-surface-variant)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--outline)] group-hover:bg-[var(--primary)] transition-colors" />
                  Bhatkal Metropolitan Area
                </div>
              </div>

              {w.contact_phone && (
                <div className="relative z-10 bg-[rgba(0,0,0,0.2)] p-2.5 rounded-xl border border-[var(--glass-border-light)] flex items-center justify-between mt-auto">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--outline)]">Hotline</span>
                  <span className="text-[11px] font-mono font-bold text-[var(--on-surface)]">{w.contact_phone}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {wards.length === 0 && (
          <div className="glass-card p-16 mt-4 text-center border-dashed border-[var(--glass-border-light)] relative overflow-hidden">
            <Map className="w-12 h-12 text-[var(--outline)] mx-auto mb-4 opacity-50" />
            <p className="text-base font-bold text-[var(--on-surface-variant)] tracking-wide">Coordinate Failure</p>
            <p className="text-sm font-medium text-[var(--outline)] mt-2">Zero topographical zones have been configured.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-sm glass-card p-8 rounded-[2rem] border border-[rgba(255,255,255,0.05)] shadow-2xl animate-bounce-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--success)] to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold tracking-tight text-[var(--on-surface)] flex items-center gap-2.5" style={{ fontFamily: 'var(--font-display)' }}>
                <Map className="w-5 h-5 text-[var(--success)]" /> {editing ? 'Recalibrate Zone' : 'Form New Zone'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--outline)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Zone Designation Identifier <span className="text-[var(--success)]">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(34,197,94,0.1)] focus:border-[var(--success)]" placeholder="e.g. North Bhatkal Sector" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Zone Tag # <span className="text-[var(--success)]">*</span></label>
                  <input type="number" value={form.ward_number} onChange={e => setForm(f => ({ ...f, ward_number: e.target.value }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(34,197,94,0.1)] focus:border-[var(--success)] font-mono text-center" placeholder="01" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Emergency DB</label>
                  <input type="tel" value={form.contact_phone} onChange={e => { const c = e.target.value.replace(/[^\d+]/g, ''); const f = c.startsWith('+') ? '+' + c.slice(1).replace(/\+/g, '') : c.replace(/\+/g, ''); setForm(ff => ({ ...ff, contact_phone: f })); }} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(34,197,94,0.1)] focus:border-[var(--success)]" placeholder="+91 9876543210" maxLength={13} />
                </div>
              </div>

              <div className="flex gap-4 pt-6 mt-4 border-t border-[var(--glass-border-light)]">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 !py-3.5">Abort</button>
                <button onClick={handleSave} className="btn-primary flex-1 !py-3.5 shadow-[0_0_20px_rgba(34,197,94,0.2)] !bg-[var(--success)] !text-white hover:!bg-[#16A34A]">{editing ? 'Commit Edit' : 'Initialize'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
