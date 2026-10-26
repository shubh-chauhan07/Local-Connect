import { type ReactNode, useState } from 'react';
import {
  Bell, Home, Briefcase, Bookmark, FileText, User as UserIcon, LogOut,
  LayoutDashboard, PlusCircle, Users, ShieldAlert, MapPin, Menu, X,
} from 'lucide-react';
import { useRouter, linkProps } from '@/lib/router';
import { useDB, useSession, getUser, getUnreadCount, signOut } from '@/data/store';
import { Logo, Avatar } from '@/components/shared';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  match?: (path: string) => boolean;
}

const workerNav: NavItem[] = [
  { to: '/worker', label: 'Home', icon: <Home className="h-5 w-5" />, match: (p) => p === '/worker' },
  { to: '/worker/jobs', label: 'Find Work', icon: <Briefcase className="h-5 w-5" />, match: (p) => p.startsWith('/worker/jobs') },
  { to: '/worker/applications', label: 'Applications', icon: <FileText className="h-5 w-5" />, match: (p) => p.startsWith('/worker/applications') },
  { to: '/worker/saved', label: 'Saved', icon: <Bookmark className="h-5 w-5" />, match: (p) => p.startsWith('/worker/saved') },
  { to: '/worker/profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" />, match: (p) => p.startsWith('/worker/profile') },
];

const workerMobileNav = workerNav.slice(0, 5);

const employerNav: NavItem[] = [
  { to: '/employer', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, match: (p) => p === '/employer' },
  { to: '/employer/jobs/new', label: 'Post a Job', icon: <PlusCircle className="h-5 w-5" />, match: (p) => p === '/employer/jobs/new' },
  { to: '/employer/jobs', label: 'Manage Jobs', icon: <Briefcase className="h-5 w-5" />, match: (p) => p.startsWith('/employer/jobs') && p !== '/employer/jobs/new' },
  { to: '/employer/applicants', label: 'Applicants', icon: <Users className="h-5 w-5" />, match: (p) => p.startsWith('/employer/applicants') },
  { to: '/employer/profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" />, match: (p) => p.startsWith('/employer/profile') },
];

const employerMobileNav: NavItem[] = [
  { to: '/employer', label: 'Home', icon: <Home className="h-5 w-5" />, match: (p) => p === '/employer' },
  { to: '/employer/jobs', label: 'Jobs', icon: <Briefcase className="h-5 w-5" />, match: (p) => p.startsWith('/employer/jobs') },
  { to: '/employer/jobs/new', label: 'Post', icon: <PlusCircle className="h-5 w-5" />, match: (p) => p === '/employer/jobs/new' },
  { to: '/employer/applicants', label: 'Applicants', icon: <Users className="h-5 w-5" />, match: (p) => p.startsWith('/employer/applicants') },
  { to: '/employer/profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" />, match: (p) => p.startsWith('/employer/profile') },
];

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Moderation', icon: <ShieldAlert className="h-5 w-5" />, match: (p) => p === '/admin' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const db = useDB();
  const [session] = useSession();
  const { path, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = getUser(db, session.userId);
  const unread = user ? getUnreadCount(db, user.id) : 0;
  const role: Role = session.role;

  const navItems = role === 'worker' ? workerNav : role === 'employer' ? employerNav : adminNav;
  const mobileNav = role === 'worker' ? workerMobileNav : role === 'employer' ? employerMobileNav : adminNav;

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  const notificationsPath = role === 'worker' ? '/worker/notifications' : role === 'employer' ? '/employer/notifications' : '/admin';

  return (
    <div className="min-h-screen flex flex-col bg-canvas-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-canvas-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile menu toggle */}
            <button
              className="lg:hidden rounded-lg p-2 text-ink-600 hover:bg-canvas-100"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <a {...linkProps('/', navigate)} className="flex items-center">
              <Logo />
            </a>
            <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
              <MapPin className="h-3 w-3" /> Ahmedabad
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              {...linkProps(notificationsPath, navigate)}
              className="relative rounded-lg p-2 text-ink-600 hover:bg-canvas-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </a>

            {user && (
              <a
                {...linkProps(role === 'worker' ? '/worker/profile' : '/employer/profile', navigate)}
                className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-canvas-100 transition-colors"
              >
                <Avatar name={user.name} color={user.avatarColor} size="sm" />
                <span className="hidden md:block text-sm font-semibold text-ink-800 max-w-[8rem] truncate">
                  {user.name}
                </span>
              </a>
            )}

            <button
              onClick={logout}
              className="rounded-lg p-2 text-ink-500 hover:bg-canvas-100 hover:text-ink-700 transition-colors"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4 sm:px-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 py-6 pr-4">
          <nav className="sticky top-24 flex flex-col gap-1">
            {navItems.map((item) => {
              const active = item.match ? item.match(path) : path === item.to;
              return (
                <a
                  key={item.to}
                  {...linkProps(item.to, navigate)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-600 hover:bg-canvas-100 hover:text-ink-900',
                  )}
                >
                  <span className={cn(active ? 'text-brand-600' : 'text-ink-400')}>{item.icon}</span>
                  {item.label}
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 py-6 pb-24 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-canvas-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {mobileNav.map((item) => {
            const active = item.match ? item.match(path) : path === item.to;
            return (
              <a
                key={item.to}
                {...linkProps(item.to, navigate)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors',
                  active ? 'text-brand-600' : 'text-ink-400',
                )}
              >
                <span className={cn('flex h-6 w-6 items-center justify-center', active && 'text-brand-600')}>
                  {item.icon}
                </span>
                {item.label}
              </a>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Mobile slide-over menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white shadow-pop animate-slideUp p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-ink-500 hover:bg-canvas-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-4 flex flex-col gap-1">
              {navItems.map((item) => {
                const active = item.match ? item.match(path) : path === item.to;
                return (
                  <a
                    key={item.to}
                    {...linkProps(item.to, navigate)}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                      active ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-canvas-100',
                    )}
                  >
                    <span className={active ? 'text-brand-600' : 'text-ink-400'}>{item.icon}</span>
                    {item.label}
                  </a>
                );
              })}
              <button
                onClick={() => { setMobileOpen(false); logout(); }}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink-500 hover:bg-canvas-100"
              >
                <LogOut className="h-5 w-5 text-ink-400" />
                Log out
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}


