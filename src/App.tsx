import { useEffect, type ReactNode } from 'react';
import { useAuth, useDBStatus, useSession, initAuth } from '@/data/store';
import { linkProps, useRouter } from '@/lib/router';
import { AppShell } from '@/components/AppShell';
import { Toaster, toastError } from '@/components/ui/Toast';
import { Logo } from '@/components/shared';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { WorkerDashboard } from '@/pages/worker/WorkerDashboard';
import { WorkerJobsPage } from '@/pages/worker/WorkerJobsPage';
import { JobDetailPage } from '@/pages/worker/JobDetailPage';
import { WorkerApplicationsPage } from '@/pages/worker/WorkerApplicationsPage';
import { WorkerSavedPage } from '@/pages/worker/WorkerSavedPage';
import { WorkerProfilePage } from '@/pages/worker/WorkerProfilePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { EmployerDashboard } from '@/pages/employer/EmployerDashboard';
import { EmployerJobFormPage } from '@/pages/employer/EmployerJobFormPage';
import { EmployerManageJobsPage } from '@/pages/employer/EmployerManageJobsPage';
import { EmployerApplicantsPage } from '@/pages/employer/EmployerApplicantsPage';
import { EmployerProfilePage } from '@/pages/employer/EmployerProfilePage';
import { AdminModerationPage } from '@/pages/AdminModerationPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loader2 } from 'lucide-react';

function RouteGuard({ allow, children }: { allow: boolean; children: React.ReactNode }) {
  const { navigate } = useRouter();
  useEffect(() => {
    if (!allow) navigate('/');
  }, [allow, navigate]);
  if (!allow) return null;
  return <>{children}</>;
}

function AccessRequired({ title, message }: { title: string; message: string }) {
  const { navigate } = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-50 px-4">
      <Card className="max-w-md p-8 text-center">
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
        <p className="mt-2 text-sm text-ink-600">{message}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" onClick={() => navigate('/')}>Home</Button>
          <Button onClick={() => navigate('/login')}>Log in</Button>
        </div>
        <Toaster />
      </Card>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm text-ink-500">Loading LocalConnect...</p>
      </div>
    </div>
  );
}

function NavigateTo({ to }: { to: string }) {
  const { navigate } = useRouter();
  useEffect(() => {
    navigate(to);
  }, [to, navigate]);
  return <LoadingScreen />;
}

