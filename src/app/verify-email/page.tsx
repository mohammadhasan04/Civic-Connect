'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) { toast.error('No email address found'); return; }
    setResending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        toast.error(error.message);
      } else {
        setResent(true);
        toast.success('Verification email sent! Please check your inbox.');
      }
    } catch {
      toast.error('Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--primary)] rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-float pointer-events-none" />
      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] rounded-2xl mb-6 shadow-[0_0_30px_rgba(0,105,72,0.3)]">
            <Mail className="w-10 h-10 text-[var(--on-primary)]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-display)' }}>Check Your Email</h1>
          <p className="text-base text-[var(--on-surface-variant)] font-medium">We&apos;ve sent a verification link to</p>
          {email && <p className="text-[var(--primary)] font-bold mt-1">{email}</p>}
        </div>

        <div className="glass-card p-8 sm:p-10 mb-8 rounded-[2rem] text-center">
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[var(--info-bg)] border border-[rgba(14,165,233,0.2)]">
              <p className="text-sm text-[var(--info)] font-medium">
                Click the link in your email to activate your account. If you don&apos;t see it, check your spam folder.
              </p>
            </div>

            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="btn-secondary w-full !py-4 gap-2"
            >
              {resending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : resent ? (
                <><CheckCircle className="w-5 h-5 text-[var(--success)]" /> Email Sent!</>
              ) : (
                <><RefreshCw className="w-5 h-5" /> Resend Verification Email</>
              )}
            </button>

            <Link href="/login" className="btn-primary w-full !py-4 inline-flex">
              Go to Sign In
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-[var(--outline)]">
          Wrong email? <Link href="/register" className="text-[var(--primary)] font-bold hover:text-[var(--primary-container)]">Register again</Link>
        </p>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
