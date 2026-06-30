'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2, LayoutDashboard, FileText, PlusCircle,
  Users, BarChart3, LogOut, Shield, MapPinned, Tag,
  Home, User, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/constants';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  userRole: UserRole;
  userName: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const CITIZEN_NAV: NavItem[] = [
  { href: '/citizen/dashboard', label: 'My Complaints', icon: FileText },
  { href: '/citizen/complaints/new', label: 'Report Issue', icon: PlusCircle },
];

const STAFF_NAV: NavItem[] = [
  { href: '/staff/dashboard', label: 'Assigned Tickets', icon: FileText },
];

const SUPERVISOR_NAV: NavItem[] = [
  { href: '/supervisor/dashboard', label: 'Ward Overview', icon: LayoutDashboard },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users & Staff', icon: Users },
  { href: '/admin/departments', label: 'Departments', icon: Building2 },
  { href: '/admin/wards', label: 'Wards', icon: MapPinned },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/complaints', label: 'All Complaints', icon: FileText },
];

const SUPER_ADMIN_NAV: NavItem[] = [
  { href: '/superadmin/dashboard', label: 'System Overview', icon: LayoutDashboard },
  { href: '/superadmin/users', label: 'All Users', icon: Users },
  { href: '/superadmin/complaints', label: 'All Complaints', icon: FileText },
  { href: '/superadmin/branding', label: 'Branding', icon: Settings },
  { href: '/superadmin/config', label: 'Config', icon: Settings },
  { href: '/superadmin/audit-log', label: 'Audit Log', icon: Shield },
];

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getNavItems = (): NavItem[] => {
    switch (userRole) {
      case 'dept_staff': return STAFF_NAV;
      case 'ward_supervisor': return SUPERVISOR_NAV;
      case 'super_admin': return SUPER_ADMIN_NAV;
      case 'taluk_admin': return ADMIN_NAV;
      default: return CITIZEN_NAV;
    }
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Clear any cookies as fallback
      document.cookie = 'sb-access-token=; path=/; max-age=0';
      document.cookie = 'sb-refresh-token=; path=/; max-age=0';
    }
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <aside className="desktop-sidebar w-72 glass-card !rounded-none border-t-0 border-l-0 border-b-0 flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-40 bg-opacity-80 backdrop-blur-2xl">
      {/* Header */}
      <div className="p-6 border-b border-[var(--outline-variant)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--glass-bg-hover)] to-transparent opacity-50 pointer-events-none"></div>
        <Link href="/" className="flex items-center gap-3 relative z-10 group">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,105,72,0.3)] transition-transform group-hover:scale-105">
            <Building2 className="w-5 h-5 text-[var(--on-primary)]" />
          </div>
          <div>
            <span className="text-lg font-extrabold text-[var(--on-surface)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Civic Connect
            </span>
            <span className="block text-[11px] font-bold text-[var(--primary)] -mt-1 tracking-wider uppercase">Bhatkal Taluk</span>
          </div>
        </Link>
      </div>

      {/* User info */}
      <div className="p-5 border-b border-[var(--outline-variant)] bg-[rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--glass-bg-hover)] to-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--on-surface)] text-lg font-bold shadow-inner">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[var(--background)]"></div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--on-surface)] truncate">{userName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="text-xs text-[var(--primary)] font-semibold tracking-wide uppercase">
                {ROLE_LABELS[userRole]}
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-[10px] font-bold text-[var(--outline)] uppercase tracking-wider mb-2 ml-2">Menu</div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden',
                isActive
                  ? 'bg-gradient-to-r from-[var(--surface-container-highest)] to-transparent text-[var(--primary)] border border-[var(--ring)] shadow-[inset_4px_0_0_var(--primary)]'
                  : 'text-[var(--on-surface-variant)] hover:bg-[var(--glass-bg)] hover:text-[var(--on-surface)] border border-transparent hover:border-[var(--glass-border)]'
              )}
            >
              {isActive && <div className="absolute inset-0 bg-[var(--primary)] opacity-5 animate-pulse"></div>}
              <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", isActive && "drop-shadow-[0_0_8px_rgba(245,166,35,0.5)]")} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}

        <div className="border-t border-[var(--outline-variant)] my-5" />
        
        <div className="text-[10px] font-bold text-[var(--outline)] uppercase tracking-wider mb-2 ml-2">App</div>
        <Link
          href="/transparency"
          className="group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-[var(--on-surface-variant)] hover:bg-[var(--glass-bg)] hover:text-[var(--on-surface)] border border-transparent hover:border-[var(--glass-border)] transition-all duration-300"
        >
          <BarChart3 className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
          Transparency
        </Link>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-[var(--outline-variant)] bg-[rgba(0,0,0,0.1)]">
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition-all w-full"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 transition-transform group-hover:-translate-x-1" />
          Logout
        </button>
      </div>
    </aside>
  );
}

/* ============================================================
   MOBILE BOTTOM NAV
   ============================================================ */
interface MobileNavProps {
  userRole: UserRole;
}

const MOBILE_CITIZEN: { href: string; label: string; icon: typeof Home }[] = [
  { href: '/citizen/dashboard', label: 'Home', icon: Home },
  { href: '/citizen/complaints/new', label: 'Report', icon: PlusCircle },
  { href: '/transparency', label: 'Stats', icon: BarChart3 },
  { href: '/citizen/profile', label: 'Profile', icon: User },
];

const MOBILE_STAFF: typeof MOBILE_CITIZEN = [
  { href: '/staff/dashboard', label: 'Queue', icon: FileText },
  { href: '/transparency', label: 'Stats', icon: BarChart3 },
  { href: '/staff/dashboard', label: 'Profile', icon: User },
];

const MOBILE_ADMIN: typeof MOBILE_CITIZEN = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/complaints', label: 'Tickets', icon: FileText },
  { href: '/admin/dashboard', label: 'Profile', icon: User },
];

export function MobileBottomNav({ userRole }: MobileNavProps) {
  const pathname = usePathname();
  const items = userRole === 'taluk_admin' || userRole === 'super_admin'
    ? MOBILE_ADMIN
    : userRole === 'dept_staff'
      ? MOBILE_STAFF
      : MOBILE_CITIZEN;

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 glass-card !rounded-none border-b-0 border-x-0 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.3)] bg-opacity-90 backdrop-blur-2xl">
      <div className="flex items-center justify-around h-[72px] px-2">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-16 h-full relative transition-all duration-300',
                isActive ? 'text-[var(--primary)]' : 'text-[var(--outline)] hover:text-[var(--on-surface)]'
              )}
            >
              {isActive && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-1 bg-[var(--primary)] rounded-b-full shadow-[0_0_8px_rgba(245,166,35,0.8)]"></div>
              )}
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive ? "bg-[var(--surface-container-highest)] -translate-y-1" : ""
              )}>
                <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_rgba(245,166,35,0.6)]')} />
              </div>
              <span className={cn(
                "text-[10px] font-bold transition-all duration-300",
                isActive ? "opacity-100" : "opacity-70"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
