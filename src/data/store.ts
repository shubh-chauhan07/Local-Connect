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
  error: string | null;
}

let authState: AuthState = {
  session: { userId: null, role: 'worker' },
  supabaseUser: null,
  emailConfirmed: false,
  loading: true,
  needsProfile: false,
  error: null,
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
  return {
    session: { userId: null, role: 'worker' },
    supabaseUser: null,
    emailConfirmed: false,
    loading: true,
    needsProfile: false,
    error: null,
  };
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
      supabase.from('users').select('id,role,name,verification,createdAt,avatarColor'),
      supabase.from('employer_profiles').select('id,userId,businessName,category,address,area,city,description,verification,rating,ratingCount,jobsPosted,establishedYear'),
      supabase.from('worker_profiles').select('id,userId,fullName,preferredArea,areas,skills,availability,experienceYears,bio,rating,ratingCount,completedJobs,profileCompletion,workHistory'),
      supabase.from('jobs').select('*'),
      supabase.from('applications').select('*'),
      supabase.from('saved_jobs').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('reviews').select('*'),
      supabase.from('reports').select('*'),
    ]);

    const failedQuery = [
      { table: 'users', error: usersR.error },
      { table: 'employer profiles', error: empR.error },
      { table: 'worker profiles', error: wpR.error },
      { table: 'jobs', error: jobsR.error },
      { table: 'applications', error: appsR.error },
      { table: 'saved jobs', error: savedR.error },
      { table: 'notifications', error: notifR.error },
      { table: 'reviews', error: reviewsR.error },
      { table: 'reports', error: reportsR.error },
    ].find((result) => result.error);
    if (failedQuery) {
      throw new Error(`Could not load ${failedQuery.table}: ${failedQuery.error?.message ?? 'Unknown database error'}`);
    }

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

    let ownAccount: Record<string, unknown> | undefined;
    if (authState.session.userId) {
      const { data, error } = await supabase.rpc('get_my_account');
      if (!error && data && data.length > 0) {
        ownAccount = (data[0] ?? undefined) as Record<string, unknown> | undefined;
      } else {
        // Fallback if get_my_account RPC migration has not been applied yet
        const { data: userRow } = await supabase.from('users').select('*').eq('id', authState.session.userId).maybeSingle();
        const { data: wpRow } = await supabase.from('worker_profiles').select('*').eq('userId', authState.session.userId).maybeSingle();
        const { data: epRow } = await supabase.from('employer_profiles').select('*').eq('userId', authState.session.userId).maybeSingle();
        if (userRow) {
          ownAccount = {
            user_id: userRow.id,
            account_role: userRow.role,
            name: userRow.name,
            email: userRow.email,
            user_phone: userRow.phone,
            verification: userRow.verification,
            created_at: userRow.createdAt,
            avatar_color: userRow.avatarColor,
            worker_profile_id: wpRow?.id,
            worker_phone: wpRow?.phone,
            employer_profile_id: epRow?.id,
            employer_phone: epRow?.phone,
          };
        }
      }
    }

    const ownUserId = ownAccount?.user_id;
    const ownWorkerProfileId = ownAccount?.worker_profile_id;
    const ownEmployerProfileId = ownAccount?.employer_profile_id;
    const db: Database = {
      users: norm(users as unknown as Record<string, unknown>[]).map((row) => ({
        ...row,
        email: row.id === ownUserId ? String(ownAccount?.email ?? '') : '',
        phone: row.id === ownUserId ? String(ownAccount?.user_phone ?? '') : '',
      })) as unknown as User[],
      workerProfiles: norm(workerProfiles as unknown as Record<string, unknown>[]).map((row) => ({
        ...row,
        phone: row.id === ownWorkerProfileId ? String(ownAccount?.worker_phone ?? '') : '',
      })) as unknown as WorkerProfile[],
      employerProfiles: norm(employerProfiles as unknown as Record<string, unknown>[]).map((row) => ({
        ...row,
        phone: row.id === ownEmployerProfileId ? String(ownAccount?.employer_phone ?? '') : '',
      })) as unknown as EmployerProfile[],
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
    throw new Error(dbError);
  } finally {
    dbLoading = false;
    notifyDB();
  }
}

