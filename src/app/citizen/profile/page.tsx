'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useMemo, useCallback } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth-context';
import { Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, validatePhone, validateName } from '@/lib/utils';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({ name: false, phone: false });

  const nameValidation = useMemo(() => validateName(name), [name]);
  const phoneValidation = useMemo(() => validatePhone(phone), [phone]);

  const handlePhoneChange = useCallback((value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    const formatted = cleaned.startsWith('+') ? '+' + cleaned.slice(1).replace(/\+/g, '') : cleaned.replace(/\+/g, '');
    setPhone(formatted);
  }, []);

  const handleSave = async () => {
    setTouched({ name: true, phone: true });
    if (!nameValidation.valid) { toast.error(nameValidation.error!); return; }
    if (!phoneValidation.valid) { toast.error(phoneValidation.error!); return; }

    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from('profiles').update({
        full_name: name.trim(),
        phone: phoneValidation.formatted || null,
      }).eq('id', user?.id);

      if (error) { toast.error(error.message); return; }
      toast.success('Profile updated!');
      refreshUser();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-8" style={{ fontFamily: 'var(--font-display)' }}>My Profile</h1>
        <div className="glass-card p-6 sm:p-8 rounded-2xl">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[var(--glass-border)]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] flex items-center justify-center text-2xl font-bold text-[var(--on-primary)]">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-lg font-bold">{user?.full_name}</p>
              <p className="text-sm text-[var(--outline)]">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[var(--on-surface-variant)] mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, name: true }))}
                className={cn("glass-input", touched.name && !nameValidation.valid && "!border-[var(--danger)]")}
                maxLength={100}
              />
              {touched.name && !nameValidation.valid && (
                <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {nameValidation.error}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--on-surface-variant)] mb-2">Phone</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--outline)] pointer-events-none">🇮🇳</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                  className={cn("glass-input !pl-9", touched.phone && !phoneValidation.valid && "!border-[var(--danger)]")}
                  placeholder="+91 9876543210"
                  maxLength={13}
                />
              </div>
              {touched.phone && !phoneValidation.valid && (
                <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {phoneValidation.error}
                </p>
              )}
              {touched.phone && phoneValidation.valid && phone.trim() !== '' && (
                <p className="text-xs font-semibold text-[var(--success)] mt-1.5 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" /> {phoneValidation.formatted}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--on-surface-variant)] mb-2">Email</label>
              <input type="email" value={user?.email || ''} disabled className="glass-input opacity-60" />
              <p className="text-xs text-[var(--outline)] mt-1">Email cannot be changed</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !nameValidation.valid || !phoneValidation.valid} className="btn-primary w-full !py-3 mt-6 disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