function PublicPageFrame({ children }: { children: ReactNode }) {
  const { navigate } = useRouter();
  return (
    <div className="min-h-screen bg-canvas-50">
      <header className="border-b border-canvas-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a {...linkProps('/', navigate)} aria-label="LocalConnect home">
            <Logo />
          </a>
          <nav className="flex items-center gap-4 text-sm font-semibold text-ink-600">
            <a {...linkProps('/login', navigate)} className="hover:text-ink-900">Log in</a>
            <a {...linkProps('/signup', navigate)} className="hover:text-ink-900">Sign up</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  const [session] = useSession();
  const { path } = useRouter();
  const dbStatus = useDBStatus();

  useEffect(() => {
    if (auth.error) toastError(auth.error);
  }, [auth.error]);

  useEffect(() => {
    if (dbStatus.error) toastError(dbStatus.error);
  }, [dbStatus.error]);

  // Initialize auth listener once
  useEffect(() => {
    initAuth();
  }, []);

  // Strip query string for routing
  const route = path.split('?')[0];
  const requestedNext = new URLSearchParams(path.split('?')[1] ?? '').get('next');
  const nextJobsPath = requestedNext
    && !requestedNext.startsWith('//')
    && (requestedNext === '/jobs' || requestedNext.startsWith('/jobs?') || requestedNext.startsWith('/jobs/'))
    ? requestedNext
    : null;
  const isWorker = session.role === 'worker' && !!session.userId;
  const isEmployer = session.role === 'employer' && !!session.userId;
  const isAdmin = session.role === 'admin' && !!auth.supabaseUser;

  // Show loading screen while auth state resolves
  if (auth.loading && route !== '/' && route !== '/login' && route !== '/signup') {
    return <LoadingScreen />;
  }

  // Public routes — redirect to dashboard if already logged in
  if (route === '/' || route === '') {
    if (isWorker) return <NavigateTo to="/worker" />;
    if (isEmployer) return <NavigateTo to="/employer" />;
    if (isAdmin) return <NavigateTo to="/admin" />;
    return <><LandingPage /><Toaster /></>;
  }
  if (route === '/login' || route === '/signup') {
    if (isWorker) return <NavigateTo to={nextJobsPath ?? '/worker'} />;
    if (isEmployer) return <NavigateTo to={nextJobsPath ?? '/employer'} />;
    if (isAdmin) return <NavigateTo to={nextJobsPath ?? '/admin'} />;
    return <><AuthPage mode={route === '/login' ? 'login' : 'signup'} /><Toaster /></>;
  }
  if (route === '/reset-password') return <><ResetPasswordPage /><Toaster /></>;

  if (route === '/jobs') {
    return (
      <PublicPageFrame>
        <WorkerJobsPage publicMode />
        <Toaster />
      </PublicPageFrame>
    );
  }
  if (route.startsWith('/jobs/')) {
    return (
      <PublicPageFrame>
        <JobDetailPage jobId={route.split('/')[2]} publicMode />
        <Toaster />
      </PublicPageFrame>
    );
  }

  // Admin routes — gated by server-side admin flag
  if (route === '/admin') {
    if (!isAdmin) {
      return <AccessRequired title="Admin access required" message="This area is restricted to administrators. Admin access is assigned through the Supabase dashboard, not through signup." />;
    }
    return (
      <AppShell>
        <AdminModerationPage />
        <Toaster />
      </AppShell>
    );
  }

  // Worker routes
  if (route.startsWith('/worker')) {
    if (!isWorker) {
      return (
        <AccessRequired
          title="Worker account required"
          message="Log in with a verified worker account to view this page. Job listings are publicly browsable without an account."
        />
      );
    }
    return (
      <AppShell>
        <RouteGuard allow={isWorker}>
          {route === '/worker' && <WorkerDashboard />}
          {route === '/worker/jobs' && <WorkerJobsPage />}
          {route.startsWith('/worker/jobs/') && route !== '/worker/jobs' && (
            <JobDetailPage jobId={route.split('/')[3]} />
          )}
          {route === '/worker/applications' && <WorkerApplicationsPage />}
          {route === '/worker/saved' && <WorkerSavedPage />}
          {route === '/worker/profile' && <WorkerProfilePage />}
          {route === '/worker/notifications' && <NotificationsPage />}
        </RouteGuard>
        <Toaster />
      </AppShell>
    );
  }

  // Employer routes
  if (route.startsWith('/employer')) {
    if (!isEmployer) {
      return (
        <AccessRequired
          title="Employer account required"
          message="Log in with a verified employer account to post jobs and review applicants. Job listings are publicly browsable without an account."
        />
      );
    }
    return (
      <AppShell>
        <RouteGuard allow={isEmployer}>
          {route === '/employer' && <EmployerDashboard />}
          {route === '/employer/jobs/new' && <EmployerJobFormPage />}
          {route.startsWith('/employer/jobs/') && route.endsWith('/edit') && (
            <EmployerJobFormPage editJobId={route.split('/')[3]} />
          )}
          {route === '/employer/jobs' && <EmployerManageJobsPage />}
          {route === '/employer/applicants' && <EmployerApplicantsPage />}
          {route === '/employer/profile' && <EmployerProfilePage />}
          {route === '/employer/notifications' && <NotificationsPage />}
        </RouteGuard>
        <Toaster />
      </AppShell>
    );
  }

  // Fallback
  return <><NotFoundPage /><Toaster /></>;
}
