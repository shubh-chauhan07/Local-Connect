import { useCallback, useEffect, useState } from 'react';
import { useSyncExternalStore } from 'react';
import type {
  Database,
  Job,
  Application,
  SavedJob,
  NotificationItem,
  Report,
  User,
  WorkerProfile,
  EmployerProfile,
  Review,
  ApplicationStatus,
  JobStatus,
  Role,
} from '@/types';
import { supabase, SITE_URL } from '@/lib/supabase';

// ---------- ID generation ----------
export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

function avatarColor(seed: string): string {
  const colors = ['#10b981', '#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

// ---------- Session ----------
export interface Session {
  userId: string | null;
  role: Role;
}

interface AuthState {
  session: Session;
  supabaseUser: import('@supabase/supabase-js').User | null;
  emailConfirmed: boolean;
  loading: boolean;
  needsProfile: boolean; // just confirmed email, needs users row created
}

let authState: AuthState = {
  session: { userId: null, role: 'worker' },
  supabaseUser: null,
  emailConfirmed: false,
  loading: true,
  needsProfile: false,
};
const authListeners = new Set<() => void>();

function notifyAuth() {
  authListeners.forEach((l) => l());
}

function subscribeAuth(l: () => void) {
  authListeners.add(l);
  return () => { authListeners.delete(l); };
}
function getAuthSnapshot() { return authState; }
function getAuthServerSnapshot(): AuthState {
  return { session: { userId: null, role: 'worker' }, supabaseUser: null, emailConfirmed: false, loading: true, needsProfile: false };
}

// ---------- Database cache ----------
let dbCache: Database = emptyDB();
const dbListeners = new Set<() => void>();
let dbLoaded = false;
let dbLoading = false;
let dbError: string | null = null;

function emptyDB(): Database {
  return {
    users: [], workerProfiles: [], employerProfiles: [], jobs: [],
    applications: [], savedJobs: [], notifications: [], reports: [], reviews: [],
    seededAt: '',
  };
}

function notifyDB() {
  dbListeners.forEach((l) => l());
}

function setDB(db: Database) {
  dbCache = db;
  notifyDB();
}

// Fetch all data from Supabase and rebuild the Database cache
async function loadDatabase(): Promise<void> {
  if (dbLoading) return;
  dbLoading = true;
  dbError = null;
  try {
    const [usersR, empR, wpR, jobsR, appsR, savedR, notifR, reviewsR, reportsR] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('employer_profiles').select('*'),
      supabase.from('worker_profiles').select('*'),
      supabase.from('jobs').select('*'),
      supabase.from('applications').select('*'),
      supabase.from('saved_jobs').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('reviews').select('*'),
      supabase.from('reports').select('*'),
    ]);

    const users = (usersR.data ?? []) as unknown as User[];
    const employerProfiles = (empR.data ?? []) as unknown as EmployerProfile[];
    const workerProfiles = (wpR.data ?? []) as unknown as WorkerProfile[];
    let jobs = (jobsR.data ?? []) as unknown as Job[];
    const applications = (appsR.data ?? []) as unknown as Application[];
    const savedJobs = (savedR.data ?? []) as unknown as SavedJob[];
    const notifications = (notifR.data ?? []) as unknown as NotificationItem[];
    const reviews = (reviewsR.data ?? []) as unknown as Review[];
    const reports = (reportsR.data ?? []) as unknown as Report[];

    // Recompute applicantsCount from loaded applications for accuracy
    jobs = jobs.map((j) => ({
      ...j,
      applicantsCount: applications.filter((a) => a.jobId === j.id && a.status !== 'withdrawn').length,
    }));

    // Normalize timestamps to ISO strings
    const norm = (arr: Record<string, unknown>[]) =>
      arr.map((r) => {
        const o: Record<string, unknown> = { ...r };
        for (const k of ['createdAt', 'appliedAt', 'updatedAt', 'savedAt']) {
          if (o[k] && typeof o[k] === 'string') o[k] = new Date(o[k] as string).toISOString();
        }
        return o;
      });

    const db: Database = {
      users: norm(users as unknown as Record<string, unknown>[]) as unknown as User[],
      workerProfiles: norm(workerProfiles as unknown as Record<string, unknown>[]) as unknown as WorkerProfile[],
      employerProfiles: norm(employerProfiles as unknown as Record<string, unknown>[]) as unknown as EmployerProfile[],
      jobs: norm(jobs as unknown as Record<string, unknown>[]) as unknown as Job[],
      applications: norm(applications as unknown as Record<string, unknown>[]) as unknown as Application[],
      savedJobs: norm(savedJobs as unknown as Record<string, unknown>[]) as unknown as SavedJob[],
      notifications: norm(notifications as unknown as Record<string, unknown>[]) as unknown as NotificationItem[],
      reports: norm(reports as unknown as Record<string, unknown>[]) as unknown as Report[],
      reviews: norm(reviews as unknown as Record<string, unknown>[]) as unknown as Review[],
      seededAt: new Date().toISOString(),
    };
    setDB(db);
    dbLoaded = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : 'Failed to load data from the database.';
  } finally {
    dbLoading = false;
  }
}

