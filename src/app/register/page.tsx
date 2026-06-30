'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Eye, EyeOff, Shield, Loader2, Check, X, ArrowRight, AlertCircle } from 'lucide-react';
import { cn, validatePhone, validateEmail, validateName } from '@/lib/utils';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/layout/DashboardShell';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { score: 1, label: 'Weak', color: '#EF4444' };
  if (score <= 3) return { score: 2, label: 'Fair', color: '#F59E0B' };
  if (score <= 4) return { score: 3, label: 'Good', color: '#F5A623' };
  return { score: 4, label: 'Strong', color: '#10B981' };
}

const PASSWORD_RULES = [
  { label: '8+ chars', test: (pw: string) => pw.length >= 8 },
  { label: 'Upper', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'Lower', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'Number', test: (pw: string) => /[0-9]/.test(pw) },
  { label: 'Special', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Track which fields have been touched (blurred)
  const [touched, setTouched] = useState({ name: false, email: false, phone: false, password: false, confirmPassword: false });

  const handleBlur = useCallback((field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Validation results
  const nameValidation = useMemo(() => validateName(name), [name]);
  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const phoneValidation = useMemo(() => validatePhone(phone), [phone]);
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const passwordError = useMemo(() => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (strength.score < 2) return 'Password is too weak';
    return null;
  }, [password, strength.score]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) return null;
    if (password !== confirmPassword) return 'Passwords don\'t match';
    return null;
  }, [password, confirmPassword]);

  const isValid = nameValidation.valid && emailValidation.valid && phoneValidation.valid && !passwordError && password === confirmPassword && confirmPassword.length > 0;

  // Phone input handler — allow only digits and +
  const handlePhoneChange = useCallback((value: string) => {
    // Strip everything except digits and leading +
    const cleaned = value.replace(/[^\d+]/g, '');
    // Ensure only one + at the start
    const formatted = cleaned.startsWith('+') ? '+' + cleaned.slice(1).replace(/\+/g, '') : cleaned.replace(/\+/g, '');
    setPhone(formatted);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ name: true, email: true, phone: true, password: true, confirmPassword: true });

    if (!isValid) {
      // Show the first error
      if (!nameValidation.valid) { toast.error(nameValidation.error!); return; }
      if (!emailValidation.valid) { toast.error(emailValidation.error!); return; }
      if (!phoneValidation.valid) { toast.error(phoneValidation.error!); return; }
      if (passwordError) { toast.error(passwordError); return; }
      if (confirmPasswordError) { toast.error(confirmPasswordError); return; }
      toast.error('Please complete all required fields correctly');
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            phone: phoneValidation.formatted || null,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already in use')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else if (error.message.includes('weak') || error.message.includes('password')) {
          toast.error('Password is too weak. Please use a stronger password.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // The handle_new_user() trigger in Supabase creates the profile row automatically.
        // However, if signup requires email confirmation, user won't be fully authenticated yet.
        if (data.session) {
          // Direct signup without email confirmation
          toast.success('Account created! Welcome to Civic Connect.');
          router.push('/citizen/dashboard');
        } else {
          // Email confirmation required
          toast.success('Account created! Please check your email to verify your account.');
          router.push('/verify-email?email=' + encodeURIComponent(email.trim().toLowerCase()));
        }
      }
    } catch {
      toast.error('Registration failed. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[var(--primary)] rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-float pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--success)] rounded-full mix-blend-screen filter blur-[120px] opacity-[0.05] animate-float-slow pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] rounded-2xl mb-6 shadow-[0_0_30px_rgba(0,105,72,0.3)] hover:scale-105 transition-transform duration-300 group">
            <Building2 className="w-8 h-8 text-[var(--on-primary)] group-hover:-rotate-3 transition-transform duration-300" />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-display)' }}>Create Account</h1>
          <p className="text-base text-[var(--on-surface-variant)] font-medium">Join Civic Connect — Bhatkal Taluk</p>
        </div>

        <form onSubmit={handleRegister} className="glass-card p-8 sm:p-10 mb-8 rounded-[2rem] border-[rgba(255,255,255,0.05)] shadow-2xl relative overflow-hidden" noValidate>
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.03)] to-transparent pointer-events-none" />
          <div className="space-y-5 relative z-10">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Full Name <span className="text-[var(--primary)]">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="e.g. Rahul Sharma"
                className={cn("glass-input !py-3 !text-sm", touched.name && !nameValidation.valid && "!border-[var(--danger)]")}
                autoComplete="name"
                maxLength={100}
                required
              />
              {touched.name && !nameValidation.valid && (
                <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {nameValidation.error}
                </p>
              )}
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Email <span className="text-[var(--primary)]">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="your@email.com"
                  className={cn("glass-input !py-3 !text-sm", touched.email && !emailValidation.valid && "!border-[var(--danger)]")}
                  autoComplete="email"
                  required
                />
                {touched.email && !emailValidation.valid && (
                  <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {emailValidation.error}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Phone <span className="text-[10px] normal-case tracking-normal text-[var(--outline)]">(optional)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--outline)] pointer-events-none">🇮🇳</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    placeholder="+91 9876543210"
                    className={cn("glass-input !py-3 !text-sm !pl-9", touched.phone && !phoneValidation.valid && "!border-[var(--danger)]")}
                    autoComplete="tel"
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
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Password <span className="text-[var(--primary)]">*</span></label>
              <div className="relative group">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onBlur={() => handleBlur('password')} placeholder="••••••••" className={cn("glass-input !py-3 !text-sm !pr-10", touched.password && passwordError && "!border-[var(--danger)]")} autoComplete="new-password" maxLength={128} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--outline)] hover:text-[var(--primary)] transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-3 bg-[rgba(0,0,0,0.2)] p-3 rounded-xl border border-[var(--glass-border)]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-1.5 bg-[var(--glass-bg)] rounded-full overflow-hidden shadow-inner">
                      <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${strength.score * 25}%`, backgroundColor: strength.color }} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PASSWORD_RULES.map(rule => {
                      const pass = rule.test(password);
                      return (
                        <div key={rule.label} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-colors", pass ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--glass-bg)] text-[var(--outline)]")}>
                          {pass ? <Check className="w-2.5 h-2.5" /> : <span className="w-1 h-1 rounded-full bg-current mx-[3px]" />}
                          <span>{rule.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-widest">Confirm Password <span className="text-[var(--primary)]">*</span></label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onBlur={() => handleBlur('confirmPassword')} placeholder="••••••••" className={cn("glass-input !py-3 !text-sm", confirmPassword && password !== confirmPassword && "!border-[var(--danger)]")} autoComplete="new-password" maxLength={128} required />
              {confirmPassword && password !== confirmPassword && <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Passwords don&apos;t match</p>}
              {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && <p className="text-xs font-semibold text-[var(--success)] mt-1.5 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Passwords match</p>}
            </div>

            <button type="submit" disabled={loading || !isValid} className="btn-primary w-full !py-4 text-sm mt-4 shadow-[0_0_20px_rgba(0,105,72,0.2)] group disabled:opacity-50 disabled:shadow-none">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <>Create Free Account <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </div>
        </form>

        <div className="text-center space-y-5">
          <p className="text-sm font-medium text-[var(--on-surface-variant)]">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--primary)] font-bold hover:text-[var(--primary-container)] transition-colors">Sign In</Link>
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--outline)] opacity-80 backdrop-blur-sm bg-[var(--glass-bg)] w-max mx-auto px-4 py-2 rounded-full border border-[var(--glass-border)]">
            <Shield className="w-3.5 h-3.5 text-[var(--success)]" />
            <span>Secure Registration</span>
          </div>
        </div>
      </div>
    </main>
  );
}
