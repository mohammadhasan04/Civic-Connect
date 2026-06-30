'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Phone, Mail, Shield, Save, Loader2, Camera, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/lib/constants';
import { cn, validatePhone, validateName } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
}

export function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '' });

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setEmail(user.email || '');

        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(data);
          setForm({ full_name: data.full_name, phone: data.phone || '' });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const nameValidation = useMemo(() => validateName(form.full_name), [form.full_name]);
  const phoneValidation = useMemo(() => validatePhone(form.phone), [form.phone]);
  const [touched, setTouched] = useState({ name: false, phone: false });

  const handlePhoneChange = useCallback((value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    const formatted = cleaned.startsWith('+') ? '+' + cleaned.slice(1).replace(/\+/g, '') : cleaned.replace(/\+/g, '');
    setForm(f => ({ ...f, phone: formatted }));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setTouched({ name: true, phone: true });
    if (!nameValidation.valid) { toast.error(nameValidation.error!); return; }
    if (!phoneValidation.valid) { toast.error(phoneValidation.error!); return; }
    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      
      const { error } = await supabase.from('profiles')
        .update({ full_name: form.full_name, phone: phoneValidation.formatted || null, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      setProfile({ ...profile, full_name: form.full_name, phone: form.phone });
      toast.success('Personnel record synchronized successfully');
    } catch {
      toast.error('Failed to update identity matrix');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)] mb-4" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Accessing Identity Grid...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Operational Profile</h1>
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">Manage your civic identity and communication relays.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="glass-card p-6 rounded-[2rem] text-center shadow-lg border border-[var(--glass-border)] relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 rounded-full mix-blend-screen filter blur-[40px] opacity-20 bg-[var(--primary)]" />
             <div className="relative z-10 w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-[var(--glass-bg-hover)] to-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-4xl font-extrabold text-[var(--on-surface)] shadow-inner mb-4 group cursor-not-allowed">
               {profile.full_name.charAt(0)}
               <div className="absolute inset-0 rounded-3xl bg-[var(--glass-bg)] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm border border-[var(--primary)]">
                 <Camera className="w-6 h-6 text-[var(--primary)]" />
               </div>
             </div>
             <h2 className="text-lg font-bold text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-display)' }}>{profile.full_name}</h2>
             <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-[rgba(0,105,72,0.1)] text-[var(--primary)] border border-[rgba(0,105,72,0.2)] mt-2">
                <Shield className="w-3 h-3" />
                {ROLE_LABELS[profile.role as keyof typeof ROLE_LABELS] || profile.role}
             </p>
          </div>
        </div>
        
        <div className="md:col-span-2">
          <div className="glass-card p-8 rounded-[2rem] border border-[var(--glass-border)] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
            
            <div className="space-y-6 relative z-10">
              <h3 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-6 border-b border-[var(--glass-border-light)] pb-2">Identity Matrix</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest"><User className="w-3 h-3" /> Operator Name</label>
                  <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} onBlur={() => setTouched(t => ({ ...t, name: true }))} className={cn("glass-input !py-3 focus:border-[var(--primary)] text-sm", touched.name && !nameValidation.valid && "!border-[var(--danger)]")} maxLength={100} />
                  {touched.name && !nameValidation.valid && (
                    <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {nameValidation.error}</p>
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest"><Phone className="w-3 h-3" /> Mobile Relay</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--outline)] pointer-events-none">🇮🇳</span>
                    <input type="tel" value={form.phone} onChange={e => handlePhoneChange(e.target.value)} onBlur={() => setTouched(t => ({ ...t, phone: true }))} className={cn("glass-input !py-3 !pl-9 focus:border-[var(--primary)] text-sm", touched.phone && !phoneValidation.valid && "!border-[var(--danger)]")} placeholder="+91 9876543210" maxLength={13} />
                  </div>
                  {touched.phone && !phoneValidation.valid && (
                    <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {phoneValidation.error}</p>
                  )}
                  {touched.phone && phoneValidation.valid && form.phone.trim() !== '' && (
                    <p className="text-xs font-semibold text-[var(--success)] mt-1.5 flex items-center gap-1"><Check className="w-3.5 h-3.5 flex-shrink-0" /> {phoneValidation.formatted}</p>
                  )}
                </div>
              </div>
              
              <div className="pt-2">
                <label className="flex items-center gap-1 text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest"><Mail className="w-3 h-3" /> Secure Comms (Disabled)</label>
                <input type="email" value={email} disabled className="glass-input !py-3 opacity-50 cursor-not-allowed text-sm" />
                <p className="text-[10px] text-[var(--outline)] mt-1.5 ml-1">Email credentials are locked strictly to network authorities.</p>
              </div>
              
              <div className="pt-6 mt-4 border-t border-[var(--glass-border-light)] flex justify-end">
                <button 
                   onClick={handleSave} 
                   disabled={saving || !nameValidation.valid || !phoneValidation.valid || (form.full_name === profile.full_name && (form.phone || '') === (profile.phone || ''))}
                   className="btn-primary !py-3 !px-8 text-sm shadow-[0_0_20px_rgba(0,105,72,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-[var(--on-primary)]" /> : (
                    <><Save className="w-4 h-4 mr-2" /> Sync Records</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