function subscribeDB(l: () => void) {
  dbListeners.add(l);
  if (!dbLoaded && !dbLoading) loadDatabase();
  return () => { dbListeners.delete(l); };
}
function getDBSnapshot() { return dbCache; }
function getDBServerSnapshot(): Database { return emptyDB(); }

// ---------- React hooks ----------
export function useDB(): Database {
  return useSyncExternalStore(subscribeDB, getDBSnapshot, getDBServerSnapshot);
}

export function useDBStatus() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    dbListeners.add(l);
    return () => { dbListeners.delete(l); };
  }, []);
  return { loading: !dbLoaded && dbLoading, error: dbError, refresh: () => loadDatabase() };
}

export function useAuth() {
  const state = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthServerSnapshot);
  return state;
}

export function useSession(): [Session, (s: Session) => void] {
  const state = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthServerSnapshot);
  // setSession is kept for compatibility but should not be used for auth changes
  const set = useCallback((s: Session) => {
    authState = { ...authState, session: s };
    notifyAuth();
  }, []);
  return [state.session, set];
}

// ---------- Auth initialization ----------
let authInitialized = false;

export async function initAuth() {
  if (authInitialized) return;
  authInitialized = true;

  // Register onAuthStateChange BEFORE getSession() so we don't miss the
  // SIGNED_IN event that fires when Supabase exchanges the confirmation
  // token from the URL (detectSessionInUrl: true).
  supabase.auth.onAuthStateChange(async (event, sbSession) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (sbSession?.user) {
        await handleAuthSession(sbSession.user);
        // Redirect to the user's dashboard after successful email confirmation or login
        if (event === 'SIGNED_IN' && sbSession.user.email_confirmed_at) {
          redirectAfterAuth(sbSession.user);
        }
      }
    } else if (event === 'SIGNED_OUT') {
      authState = {
        session: { userId: null, role: 'worker' },
        supabaseUser: null,
        emailConfirmed: false,
        loading: false,
        needsProfile: false,
      };
      notifyAuth();
      loadDatabase();
    } else if (event === 'PASSWORD_RECOVERY') {
      // Handled by the reset page via useAuth
      if (sbSession?.user) {
        authState = {
          ...authState,
          supabaseUser: sbSession.user,
          loading: false,
        };
        notifyAuth();
      }
    }
  });

  // Restore session on load
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await handleAuthSession(session.user);
  } else {
    authState = { ...authState, loading: false };
    notifyAuth();
  }
}

async function handleAuthSession(sbUser: import('@supabase/supabase-js').User) {
  const emailConfirmed = !!sbUser.email_confirmed_at;
  const appMeta = sbUser.app_metadata ?? {};
  const userMeta = sbUser.user_metadata ?? {};
  const isAdmin = appMeta.role === 'admin';

  // Look up the application users row for this auth user
  const { data: userRow } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', sbUser.id)
    .maybeSingle();

  if (!userRow) {
    // Need to create the users + profile rows (after email confirmation)
    if (!emailConfirmed) {
      authState = {
        session: { userId: null, role: 'worker' },
        supabaseUser: sbUser,
        emailConfirmed: false,
        loading: false,
        needsProfile: false,
      };
      notifyAuth();
      return;
    }
    // Create users row + profile
    const role: Role = (userMeta.role as Role) || 'worker';
    const name = (userMeta.name as string) || sbUser.email?.split('@')[0] || 'User';
    const phone = (userMeta.phone as string) || '';
    const area = (userMeta.area as string) || '';
    const userId = newId('u');
    const newUser: User = {
      id: userId,
      role,
      name,
      email: sbUser.email ?? '',
      phone,
      verification: 'unverified',
      createdAt: new Date().toISOString(),
      avatarColor: avatarColor(name),
    };
    const { error: userErr } = await supabase.from('users').insert({ ...newUser, auth_id: sbUser.id });
    if (userErr) {
      authState = { ...authState, loading: false };
      notifyAuth();
      return;
    }
    if (role === 'employer') {
      const businessName = (userMeta.businessName as string) || name;
      const ep: EmployerProfile = {
        id: newId('ep'),
        userId,
        businessName,
        category: 'retail',
        address: area,
        area: area.split(',')[0].trim() || 'Ahmedabad',
        city: 'Ahmedabad',
        phone,
        description: '',
        verification: 'unverified',
        rating: 0,
        ratingCount: 0,
        jobsPosted: 0,
        establishedYear: new Date().getFullYear(),
      };
      await supabase.from('employer_profiles').insert(ep);
    } else {
      const wp: WorkerProfile = {
        id: newId('wp'),
        userId,
        fullName: name,
        phone,
        preferredArea: area || 'Ahmedabad',
        areas: area ? [area.split(',')[0].trim()] : [],
        skills: [],
        availability: [],
        experienceYears: 0,
        bio: '',
        rating: 0,
        ratingCount: 0,
        completedJobs: 0,
        profileCompletion: 30,
        workHistory: [],
      };
      await supabase.from('worker_profiles').insert({ ...wp, workHistory: JSON.stringify(wp.workHistory) });
    }
    await loadDatabase();
    authState = {
      session: { userId, role: isAdmin ? 'admin' : role },
      supabaseUser: sbUser,
      emailConfirmed: true,
      loading: false,
      needsProfile: false,
    };
    notifyAuth();
    return;
  }

  const appRole: Role = isAdmin ? 'admin' : (userRow.role as Role);
  authState = {
    session: { userId: userRow.id, role: appRole },
    supabaseUser: sbUser,
    emailConfirmed,
    loading: false,
    needsProfile: false,
  };
  notifyAuth();
  loadDatabase();
}

