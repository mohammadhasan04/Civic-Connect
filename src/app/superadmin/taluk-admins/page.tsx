'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Profile } from '@/lib/types';

import { formatDate, validatePhone } from '@/lib/utils';
import { Loader2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

export default function TalukAdminsPage() {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadAdmins(); }, []);

  async function loadAdmins() {
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase.from('profiles').select('*').eq('role', 'taluk_admin').order('created_at', { ascending: false });
    setAdmins((data || []) as Profile[]);
    setLoading(false);
  }

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Admin ${current ? 'deactivated' : 'activated'}`);
    loadAdmins();
  };

  const handleCreate = async () => {
    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error('Name, email and password are required');
      return;
    }
    // Validate phone if provided
    const phoneV = validatePhone(formData.phone);
    if (!phoneV.valid) { toast.error(phoneV.error!); return; }
    setCreating(true);
    try {
      // Create user via Supabase admin API (requires service role - call backend)
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, phone: phoneV.formatted, role: 'taluk_admin' }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success('Taluk Admin created!');
      setShowForm(false);
      setFormData({ full_name: '', email: '', phone: '', password: '' });
      loadAdmins();
    } catch {
      toast.error('Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Taluk Admins</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">{admins.length} administrators</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Admin
          </button>
        </div>

        {showForm && (
          <div className="glass-card p-6 rounded-2xl mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--outline)] mb-4">New Taluk Admin</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input type="text" value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} placeholder="Full Name" className="glass-input" />
              <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="glass-input" />
              <input type="tel" value={formData.phone} onChange={e => { const c = e.target.value.replace(/[^\d+]/g, ''); const f = c.startsWith('+') ? '+' + c.slice(1).replace(/\+/g, '') : c.replace(/\+/g, ''); setFormData(p => ({ ...p, phone: f })); }} placeholder="+91 9876543210" className="glass-input" maxLength={13} />
              <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="Password" className="glass-input" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={creating} className="btn-primary">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
        ) : (
          <div className="grid gap-3">
            {admins.map(admin => (
              <div key={admin.id} className="glass-card p-5 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--danger)] to-[#DC2626] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {admin.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{admin.full_name}</p>
                    <p className="text-xs text-[var(--outline)]">{admin.phone || 'No phone'} • Joined {formatDate(admin.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${admin.is_active ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'}`}>
                    {admin.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => toggleActive(admin.id, admin.is_active)} className="p-2 rounded-lg hover:bg-[var(--glass-bg)] text-[var(--outline)]">
                    {admin.is_active ? <ToggleRight className="w-5 h-5 text-[var(--success)]" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}
            {admins.length === 0 && <div className="glass-card p-8 text-center"><p className="text-sm text-[var(--outline)]">No taluk admins found</p></div>}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
