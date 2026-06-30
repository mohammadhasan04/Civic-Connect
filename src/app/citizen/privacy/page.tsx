'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth-context';
import { CitizenInfoRequest } from '@/lib/types';
import { formatRelative } from '@/lib/utils';
import { Loader2, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function CitizenPrivacyPage() {
  const _auth = useAuth();
  const [requests, setRequests] = useState<CitizenInfoRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    const supabase = createBrowserSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data } = await supabase
      .from('citizen_info_requests')
      .select('*, taluk_admin:profiles!citizen_info_requests_taluk_admin_id_fkey(full_name)')
      .eq('citizen_id', authUser.id)
      .order('requested_at', { ascending: false });

    setRequests((data || []) as unknown as CitizenInfoRequest[]);
    setLoading(false);
  }

  const respond = async (id: string, accept: boolean) => {
    const supabase = createBrowserSupabaseClient();

    const updates: Record<string, unknown> = {
      status: accept ? 'ACCEPTED' : 'REJECTED',
      responded_at: new Date().toISOString(),
    };
    if (accept) {
      // Set expiry to 7 days from now
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      updates.expires_at = expiry.toISOString();
    }

    const { error } = await supabase.from('citizen_info_requests').update(updates).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? 'Access granted for 7 days' : 'Request rejected');
    loadRequests();
  };

  const pending = requests.filter(r => r.status === 'PENDING');
  const history = requests.filter(r => r.status !== 'PENDING');

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--secondary)] to-[#2563EB] flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Privacy & Data Access</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">Manage who can view your personal information</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-[var(--warning)] uppercase tracking-wider mb-4 flex items-center gap-2"><Clock className="w-4 h-4" /> Pending Requests ({pending.length})</h2>
                <div className="space-y-3">
                  {pending.map(req => (
                    <div key={req.id} className="glass-card p-5 rounded-xl border-l-4 border-l-[var(--warning)]">
                      <p className="text-sm font-bold mb-1">{(req.taluk_admin as unknown as { full_name: string })?.full_name || 'Admin'} is requesting access to your info</p>
                      <p className="text-xs text-[var(--on-surface-variant)] mb-3">Reason: {req.reason}</p>
                      <p className="text-xs text-[var(--outline)] mb-3">{formatRelative(req.requested_at)}</p>
                      <div className="flex gap-2">
                        <button onClick={() => respond(req.id, true)} className="px-4 py-2 rounded-xl text-sm font-bold bg-[var(--success-bg)] text-[var(--success)] hover:bg-[var(--success)]/20 border border-[rgba(16,185,129,0.2)] transition-colors flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" /> Accept (7 days)
                        </button>
                        <button onClick={() => respond(req.id, false)} className="px-4 py-2 rounded-xl text-sm font-bold bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger)]/20 border border-[rgba(239,68,68,0.2)] transition-colors flex items-center gap-1.5">
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4">Request History</h2>
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map(req => (
                    <div key={req.id} className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold">{(req.taluk_admin as unknown as { full_name: string })?.full_name || 'Admin'}</p>
                        <p className="text-xs text-[var(--outline)]">{req.reason} • {formatRelative(req.requested_at)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${req.status === 'ACCEPTED' ? 'bg-[var(--success-bg)] text-[var(--success)]' : req.status === 'REJECTED' ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-[var(--warning-bg)] text-[var(--warning)]'}`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card p-8 text-center rounded-[2rem]">
                  <Shield className="w-10 h-10 text-[var(--success)] mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-bold mb-1">No access requests</p>
                  <p className="text-xs text-[var(--outline)]">Your personal information is protected</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