function redirectAfterAuth(sbUser: import('@supabase/supabase-js').User) {
  const meta = sbUser.app_metadata ?? {};
  const userMeta = sbUser.user_metadata ?? {};
  const isAdmin = meta.role === 'admin';
  const role: Role = (userMeta.role as Role) || 'worker';
  const target = isAdmin ? '/admin' : role === 'employer' ? '/employer' : '/worker';
  const current = window.location.pathname + window.location.search;
  if (current !== target) {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
export async function signUpWorker(
  email: string, password: string, name: string, phone: string, area: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: SITE_URL,
      data: { role: 'worker', name, phone, area },
    },
  });
  if (error) return { error: error.message };
  // Check if email confirmation is required
  if (data.user && !data.session) {
    return { error: null }; // pending verification
  }
  return { error: null };
}

export async function signUpEmployer(
  email: string, password: string, name: string, businessName: string, phone: string, area: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: SITE_URL,
      data: { role: 'employer', name, businessName, phone, area },
    },
  });
  if (error) return { error: error.message };
  if (data.user && !data.session) {
    return { error: null };
  }
  return { error: null };
}

export async function signIn(email: string, password: string): Promise<{ error: string | null; needsConfirmation?: boolean }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'Please confirm your email before logging in. Check your inbox for the confirmation link.', needsConfirmation: true };
    }
    return { error: error.message };
  }
  if (data.user && !data.user.email_confirmed_at) {
    return { error: 'Please confirm your email before logging in.', needsConfirmation: true };
  }
  return { error: null };
}

export async function resendConfirmation(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: SITE_URL } });
  if (error) return { error: error.message };
  return { error: null };
}

export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function getPendingEmail(): string | null {
  return authState.supabaseUser?.email ?? null;
}

// ---------- Selectors (unchanged signatures) ----------
export function getUser(db: Database, userId: string | null): User | undefined {
  if (!userId) return undefined;
  return db.users.find((u) => u.id === userId);
}

export function getWorkerProfile(db: Database, userId: string): WorkerProfile | undefined {
  return db.workerProfiles.find((w) => w.userId === userId);
}

export function getEmployerProfile(db: Database, userId: string): EmployerProfile | undefined {
  return db.employerProfiles.find((e) => e.userId === userId);
}

export function getEmployerProfileById(db: Database, profileId: string): EmployerProfile | undefined {
  return db.employerProfiles.find((e) => e.id === profileId);
}

export function getJob(db: Database, jobId: string): Job | undefined {
  return db.jobs.find((j) => j.id === jobId);
}

export function getApplicationsForJob(db: Database, jobId: string): Application[] {
  return db.applications.filter((a) => a.jobId === jobId);
}

export function getApplicationsForWorker(db: Database, workerUserId: string): Application[] {
  return db.applications
    .filter((a) => a.workerUserId === workerUserId)
    .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
}

export function getApplicationsForEmployer(db: Database, employerUserId: string): Application[] {
  return db.applications
    .filter((a) => a.employerUserId === employerUserId)
    .sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
}

