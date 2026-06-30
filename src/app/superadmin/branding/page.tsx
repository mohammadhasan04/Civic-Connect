'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Loader2, Save, Palette, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function BrandingPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.from('system_settings').select('key, value');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
        setConfig(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  const update = (key: string, value: string) => setConfig(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user: _user } } = await supabase.auth.getUser();

      for (const [key, value] of Object.entries(config)) {
        await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      toast.success('Branding updated successfully!');
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => update('logo_url', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return <DashboardShell><div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div></DashboardShell>;
  }

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] flex items-center justify-center">
            <Palette className="w-6 h-6 text-[var(--on-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Branding & Identity</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">Customize the platform appearance</p>
          </div>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 mb-6">
          <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider pb-4 border-b border-[var(--glass-border)]">Identity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wider">City Name</label>
              <input type="text" value={config.city_name || ''} onChange={e => update('city_name', e.target.value)} className="glass-input" placeholder="Bhatkal" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wider">Taluk Name</label>
              <input type="text" value={config.taluk_name || ''} onChange={e => update('taluk_name', e.target.value)} className="glass-input" placeholder="Bhatkal Taluk" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wider">Website Name</label>
              <input type="text" value={config.web_name || ''} onChange={e => update('web_name', e.target.value)} className="glass-input" placeholder="Civic Connect" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wider">Contact Email</label>
              <input type="email" value={config.contact_email || ''} onChange={e => update('contact_email', e.target.value)} className="glass-input" placeholder="admin@bhatkal.gov.in" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 mb-6">
          <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider pb-4 border-b border-[var(--glass-border)]">Appearance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wider">Logo URL / Upload</label>
              <div className="flex gap-2">
                <input type="text" value={config.logo_url || ''} onChange={e => update('logo_url', e.target.value)} className="glass-input flex-1" placeholder="https://... or Base64" />
                <label className="cursor-pointer bg-[var(--primary)] text-[var(--on-primary)] px-4 py-3 rounded-xl font-bold flex items-center justify-center text-sm shadow-lg hover:shadow-xl transition-all">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wider">Primary Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={config.primary_color || '#F5A623'} onChange={e => update('primary_color', e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent" />
                <input type="text" value={config.primary_color || '#F5A623'} onChange={e => update('primary_color', e.target.value)} className="glass-input flex-1" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wider">Footer Text</label>
              <input type="text" value={config.footer_text || ''} onChange={e => update('footer_text', e.target.value)} className="glass-input" placeholder="© 2026 Bhatkal Civic Connect" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wider">Contact Phone</label>
              <input type="tel" value={config.contact_phone || ''} onChange={e => { const c = e.target.value.replace(/[^\d+\s-]/g, ''); update('contact_phone', c); }} className="glass-input" placeholder="+91 9876543210" maxLength={15} />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="glass-card p-6 rounded-2xl mb-6">
          <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4 flex items-center gap-2"><Eye className="w-4 h-4" /> Preview</h2>
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--glass-border)]">
            <div className="flex items-center gap-3 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {config.logo_url ? <img src={config.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg" style={{ background: config.primary_color || '#F5A623' }} />}
              <span className="text-sm font-bold">{config.web_name || 'Civic Connect'}</span>
              <span className="text-xs text-[var(--outline)]">{config.city_name || 'Bhatkal'} Taluk</span>
            </div>
            <div className="text-xs text-[var(--outline)]">{config.footer_text || '© 2026 Bhatkal Civic Connect'}</div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full !py-4">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Branding</>}
        </button>
      </div>
    </DashboardShell>
  );
}
