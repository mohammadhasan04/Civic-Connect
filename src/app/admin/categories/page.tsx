'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Plus, Pencil, Clock, X, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  color: string;
  sla_hours: number;
  icon: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      if (data) setCategories(data.map((c: Record<string, unknown>) => ({ id: c.id as string, slug: c.slug as string, name: (c.name_en as string) || '', color: (c.color as string) || '#333', sla_hours: (c.sla_hours as number) || 72, icon: (c.icon as string) || 'tag' })));
      setLoading(false);
    }
    load();
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [form, setForm] = useState({ name: '', color: '#2563EB', sla_hours: 72 });

  const openEdit = (c: CategoryItem) => { setEditing(c); setForm({ name: c.name, color: c.color, sla_hours: c.sla_hours }); setShowModal(true); };
  const openAdd = () => { setEditing(null); setForm({ name: '', color: '#2563EB', sla_hours: 72 }); setShowModal(true); };

  const handleSave = () => {
    if (!form.name) { toast.error('Name is strictly required'); return; }
    if (editing) {
      setCategories(prev => prev.map(c => c.id === editing.id ? { ...c, name: form.name, color: form.color, sla_hours: form.sla_hours } : c));
      toast.success('Category parameters dynamically updated');
    } else {
      setCategories(prev => [...prev, { id: `cat-${Date.now()}`, slug: form.name.toLowerCase().replace(/\s+/g, '_'), name: form.name, color: form.color, sla_hours: form.sla_hours, icon: 'other' }]);
      toast.success(`Category "${form.name}" integrated into matrix`);
    }
    setShowModal(false);
  };

  return (
    <DashboardShell>
      <div className="relative z-10 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold mb-1 flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}><Tag className="w-8 h-8 text-[var(--primary)]" /> Category Matrix</h1>
            <p className="text-sm font-medium text-[var(--on-surface-variant)]">Manage system-wide issue classifications and SLA enforcement algorithms.</p>
          </div>
          <button onClick={openAdd} className="btn-primary shrink-0"><Plus className="w-4 h-4" /> Define Category</button>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-4 mb-6">
          <div className="glass-card px-5 py-3 rounded-full border border-[rgba(255,255,255,0.05)] inline-flex items-center gap-3 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest text-[var(--on-surface)] uppercase">{categories.length} Active Vectors</span>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((c, i) => {
            const Icon = Tag;
            return (
              <div key={c.id} className="glass-card p-6 rounded-2xl border border-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.1)] transition-colors group relative overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full mix-blend-screen filter blur-[50px] opacity-10 group-hover:opacity-30 transition-opacity" style={{ backgroundColor: c.color }} />
                
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-[rgba(255,255,255,0.05)] shadow-inner" style={{ backgroundColor: `${c.color}15` }}>
                      <Icon className="w-6 h-6" style={{ color: c.color }} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--on-surface)] tracking-wide">{c.name}</h3>
                      <p className="text-[10px] font-bold text-[var(--outline)] font-mono uppercase tracking-widest">{c.slug}</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: c.color, boxShadow: `0 0 10px ${c.color}` }} />
                </div>
                
                <div className="relative z-10 bg-[rgba(0,0,0,0.2)] p-3 rounded-xl border border-[var(--glass-border-light)] flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--outline)]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">SLA Limit</span>
                  </div>
                  <span className="text-[12px] font-extrabold text-[var(--warning)]">{c.sla_hours} Hours</span>
                </div>
                
                <div className="relative z-10 pt-3 border-t border-[var(--glass-border-light)] flex justify-end">
                  <button onClick={() => openEdit(c)} className="btn-ghost flex items-center gap-2 !py-1.5 !px-3 hover:text-[var(--primary)] hover:bg-[rgba(245,166,35,0.05)]"><Pencil className="w-3.5 h-3.5" /> Configure</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-sm glass-card p-8 rounded-[2rem] border border-[rgba(255,255,255,0.05)] shadow-2xl animate-bounce-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold tracking-tight text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-display)' }}>{editing ? 'Modify Category' : 'Define Category'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--outline)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Classification Name <span className="text-[var(--primary)]">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(245,166,35,0.1)]" placeholder="e.g. Traffic Lights" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Hex Color Code</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-12 h-12 rounded-xl border-2 border-[var(--glass-border)] cursor-pointer bg-transparent shadow-inner" />
                  <input type="text" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="glass-input !py-3.5 flex-1 font-mono uppercase tracking-widest" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">SLA Resolution Window (Hrs)</label>
                <input type="number" value={form.sla_hours} onChange={e => setForm(f => ({ ...f, sla_hours: parseInt(e.target.value) || 72 }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(245,166,35,0.1)] font-mono text-center" />
              </div>
              <div className="flex gap-4 pt-6 mt-4 border-t border-[var(--glass-border-light)]">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 !py-3.5">Abort</button>
                <button onClick={handleSave} className="btn-primary flex-1 !py-3.5 shadow-[0_0_20px_rgba(0,105,72,0.2)]">{editing ? 'Commit Edit' : 'Initialize'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
