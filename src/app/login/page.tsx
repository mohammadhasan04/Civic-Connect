'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Eye, EyeOff, Shield, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, validateEmail } from '@/lib/utils';
import { ROLE_HOME_ROUTES } from '@/lib/constants';
import { ThemeToggle } from '@/components/layout/DashboardShell';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  // Shortcut IDs map — allow login by ID or email
  const shortcutIds = ['superadmin', 'mohammadhasan', 'cityadmin', 'city admin', 'wardsupervisor', 'ws', 'departmentstaff', 'staff', 'citizen'];
  const isShortcutId = shortcutIds.includes(email.trim().toLowerCase());

  const emailValidation = useMemo(() => {
    if (isShortcutId) return { valid: true, error: null };
    return validateEmail(email);
  }, [email, isShortcutId]);

  const passwordValid = password.length > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!email.trim()) { toast.error('Please enter your ID or email'); return; }
    if (!isShortcutId && !emailValidation.valid) { toast.error(emailValidation.error || 'Invalid email'); return; }
    if (!password) { toast.error('Please enter your password'); return; }

    setLoading(true);
    try {
      let loginEmail = email.trim().toLowerCase();
      
      // Map shortcut IDs to their system emails
      const idMap: Record<string, string> = {
        "superadmin": "mohammadhasan16114@gmail.com",
        "mohammadhasan": "mohammadhasan16114@gmail.com",
        "cityadmin": "cityadmin@gmail.com",
        "city admin": "cityadmin@gmail.com",
        "wardsupervisor": "wardsupervisor@gmail.com",
        "ws": "wardsupervisor@gmail.com",
        "departmentstaff": "departmentstaff@gmail.com",
        "staff": "departmentstaff@gmail.com",
        "citizen": "mohammedhasanudyavar1@gmail.com",
      };
      
      if (idMap[loginEmail]) {
        loginEmail = idMap[loginEmail];
      }

      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          toast.error('Invalid email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email before signing in.');
          router.push('/verify-email?email=' + encodeURIComponent(email));
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name, is_active')
          .eq('id', data.user.id)
          .single();

        if (profile && !profile.is_active) {
          await supabase.auth.signOut();
          toast.error('Your account has been deactivated. Please contact the administrator.');
          return;
        }

        const role = profile?.role || 'citizen';
        const name = profile?.full_name || 'User';
        toast.success(`Welcome back, ${name}!`);
        router.push(ROLE_HOME_ROUTES[role as keyof typeof ROLE_HOME_ROUTES] || '/citizen/dashboard');
      }
    } catch {
      toast.error('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--primary)] rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-float pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[var(--secondary)] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-float-slow pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] rounded-2xl mb-6 shadow-[0_0_30px_rgba(0,105,72,0.3)] hover:scale-105 transition-transform duration-300 group">
            <Building2 className="w-8 h-8 text-[var(--on-primary)] group-hover:rotate-3 transition-transform duration-300" />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-[var(--on-surface)]" style={{ fontFamily: 'var(--font-display)' }}>Welcome Back</h1>
          <p className="text-base text-[var(--on-surface-variant)] font-medium">Sign in to your Civic Connect account</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card p-8 sm:p-10 mb-8 rounded-[2rem] border-[rgba(255,255,255,0.05)] shadow-2xl relative overflow-hidden" noValidate>
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.03)] to-transparent pointer-events-none" />
          <div className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-bold text-[var(--on-surface-variant)] mb-2 uppercase tracking-wide">ID or Email Address</label>
              <input
                type="text" value={email} onChange={e => setEmail(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                placeholder="Enter your ID or email"
                className={cn("glass-input !py-3.5 !text-base focus:shadow-[0_0_15px_rgba(0,105,72,0.2)] transition-shadow duration-300", touched.email && !isShortcutId && !emailValidation.valid && email.trim() !== '' && "!border-[var(--danger)]")}
                autoComplete="username"
                required
              />
              {touched.email && !isShortcutId && !emailValidation.valid && email.trim() !== '' && (
                <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {emailValidation.error}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-[var(--on-surface-variant)] uppercase tracking-wide">Password</label>
                <Link href="/forgot-password" className="text-xs font-bold text-[var(--primary)] hover:text-[var(--primary-container)] transition-colors">Forgot?</Link>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="Enter your password"
                  className={cn("glass-input !py-3.5 !text-base !pr-10 focus:shadow-[0_0_15px_rgba(0,105,72,0.2)] transition-shadow duration-300", touched.password && !passwordValid && "!border-[var(--danger)]")}
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--outline)] hover:text-[var(--primary)] transition-colors p-1">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.password && !passwordValid && (
                <p className="text-xs font-semibold text-[var(--danger)] mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> Password is required
                </p>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full !py-4 text-base mt-2 shadow-[0_0_20px_rgba(0,105,72,0.25)] group hover:shadow-[0_0_30px_rgba(0,105,72,0.4)]">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <>Sign In <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </div>
        </form>

        <div className="text-center space-y-6">
          <p className="text-sm font-medium text-[var(--on-surface-variant)]">
            New to Civic Connect?{' '}
            <Link href="/register" className="text-[var(--primary)] font-bold hover:text-[var(--primary-container)] transition-colors border-b border-transparent hover:border-[var(--primary-container)] pb-0.5">Create an account</Link>
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-[var(--outline)] opacity-80 backdrop-blur-sm bg-[var(--glass-bg)] w-max mx-auto px-4 py-2 rounded-full border border-[var(--glass-border)]">
            <Shield className="w-3.5 h-3.5 text-[var(--success)]" />
            <span>256-bit Encrypted • Secure Connection</span>
          </div>
        </div>
      </div>
    </main>
  );
}
