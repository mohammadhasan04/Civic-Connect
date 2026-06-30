'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth-context';
import { Profile } from '@/lib/types';

import { canToggleUserStatus, validatePhone, validateEmail, validateName } from '@/lib/utils';
import { Loader2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageStaffPage() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', password: '', ward_id: '', department_id: '' });
  const [creating, setCreating] = useState(false);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createBrowserSupabaseClient();
    const [staffRes, wardRes, deptRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'dept_staff').order('created_at', { ascending: false }),
      supabase.from('wards').select('id, name').eq('is_active', true).order('name'),
      supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
    ]);
    setStaff((staffRes.data || []) as Profile[]);
    setWards((wardRes.data || []) as { id: string; name: string }[]);
    setDepartments((deptRes.data || []) as { id: string; name: string }[]);
    setLoading(false);
  }

  const toggleActive = async (id: string, current: boolean) => {
    if (!canToggleUserStatus(currentUser?.role || '', 'dept_staff')) {
      toast.error('Insufficient permissions'); return;
    }
    const supabase = createBrowserSupabaseClient();
    await supabase.from('profiles').update({ is_active: !current }).eq('id', id);
    toast.success(`Staff ${current ? 'deactivated' : 'activated'}`);
    loadData();
  };

  const handleCreate = async () => {
    if (!formData.full_name || !formData.email || !formData.password) { toast.error('Name, email, password required'); return; }
    const nameV = validateName(formData.full_name);
    if (!nameV.valid) { toast.error(nameV.error!); return; }
    const emailV = validateEmail(formData.email);
    if (!emailV.valid) { toast.error(emailV.error!); return; }
    const phoneV = validatePhone(formData.phone);
    if (!phoneV.valid) { toast.error(phoneV.error!); return; }
    if (formData.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, phone: phoneV.formatted, role: 'dept_staff' }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success('Staff member created!');
      setShowForm(false);
      setFormData({ full_name: '', email: '', phone: '', password: '', ward_id: '', department_id: '' });
      loadData();
    } catch { toast.error('Failed'); } finally { setCreating(false); }
  };

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Department Staff</h1><p className="text-sm text-[var(--on-surface-variant)]">{staff.length} staff members</p></div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus className="w-4 h-4" /> Add Staff</button>
        </div>
        {showForm && (
          <div className="glass-card p-6 rounded-2xl mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input type="text" value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} placeholder="Full Name" className="glass-input" />
              <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="glass-input" />
              <input type="tel" value={formData.phone} onChange={e => { const c = e.target.value.replace(/[^\d+]/g, ''); const f = c.startsWith('+') ? '+' + c.slice(1).replace(/\+/g, '') : c.replace(/\+/g, ''); setFormData(p => ({ ...p, phone: f })); }} placeholder="+91 9876543210" className="glass-input" maxLength={13} />
              <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="Password" className="glass-input" />
              <select value={formData.ward_id} onChange={e => setFormData(p => ({ ...p, ward_id: e.target.value }))} className="glass-select"><option value="">Select Ward</option>{wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
              <select value={formData.department_id} onChange={e => setFormData(p => ({ ...p, department_id: e.target.value }))} className="glass-select"><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            </div>
            <div className="flex gap-2"><button onClick={handleCreate} disabled={creating} className="btn-primary">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}</button><button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button></div>
          </div>
        )}
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div> : (
          <div className="grid gap-2">
            {staff.map(s => (
              <div key={s.id} className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[var(--blue-light)] flex items-center justify-center text-sm font-bold text-[var(--secondary)] flex-shrink-0">{s.full_name.charAt(0)}</div>
                  <div className="min-w-0"><p className="text-sm font-bold truncate">{s.full_name}</p><p className="text-xs text-[var(--outline)]">{s.email}</p></div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${s.is_active ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                  <button onClick={() => toggleActive(s.id, s.is_active)} className="p-1.5 rounded-lg hover:bg-[var(--glass-bg)]">{s.is_active ? <ToggleRight className="w-5 h-5 text-[var(--success)]" /> : <ToggleLeft className="w-5 h-5" />}</button>
                </div>
              </div>
            ))}
            {staff.length === 0 && <div className="glass-card p-8 text-center text-[var(--outline)]">No staff members yet</div>}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