function subscribeDB(l: () => void) {
  dbListeners.add(l);
  if (!dbLoaded && !dbLoading) void loadDatabase().catch(() => undefined);
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
  supabase.auth.onAuthStateChange((event, sbSession) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (sbSession?.user) {
        void Promise.resolve()
          .then(() => handleAuthSession(sbSession.user))
          .then(() => {
            if (event === 'SIGNED_IN' && sbSession.user.email_confirmed_at) {
              redirectAfterAuth(sbSession.user);
            }
          })
          .catch((error: unknown) => {
            authState = {
              ...authState,
              supabaseUser: sbSession.user,
              loading: false,
              error: error instanceof Error ? error.message : 'Could not load your account.',
            };
            notifyAuth();
          });
      }
    } else if (event === 'SIGNED_OUT') {
      authState = {
        session: { userId: null, role: 'worker' },
        supabaseUser: null,
        emailConfirmed: false,
        loading: false,
        needsProfile: false,
        error: null,
      };
      notifyAuth();
      void loadDatabase().catch(() => undefined);
    } else if (event === 'PASSWORD_RECOVERY') {
      // Handled by the reset page via useAuth
      if (sbSession?.user) {
        authState = {
          ...authState,
          supabaseUser: sbSession.user,
          loading: false,
          error: null,
        };
        notifyAuth();
      }
    }
  });

  // Restore session on load
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) {
      await handleAuthSession(data.session.user);
    } else {
      authState = { ...authState, loading: false, error: null };
      notifyAuth();
    }
  } catch (error) {
    authState = { ...authState, loading: false };
    authState.error = error instanceof Error ? error.message : 'Could not restore your session.';
    notifyAuth();
  }
}

async function handleAuthSession(sbUser: import('@supabase/supabase-js').User) {
  const emailConfirmed = !!sbUser.email_confirmed_at;
  const appMeta = sbUser.app_metadata ?? {};
  const userMeta = sbUser.user_metadata ?? {};
  const isAdmin = appMeta.role === 'admin';

  let userRow: Record<string, unknown> | null = null;
  const { data: accountRows, error: accountError } = await supabase.rpc('get_my_account');
  if (!accountError && accountRows && accountRows.length > 0) {
    userRow = (accountRows[0] ?? null) as Record<string, unknown> | null;
  } else {
    // Fallback if get_my_account RPC migration has not been applied to the live database yet
    const { data: directUser } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', sbUser.id)
      .maybeSingle();

    if (directUser) {
      const { data: wpRow } = await supabase.from('worker_profiles').select('id').eq('userId', directUser.id).maybeSingle();
      const { data: epRow } = await supabase.from('employer_profiles').select('id').eq('userId', directUser.id).maybeSingle();
      userRow = {
        user_id: directUser.id,
        account_role: directUser.role,
        name: directUser.name,
        email: directUser.email,
        user_phone: directUser.phone,
        verification: directUser.verification,
        worker_profile_id: wpRow?.id ?? null,
        employer_profile_id: epRow?.id ?? null,
      };
    }
  }

  if (!userRow) {
    // Need to create the users + profile rows (after email confirmation)
    if (!emailConfirmed) {
      authState = {
        session: { userId: null, role: 'worker' },
        supabaseUser: sbUser,
        emailConfirmed: false,
        loading: false,
        needsProfile: false,
        error: null,
      };
      notifyAuth();
      return;
    }
    const role: Role = userMeta.role === 'employer' ? 'employer' : 'worker';
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
    if (userErr) throw new Error(`Could not create your LocalConnect account: ${userErr.message}`);
    await createAccountProfile(userId, role, name, phone, area, (userMeta.businessName as string) || name);
    authState = {
      session: { userId, role: isAdmin ? 'admin' : role },
      supabaseUser: sbUser,
      emailConfirmed: true,
      loading: false,
      needsProfile: false,
      error: null,
    };
    notifyAuth();
    await loadDatabase();
    return;
  }

  const appUserId = String(userRow.user_id);
  const storedRole: Role = userRow.account_role === 'employer' ? 'employer' : 'worker';
  const appRole: Role = isAdmin ? 'admin' : storedRole;
  const name = String(userRow.name ?? sbUser.email?.split('@')[0] ?? 'User');
  const phone = String(userRow.user_phone ?? '');
  const area = String(userMeta.area ?? '');
  if (storedRole === 'employer' && !userRow.employer_profile_id) {
    await createAccountProfile(appUserId, storedRole, name, phone, area, (userMeta.businessName as string) || name);
  } else if (storedRole === 'worker' && !userRow.worker_profile_id) {
    await createAccountProfile(appUserId, storedRole, name, phone, area, name);
  }
  authState = {
    session: { userId: appUserId, role: appRole },
    supabaseUser: sbUser,
    emailConfirmed,
    loading: false,
    needsProfile: false,
    error: null,
  };
  notifyAuth();
  await loadDatabase();
}

