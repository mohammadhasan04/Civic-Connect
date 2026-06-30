'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Profile, UserRole, Ward, Department } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/constants';
import { Plus, Search, Pencil, Shield, ToggleLeft, ToggleRight, X, Lock, Loader2, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { validatePhone, validateEmail, validateName } from '@/lib/utils';

const roleColors: Record<string, string> = {
  citizen: 'bg-[rgba(59,130,246,0.1)] text-[var(--blue)] border-[rgba(59,130,246,0.2)]',
  dept_staff: 'bg-[rgba(34,197,94,0.1)] text-[var(--success)] border-[rgba(34,197,94,0.2)]',
  ward_supervisor: 'bg-[rgba(245,166,35,0.1)] text-[var(--warning)] border-[rgba(245,166,35,0.2)]',
  taluk_admin: 'bg-[rgba(168,85,247,0.1)] text-[#A855F7] border-[rgba(168,85,247,0.2)]',
  super_admin: 'bg-[rgba(239,68,68,0.1)] text-[var(--danger)] border-[rgba(239,68,68,0.2)]',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', role: 'dept_staff' as UserRole, ward_id: '', department_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('taluk_admin');

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (myProfile) setCurrentUserRole(myProfile.role);
        }
        const { data: profileData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (profileData) setUsers(profileData);
        const { data: wardData } = await supabase.from('wards').select('*').order('ward_number');
        const { data: deptData } = await supabase.from('departments').select('*').order('name');
        if (wardData) setWards(wardData);
        if (deptData) setDepartments(deptData);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    loadData();
  }, []);

  const filtered = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const canModifyUser = (targetRole: UserRole): boolean => {
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'taluk_admin') return targetRole !== 'citizen' && targetRole !== 'super_admin';
    return false;
  };

  const shouldShowPhone = (user: Profile): boolean => {
    if (currentUserRole === 'super_admin') return true;
    if (user.role === 'citizen') return false;
    return true;
  };

  const openAdd = () => { setEditing(null); setForm({ full_name: '', phone: '', email: '', password: '', role: 'dept_staff' as UserRole, ward_id: '', department_id: '' }); setShowModal(true); };
  const openEdit = (u: Profile) => { if (!canModifyUser(u.role)) { toast.error('Edit citizen accounts restricted'); return; } setEditing(u); setForm({ full_name: u.full_name, phone: u.phone || '', email: '', password: '', role: u.role, ward_id: u.ward_id || '', department_id: u.department_id || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.full_name) { toast.error('Full Name is required'); return; }
    const nameV = validateName(form.full_name);
    if (!nameV.valid) { toast.error(nameV.error!); return; }
    const phoneV = validatePhone(form.phone);
    if (!phoneV.valid) { toast.error(phoneV.error!); return; }
    if (!editing) {
      const emailV = validateEmail(form.email);
      if (!emailV.valid) { toast.error(emailV.error!); return; }
      if (!form.password || form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    }
    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      if (editing) {
        const { error } = await supabase.from('profiles').update({ full_name: form.full_name, phone: phoneV.formatted || null, role: form.role, ward_id: form.ward_id || null, department_id: form.department_id || null, updated_at: new Date().toISOString() }).eq('id', editing.id);
        if (error) { toast.error(error.message); return; }
        setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, full_name: form.full_name, phone: phoneV.formatted || null, role: form.role, ward_id: form.ward_id || null, department_id: form.department_id || null } : u));
        toast.success('Personnel record synchronized');
      } else {
        if (!form.email || !form.password) { toast.error('Credentials required for new issuance'); setSaving(false); return; }
        const res = await fetch('/api/admin/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, phone: phoneV.formatted }) });
        const data = await res.json();
        if (!data.success) { toast.error(data.error || 'Identity creation failed'); setSaving(false); return; }
        if (data.data) setUsers(prev => [data.data, ...prev]);
        toast.success(`Identity "${form.full_name}" registered on network`);
      }
      setShowModal(false);
    } catch { toast.error('System failure'); } finally { setSaving(false); }
  };

  const toggleActive = async (user: Profile) => {
    if (!canModifyUser(user.role)) { toast.error('Action restricted by node clearance'); return; }
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
      if (error) { toast.error(error.message); return; }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      toast.success(`${user.full_name} profile ${user.is_active ? 'deactivated' : 'reactivated'}`);
    } catch { toast.error('Node update failed'); }
  };

  const deleteUser = async (user: Profile) => {
    if (currentUserRole !== 'super_admin') { toast.error('Action restricted to Super Admin only'); return; }
    if (!confirm(`Are you sure you want to permanently delete the account of ${user.full_name}? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Failed to delete user'); return; }
      
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success(`Identity "${user.full_name}" permanently deleted`);
    } catch {
      toast.error('System failure during deletion');
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)] mb-4" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Accessing Identity Grid</p>
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
            <h1 className="text-3xl font-extrabold mb-1 flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}><Users className="w-8 h-8 text-[var(--primary)]" /> Identity Grid</h1>
            <p className="text-sm font-medium text-[var(--on-surface-variant)]">Master registry of all active municipal actors and citizens.</p>
          </div>
          <button onClick={openAdd} className="btn-primary shrink-0 shadow-[0_0_20px_rgba(0,105,72,0.2)] hover:shadow-[0_0_30px_rgba(0,105,72,0.4)]"><Plus className="w-4 h-4 mr-1" /> Issue Staff Identity</button>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(['citizen', 'dept_staff', 'ward_supervisor', 'taluk_admin'] as UserRole[]).map((r, i) => (
            <div key={r} className={`glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-lg`} style={{ animationDelay: `${i * 100}ms` }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full mix-blend-screen filter blur-[30px] opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: roleColors[r].match(/text-\[(.*?)\]/)?.[1] || 'var(--primary)' }} />
              <p className="text-3xl font-extrabold tracking-tight mb-1 relative z-10" style={{ fontFamily: 'var(--font-display)' }}>{users.filter(u => u.role === r).length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--outline)] relative z-10">{ROLE_LABELS[r]} Profiles</p>
            </div>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="glass-card p-4 rounded-2xl mb-6 flex flex-col sm:flex-row gap-4 shadow-xl border border-[rgba(255,255,255,0.05)]">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--outline)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Query identity index by full name..." className="glass-input !py-3.5 !pl-11 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] text-sm w-full" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="glass-input !py-3.5 !pl-4 sm:w-[200px] text-sm cursor-pointer hover:bg-[var(--glass-bg-hover)]">
            <option value="all">Global Sector Filter</option>
            {(['citizen', 'dept_staff', 'ward_supervisor', 'taluk_admin'] as UserRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        {/* Data Grid */}
        <div className="glass-card rounded-[2rem] border-[rgba(255,255,255,0.03)] shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.02)] to-transparent pointer-events-none" />
          
          <div className="overflow-x-auto relative z-10">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--glass-border-light)] bg-[rgba(255,255,255,0.01)]">
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-[var(--outline)] uppercase tracking-wider">Node Name</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-[var(--outline)] uppercase tracking-wider">Clearance Role</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-[var(--outline)] uppercase tracking-wider">Comms Relays</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-[var(--outline)] uppercase tracking-wider">Grid Status</th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold text-[var(--outline)] uppercase tracking-wider">Admin Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border-light)]">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--glass-bg-hover)] to-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--on-surface)] text-sm font-extrabold flex-shrink-0 shadow-inner group-hover:border-[var(--primary)] transition-colors">{u.full_name.charAt(0)}</div>
                        <span className="text-sm font-bold text-[var(--on-surface)] tracking-wide">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${roleColors[u.role]}`}>
                        <Shield className="w-3 h-3" />{ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {shouldShowPhone(u) ? (
                        <span className="text-[13px] font-medium text-[var(--on-surface-variant)] tracking-wider">
                          {u.phone || <span className="text-[var(--outline)] italic">Not registered</span>}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--outline)] bg-[var(--glass-bg)] px-2 py-0.5 rounded border border-[var(--glass-border)]">
                          <Lock className="w-3 h-3" /> Encrypted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${u.is_active ? 'bg-[var(--success-bg)] text-[var(--success)] shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-[var(--danger-bg)] text-[var(--danger)] shadow-[0_0_10px_rgba(239,68,68,0.1)]'}`}>
                        {u.is_active ? 'Online' : 'Terminated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canModifyUser(u.role) ? (
                          <>
                            <button onClick={() => openEdit(u)} className="p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--outline)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all" title="Modify Entry"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => toggleActive(u)} className="p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--outline)] hover:border-[var(--on-surface)] transition-all" title="Toggle Grid Access">
                              {u.is_active ? <ToggleRight className="w-4 h-4 text-[var(--success)]" /> : <ToggleLeft className="w-4 h-4 text-[var(--danger)]" />}
                            </button>
                            {currentUserRole === 'super_admin' && (
                              <button onClick={() => deleteUser(u)} className="p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--outline)] hover:border-[var(--danger)] hover:text-[var(--danger)] transition-all" title="Permanently Delete Identity">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--outline)] opacity-50 px-2">Clearance Denied</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-16 text-center border-t border-[var(--glass-border-light)]">
              <Users className="w-12 h-12 text-[var(--outline)] opacity-50 mx-auto mb-4" />
              <p className="text-[15px] font-bold text-[var(--on-surface-variant)]">Zero identities match query parameters</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg glass-card p-8 rounded-[2rem] border border-[rgba(255,255,255,0.05)] shadow-2xl max-h-[90vh] overflow-y-auto animate-bounce-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold tracking-tight text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-display)' }}>
                {editing ? 'Modify Node Parameters' : 'Register Service Node'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--outline)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Operator Name <span className="text-[var(--primary)]">*</span></label>
                <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(245,166,35,0.1)]" placeholder="Full operational designation" />
              </div>
              {!editing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Comms Relay (Email) <span className="text-[var(--primary)]">*</span></label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(245,166,35,0.1)]" placeholder="node@civic.local" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Secure Handshake <span className="text-[var(--primary)]">*</span></label>
                    <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(245,166,35,0.1)]" placeholder="Min 8 characters" />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Mobile Relay</label>
                  <input type="tel" value={form.phone} onChange={e => { const c = e.target.value.replace(/[^\d+]/g, ''); const f = c.startsWith('+') ? '+' + c.slice(1).replace(/\+/g, '') : c.replace(/\+/g, ''); setForm(ff => ({ ...ff, phone: f })); }} placeholder="+91 9876543210" className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(245,166,35,0.1)]" maxLength={13} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Clearance Protocol</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} className="glass-input !py-3.5 focus:shadow-[0_0_15px_rgba(245,166,35,0.1)] hover:bg-[var(--glass-bg-hover)] cursor-pointer">
                    <option value="dept_staff">Department Staff</option>
                    <option value="ward_supervisor">Ward Supervisor</option>
                    {currentUserRole === 'super_admin' && <option value="taluk_admin">Taluk Admin</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Assigned Zone (Ward)</label>
                  <select value={form.ward_id} onChange={e => setForm(f => ({ ...f, ward_id: e.target.value }))} className="glass-input !py-3.5 hover:bg-[var(--glass-bg-hover)] cursor-pointer">
                    <option value="">Unassigned Sector</option>
                    {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Department Affinity</label>
                  <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} className="glass-input !py-3.5 hover:bg-[var(--glass-bg-hover)] cursor-pointer">
                    <option value="">Cross-Functional</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6 mt-4 border-t border-[var(--glass-border-light)]">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 !py-3.5">Abort Sequence</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 !py-3.5 shadow-[0_0_20px_rgba(0,105,72,0.2)]">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Shield className="w-4 h-4 mr-2" /> {editing ? 'Authorize Update' : 'Initialize Node'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
