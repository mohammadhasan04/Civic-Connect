'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Building2, Mail, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, validateEmail } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailValidation = useMemo(() => validateEmail(email), [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValidation.valid) { toast.error(emailValidation.error || 'Please enter a valid email address'); return; }
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success('Password reset link sent to your email.');
      }
    } catch {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--secondary)] rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-float pointer-events-none" />
      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] rounded-2xl mb-6 shadow-[0_0_30px_rgba(0,105,72,0.3)]">
            <Building2 className="w-8 h-8 text-[var(--on-primary)]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-display)' }}>Reset Password</h1>
          <p className="text-base text-[var(--on-surface-variant)] font-medium">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="glass-card p-8 sm:p-10 mb-8 rounded-[2rem] text-center">
            <CheckCircle className="w-16 h-16 text-[var(--success)] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Check Your Email</h2>
            <p className="text-sm text-[var(--on-surface-variant)] mb-6">We&apos;ve sent a password reset link to <span className="text-[var(--primary)] font-bold">{email}</span></p>
            <Link href="/login" className="btn-primary w-full !py-4 inline-flex">Back to Sign In</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card p-8 sm:p-10 mb-8 rounded-[2rem] border-[rgba(255,255,255,0.05)] shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.03)] to-transparent pointer-events-none" />
            <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wide">Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="Enter your registered email"
                  className={cn("glass-input !py-3.5 !text-base", touched && !emailValidation.valid && "!border-[var(--danger)]")} autoComplete="email" required
                />
                {touched && !emailValidation.valid && (
                  <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {emailValidation.error}
                  </p>
                )}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-4 text-base">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <>Send Reset Link <Mail className="w-5 h-5 ml-2" /></>}
              </button>
            </div>
          </form>
        )}

        <Link href="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
      </div>
    </main>
  );
}
