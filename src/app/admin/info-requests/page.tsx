'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Send } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { toast } from 'sonner';

interface InfoRequest {
  id: string;
  citizen_id: string;
  complaint_id: string | null;
  reason: string;
  status: string;
  requested_at: string;
  responded_at: string | null;
  citizen?: { full_name: string; email: string };
}

export default function AdminInfoRequestsPage() {
  const _auth = useAuth();
  const [requests, setRequests] = useState<InfoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [reason, setReason] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    const supabase = createBrowserSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data } = await supabase
      .from('citizen_info_requests')
      .select('*, citizen:profiles!citizen_info_requests_citizen_id_fkey(full_name, email)')
      .eq('taluk_admin_id', authUser.id)
      .order('requested_at', { ascending: false });

    setRequests((data || []) as unknown as InfoRequest[]);
    setLoading(false);
  }

  const handleSendRequest = async () => {
    if (!citizenEmail || !reason) { toast.error('Email and reason required'); return; }
    setSending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { data: citizen } = await supabase.from('profiles').select('id').eq('email', citizenEmail.trim().toLowerCase()).eq('role', 'citizen').single();
      if (!citizen) { toast.error('Citizen not found with that email'); setSending(false); return; }

      const { error } = await supabase.from('citizen_info_requests').insert({
        taluk_admin_id: authUser?.id,
        citizen_id: citizen.id,
        reason: reason.trim(),
        status: 'PENDING',
        requested_at: new Date().toISOString(),
      });

      if (error) { toast.error(error.message); return; }
      toast.success('Info request sent to citizen');
      setShowNewRequest(false);
      setReason('');
      setCitizenEmail('');
      loadRequests();
    } catch { toast.error('Failed to send request'); } finally { setSending(false); }
  };

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Citizen Info Requests</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">Request access to citizen personal information</p>
          </div>
          <button onClick={() => setShowNewRequest(!showNewRequest)} className="btn-primary"><Send className="w-4 h-4" /> New Request</button>
        </div>

        {showNewRequest && (
          <div className="glass-card p-6 rounded-2xl mb-6">
            <h2 className="text-sm font-bold text-[var(--outline)] uppercase tracking-wider mb-4">Request Citizen Info</h2>
            <div className="space-y-4 mb-4">
              <input type="email" value={citizenEmail} onChange={e => setCitizenEmail(e.target.value)} placeholder="Citizen's email address" className="glass-input" />
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for accessing citizen information (required)" className="glass-input min-h-[80px]" rows={3} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSendRequest} disabled={sending} className="btn-primary">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Request'}</button>
              <button onClick={() => setShowNewRequest(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div> : (
          <div className="space-y-2">
            {requests.map(req => (
              <div key={req.id} className="glass-card p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{req.citizen?.full_name || 'Citizen'}</p>
                  <p className="text-xs text-[var(--outline)]">{req.reason} • {formatRelative(req.requested_at)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${req.status === 'ACCEPTED' ? 'bg-[var(--success-bg)] text-[var(--success)]' : req.status === 'REJECTED' ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : req.status === 'EXPIRED' ? 'bg-[var(--glass-bg)] text-[var(--outline)]' : 'bg-[var(--warning-bg)] text-[var(--warning)]'}`}>{req.status}</span>
              </div>
            ))}
            {requests.length === 0 && <div className="glass-card p-8 text-center text-[var(--outline)]">No info requests sent</div>}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