export function getSavedJobsForWorker(db: Database, workerUserId: string): SavedJob[] {
  return db.savedJobs.filter((s) => s.workerUserId === workerUserId);
}

export function isJobSaved(db: Database, workerUserId: string, jobId: string): boolean {
  return db.savedJobs.some((s) => s.workerUserId === workerUserId && s.jobId === jobId);
}

export function getNotificationsForUser(db: Database, userId: string): NotificationItem[] {
  return db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getUnreadCount(db: Database, userId: string): number {
  return db.notifications.filter((n) => n.userId === userId && !n.read).length;
}

export function getReports(db: Database): Report[] {
  return db.reports.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getReviewsForTarget(
  db: Database,
  targetType: 'worker' | 'employer',
  targetId: string,
): Review[] {
  return db.reviews.filter((r) => r.targetType === targetType && r.targetId === targetId);
}

// ---------- Mutations (async, write to Supabase, refresh cache) ----------
export async function refreshDB() {
  await loadDatabase();
}

export async function createJob(
  job: Omit<Job, 'id' | 'createdAt' | 'applicantsCount' | 'verification'> & {
    verification?: Job['verification'];
  },
): Promise<string> {
  const id = newId('job');
  const { employerId } = job;
  // Look up employer verification from cache
  const employer = dbCache.employerProfiles.find((e) => e.id === employerId);
  const row: Record<string, unknown> = {
    ...job,
    id,
    createdAt: new Date().toISOString(),
    applicantsCount: 0,
    verification: job.verification ?? employer?.verification ?? 'unverified',
  };
  const { error } = await supabase.from('jobs').insert(row);
  if (error) throw error;
  await loadDatabase();
  return id;
}

export async function updateJob(jobId: string, patch: Partial<Job>): Promise<void> {
  const { error } = await supabase.from('jobs').update(patch).eq('id', jobId);
  if (error) throw error;
  await loadDatabase();
}

export async function setJobStatus(jobId: string, status: JobStatus): Promise<void> {
  const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
  if (error) throw error;
  // Notify accepted workers
  if (status === 'completed' || status === 'paused') {
    const job = dbCache.jobs.find((j) => j.id === jobId);
    const accepted = dbCache.applications.filter((a) => a.jobId === jobId && a.status === 'accepted');
    for (const a of accepted) {
      await supabase.from('notifications').insert({
        id: newId('n'),
        userId: a.workerUserId,
        type: 'job_status_changed',
        title: status === 'completed' ? 'Job marked completed' : 'Job paused',
        body: `The job "${job?.title ?? 'a job'}" was marked ${status} by the employer.`,
        link: '/worker/applications',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }
  await loadDatabase();
}

export async function deleteJob(jobId: string): Promise<void> {
  await supabase.from('saved_jobs').delete().eq('jobId', jobId);
  await supabase.from('applications').delete().eq('jobId', jobId);
  const { error } = await supabase.from('jobs').delete().eq('id', jobId);
  if (error) throw error;
  await loadDatabase();
}

export async function applyToJob(
  jobId: string,
  workerUserId: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  // Pre-check: already applied?
  const existing = dbCache.applications.find((a) => a.jobId === jobId && a.workerUserId === workerUserId);
  if (existing) return { ok: false, error: 'You have already applied to this job.' };
  const job = dbCache.jobs.find((j) => j.id === jobId);
  if (!job) return { ok: false, error: 'Job not found.' };
  if (job.status !== 'published') return { ok: false, error: 'This job is not open for applications.' };

  const id = newId('app');
  const ts = new Date().toISOString();
  const { error } = await supabase.from('applications').insert({
    id,
    jobId,
    workerUserId,
    employerUserId: job.employerUserId,
    status: 'applied',
    message,
    appliedAt: ts,
    updatedAt: ts,
  });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'You have already applied to this job.' };
    return { ok: false, error: error.message };
  }
  // Notify employer
  await supabase.from('notifications').insert({
    id: newId('n'),
    userId: job.employerUserId,
    type: 'application_received',
    title: 'New application received',
    body: `A worker applied to "${job.title}".`,
    link: '/employer/applicants',
    read: false,
    createdAt: ts,
  });
  await loadDatabase();
  return { ok: true };
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  const app = dbCache.applications.find((a) => a.id === applicationId);
  if (!app) return;
  const ts = new Date().toISOString();
  const { error } = await supabase.from('applications').update({ status: 'withdrawn', updatedAt: ts }).eq('id', applicationId);
  if (error) throw error;
  const job = dbCache.jobs.find((j) => j.id === app.jobId);
  await supabase.from('notifications').insert({
    id: newId('n'),
    userId: app.employerUserId,
    type: 'application_status',
    title: 'Application withdrawn',
    body: `A worker withdrew their application from "${job?.title ?? 'a job'}".`,
    link: '/employer/applicants',
    read: false,
    createdAt: ts,
  });
  await loadDatabase();
}

export async function setApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<void> {
  const app = dbCache.applications.find((a) => a.id === applicationId);
  if (!app) return;
  const ts = new Date().toISOString();
  const { error } = await supabase.from('applications').update({ status, updatedAt: ts }).eq('id', applicationId);
  if (error) throw error;
  const job = dbCache.jobs.find((j) => j.id === app.jobId);
  const labels: Record<ApplicationStatus, string> = {
    applied: 'received', reviewed: 'reviewed', shortlisted: 'shortlisted',
    accepted: 'accepted', rejected: 'rejected', withdrawn: 'withdrawn',
  };
  if (status !== 'reviewed') {
    await supabase.from('notifications').insert({
      id: newId('n'),
      userId: app.workerUserId,
      type: 'application_status',
      title: `Application ${labels[status]}`,
      body: `Your application for "${job?.title ?? 'your job application'}" was marked ${labels[status]} by the employer.`,
      link: '/worker/applications',
      read: false,
      createdAt: ts,
    });
  }
  await loadDatabase();
}

export async function toggleSaveJob(workerUserId: string, jobId: string): Promise<void> {
  const existing = dbCache.savedJobs.find((s) => s.workerUserId === workerUserId && s.jobId === jobId);
  if (existing) {
    await supabase.from('saved_jobs').delete().eq('id', existing.id);
  } else {
    await supabase.from('saved_jobs').insert({
      id: newId('sav'),
      workerUserId,
      jobId,
      savedAt: new Date().toISOString(),
    });
  }
  await loadDatabase();
}

export async function removeSavedJob(savedId: string): Promise<void> {
  await supabase.from('saved_jobs').delete().eq('id', savedId);
  await loadDatabase();
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  await loadDatabase();
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('userId', userId).eq('read', false);
  await loadDatabase();
}

export async function createReport(
  reporterUserId: string,
  targetType: 'job' | 'user',
  targetId: string,
  reason: string,
  details: string,
): Promise<void> {
  const ts = new Date().toISOString();
  await supabase.from('reports').insert({
    id: newId('rep'),
    reporterUserId,
    targetType,
    targetId,
    reason,
    details,
    status: 'open',
    createdAt: ts,
  });
  await supabase.from('notifications').insert({
    id: newId('n'),
    userId: reporterUserId,
    type: 'report_update',
    title: 'Report submitted',
    body: 'Your report has been received and will be reviewed by the moderation team.',
    read: false,
    createdAt: ts,
  });
  await loadDatabase();
}

export async function setReportStatus(reportId: string, status: Report['status']): Promise<void> {
  const r = dbCache.reports.find((x) => x.id === reportId);
  if (!r) return;
  const ts = new Date().toISOString();
  await supabase.from('reports').update({ status }).eq('id', reportId);
  await supabase.from('notifications').insert({
    id: newId('n'),
    userId: r.reporterUserId,
    type: 'report_update',
    title: status === 'dismissed' ? 'Report dismissed' : status === 'suspended' ? 'Record suspended' : 'Report reviewed',
    body: `Your report was reviewed by the moderation team and marked ${status}.`,
    read: false,
    createdAt: ts,
  });
  await loadDatabase();
}

export async function updateWorkerProfile(userId: string, patch: Partial<WorkerProfile>): Promise<void> {
  const wp = dbCache.workerProfiles.find((w) => w.userId === userId);
  if (!wp) return;
  const updateData: Record<string, unknown> = { ...patch };
  if (patch.workHistory) updateData.workHistory = JSON.stringify(patch.workHistory);
  await supabase.from('worker_profiles').update(updateData).eq('id', wp.id);
  await loadDatabase();
}

export async function updateEmployerProfile(userId: string, patch: Partial<EmployerProfile>): Promise<void> {
  const ep = dbCache.employerProfiles.find((e) => e.userId === userId);
  if (!ep) return;
  await supabase.from('employer_profiles').update(patch).eq('id', ep.id);
  await loadDatabase();
}

// ---------- Backward-compat stubs (no longer used) ----------
export function resetDemoData() { loadDatabase(); }
export function createDemoWorker(): User { return emptyUser(); }
export function createDemoEmployer(): User { return emptyUser(); }
function emptyUser(): User {
  return { id: '', role: 'worker', name: '', email: '', phone: '', verification: 'unverified', createdAt: '', avatarColor: '#10b981' };
}
