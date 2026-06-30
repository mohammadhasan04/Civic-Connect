'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Loader2, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfigPage() {
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
      for (const [key, value] of Object.entries(config)) {
        await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      toast.success('Configuration saved!');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <DashboardShell><div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div></DashboardShell>;
  }

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--secondary)] to-[#2563EB] flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>App Configuration</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">System-level settings</p>
          </div>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 mb-6">
          {Object.entries(config).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wider">{key.replace(/_/g, ' ')}</label>
              <input type="text" value={value} onChange={e => update(key, e.target.value)} className="glass-input" />
            </div>
          ))}

          <div className="pt-4 border-t border-[var(--glass-border)]">
            <h3 className="text-xs font-bold text-[var(--outline)] uppercase tracking-wider mb-3">Add New Key</h3>
            <div className="flex gap-3">
              <input type="text" id="newKey" placeholder="key_name" className="glass-input flex-1" />
              <input type="text" id="newValue" placeholder="value" className="glass-input flex-1" />
              <button className="btn-secondary text-sm" onClick={() => {
                const key = (document.getElementById('newKey') as HTMLInputElement)?.value;
                const val = (document.getElementById('newValue') as HTMLInputElement)?.value;
                if (key && val) {
                  update(key, val);
                  (document.getElementById('newKey') as HTMLInputElement).value = '';
                  (document.getElementById('newValue') as HTMLInputElement).value = '';
                }
              }}>Add</button>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full !py-4">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Configuration</>}
        </button>
      </div>
    </DashboardShell>
  );
}