async function createAccountProfile(
  userId: string,
  role: Exclude<Role, 'admin'>,
  name: string,
  phone: string,
  area: string,
  businessName: string,
) {
  if (role === 'employer') {
    const profile: EmployerProfile = {
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
    const { error } = await supabase.from('employer_profiles').insert(profile);
    if (error) throw new Error(`Could not create your employer profile: ${error.message}`);
    return;
  }

  const profile: WorkerProfile = {
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
  const { error } = await supabase.from('worker_profiles').insert({
    ...profile,
    workHistory: JSON.stringify(profile.workHistory),
  });
  if (error) throw new Error(`Could not create your worker profile: ${error.message}`);
}

function redirectAfterAuth(sbUser: import('@supabase/supabase-js').User) {
  if (!['/', '/login', '/signup'].includes(window.location.pathname)) return;
  const meta = sbUser.app_metadata ?? {};
  const userMeta = sbUser.user_metadata ?? {};
  const isAdmin = meta.role === 'admin';
  const role = userMeta.role === 'employer' ? 'employer' : 'worker';
  const next = new URLSearchParams(window.location.search).get('next');
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : null;
  const target = safeNext ?? (isAdmin ? '/admin' : role === 'employer' ? '/employer' : '/worker');
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
    if (error.message.includes('Database error querying schema') || error.status === 500) {
      return {
        error: 'Supabase Auth database scan error: this account in auth.users has NULL confirmation_token values. Run the migration SQL in Supabase SQL Editor to repair the tokens.',
      };
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
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/reset-password` });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Could not log out: ${error.message}`);
}

export function getPendingEmail(): string | null {
  return authState.supabaseUser?.email ?? null;
}

export async function getAuthorizedProfilePhone(userId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_authorized_profile_phone', { target_user_id: userId });
  if (error) {
    // Fallback if RPC has not been created on the live backend yet
    const { data: ep } = await supabase.from('employer_profiles').select('phone').eq('userId', userId).maybeSingle();
    if (ep?.phone) return ep.phone;
    const { data: wp } = await supabase.from('worker_profiles').select('phone').eq('userId', userId).maybeSingle();
    if (wp?.phone) return wp.phone;
    const { data: u } = await supabase.from('users').select('phone').eq('id', userId).maybeSingle();
    if (u?.phone) return u.phone;
    return null;
  }
  return typeof data === 'string' ? data : null;
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
function throwOnSupabaseError(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`);
}

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
  throwOnSupabaseError(error, 'Could not create job');
  await loadDatabase();
  return id;
}

export async function updateJob(jobId: string, patch: Partial<Job>): Promise<void> {
  const editableFields = [
    'title', 'category', 'description', 'responsibilities', 'requiredSkills',
    'workersNeeded', 'location', 'area', 'city', 'date', 'startTime', 'endTime',
    'employmentType', 'payAmount', 'payBasis', 'paymentTiming', 'paymentMethod',
    'requirements', 'contactPreference', 'benefits', 'status',
  ] as const satisfies readonly (keyof Job)[];
  const update: Partial<Job> = {};
  for (const key of editableFields) {
    if (patch[key] !== undefined) Object.assign(update, { [key]: patch[key] });
  }
  const { error } = await supabase.from('jobs').update(update).eq('id', jobId);
  throwOnSupabaseError(error, 'Could not update job');
  await loadDatabase();
}

export async function setJobStatus(jobId: string, status: JobStatus): Promise<void> {
  const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
  throwOnSupabaseError(error, 'Could not update job status');
  await loadDatabase();
}

export async function deleteJob(jobId: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('id', jobId);
  throwOnSupabaseError(error, 'Could not delete job');
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
  await loadDatabase();
  return { ok: true };
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  const app = dbCache.applications.find((a) => a.id === applicationId);
  if (!app) throw new Error('Application not found.');
  const ts = new Date().toISOString();
  const { error } = await supabase.from('applications').update({ status: 'withdrawn', updatedAt: ts }).eq('id', applicationId);
  throwOnSupabaseError(error, 'Could not withdraw application');
  await loadDatabase();
}

export async function setApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<void> {
  const app = dbCache.applications.find((a) => a.id === applicationId);
  if (!app) throw new Error('Application not found.');
  const ts = new Date().toISOString();
  const { error } = await supabase.from('applications').update({ status, updatedAt: ts }).eq('id', applicationId);
  throwOnSupabaseError(error, 'Could not update application status');
  await loadDatabase();
}

export async function toggleSaveJob(workerUserId: string, jobId: string): Promise<void> {
  const existing = dbCache.savedJobs.find((s) => s.workerUserId === workerUserId && s.jobId === jobId);
  if (existing) {
    const { error } = await supabase.from('saved_jobs').delete().eq('id', existing.id);
    throwOnSupabaseError(error, 'Could not remove saved job');
  } else {
    const { error } = await supabase.from('saved_jobs').insert({
      id: newId('sav'),
      workerUserId,
      jobId,
      savedAt: new Date().toISOString(),
    });
    throwOnSupabaseError(error, 'Could not save job');
  }
  await loadDatabase();
}

export async function removeSavedJob(savedId: string): Promise<void> {
  const { error } = await supabase.from('saved_jobs').delete().eq('id', savedId);
  throwOnSupabaseError(error, 'Could not remove saved job');
  await loadDatabase();
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  throwOnSupabaseError(error, 'Could not mark notification as read');
  await loadDatabase();
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('userId', userId).eq('read', false);
  throwOnSupabaseError(error, 'Could not mark notifications as read');
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
  const { error } = await supabase.from('reports').insert({
    id: newId('rep'),
    reporterUserId,
    targetType,
    targetId,
    reason,
    details,
    status: 'open',
    createdAt: ts,
  });
  throwOnSupabaseError(error, 'Could not submit report');
  await loadDatabase();
}

export async function setReportStatus(reportId: string, status: Report['status']): Promise<void> {
  if (!dbCache.reports.some((report) => report.id === reportId)) throw new Error('Report not found.');
  const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
  throwOnSupabaseError(error, 'Could not update report status');
  await loadDatabase();
}

export async function updateWorkerProfile(userId: string, patch: Partial<WorkerProfile>): Promise<void> {
  const wp = dbCache.workerProfiles.find((w) => w.userId === userId);
  const updateData: Record<string, unknown> = { ...patch };
  if (patch.workHistory) updateData.workHistory = JSON.stringify(patch.workHistory);

  if (!wp) {
    const { data: existingWp } = await supabase.from('worker_profiles').select('id').eq('userId', userId).maybeSingle();
    if (existingWp?.id) {
      const { error } = await supabase.from('worker_profiles').update(updateData).eq('id', existingWp.id);
      throwOnSupabaseError(error, 'Could not update worker profile');
    } else {
      const { error } = await supabase.from('worker_profiles').insert({
        id: newId('wp'),
        userId,
        fullName: patch.fullName ?? 'Worker',
        phone: patch.phone ?? '',
        preferredArea: patch.preferredArea ?? 'Satellite',
        areas: patch.areas ?? ['Satellite'],
        skills: patch.skills ?? [],
        availability: patch.availability ?? [],
        experienceYears: patch.experienceYears ?? 0,
        bio: patch.bio ?? '',
        rating: 0,
        ratingCount: 0,
        completedJobs: 0,
        profileCompletion: patch.profileCompletion ?? 50,
        workHistory: JSON.stringify(patch.workHistory ?? []),
      });
      throwOnSupabaseError(error, 'Could not create worker profile');
    }
  } else {
    const { error } = await supabase.from('worker_profiles').update(updateData).eq('id', wp.id);
    throwOnSupabaseError(error, 'Could not update worker profile');
  }
  await loadDatabase();
}

export async function updateEmployerProfile(userId: string, patch: Partial<EmployerProfile>): Promise<void> {
  const ep = dbCache.employerProfiles.find((e) => e.userId === userId);
  if (!ep) {
    const { data: existingEp } = await supabase.from('employer_profiles').select('id').eq('userId', userId).maybeSingle();
    if (existingEp?.id) {
      const { error } = await supabase.from('employer_profiles').update(patch).eq('id', existingEp.id);
      throwOnSupabaseError(error, 'Could not update employer profile');
    } else {
      const { error } = await supabase.from('employer_profiles').insert({
        id: newId('ep'),
        userId,
        businessName: patch.businessName ?? 'Business',
        category: patch.category ?? 'retail',
        address: patch.address ?? '',
        area: patch.area ?? 'Satellite',
        city: 'Ahmedabad',
        phone: patch.phone ?? '',
        description: patch.description ?? '',
        verification: 'unverified',
        rating: 0,
        ratingCount: 0,
        jobsPosted: 0,
        establishedYear: patch.establishedYear ?? new Date().getFullYear(),
      });
      throwOnSupabaseError(error, 'Could not create employer profile');
    }
  } else {
    const { error } = await supabase.from('employer_profiles').update(patch).eq('id', ep.id);
    throwOnSupabaseError(error, 'Could not update employer profile');
  }
  await loadDatabase();
}

// ---------- Backward-compat stubs (no longer used) ----------
export function resetDemoData() { loadDatabase(); }
export function createDemoWorker(): User { return emptyUser(); }
export function createDemoEmployer(): User { return emptyUser(); }
function emptyUser(): User {
  return { id: '', role: 'worker', name: '', email: '', phone: '', verification: 'unverified', createdAt: '', avatarColor: '#10b981' };
}
