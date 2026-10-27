-- ========================================================
-- LOCALCONNECT: COMPLETE DATABASE SETUP FOR NEW SUPABASE PROJECT
-- Run this single script in Supabase SQL Editor to set up
-- all tables, security policies, RPC functions, and demo data.
-- ========================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261025180056_create_localconnect_schema.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Create LocalConnect database schema

Creates the full data model for the LocalConnect job-listing prototype:
users, worker profiles, employer profiles, jobs, applications, saved jobs,
notifications, reports, and reviews.

1. New Tables
- `users` — base accounts (worker / employer / admin), with name, email, phone,
  verification state, avatar color. (A minimal `users` table already exists
  from a prior syntax test; this migration adds the remaining columns to it.)
- `employer_profiles` — extended employer info: business name, category,
  address, area, city, phone, description, verification, rating, jobs posted,
  established year.
- `worker_profiles` — extended worker info: preferred area, willing areas,
  skills, availability, experience, rating, completed jobs, profile completion,
  work history (JSONB array).
- `jobs` — job postings tied to an employer profile + user: title, category,
  description, responsibilities, required skills, workers needed, location,
  area, city, date, start/end time, employment type, pay details, requirements,
  contact preference, benefits, status, verification, applicant count.
- `applications` — a worker applying to a job: status, message, timestamps.
- `saved_jobs` — a worker bookmarking a job.
- `notifications` — per-user in-app notifications: type, title, body, link, read.
- `reports` — moderation reports against a job or user: reason, details, status.
- `reviews` — ratings/comments left for a worker or employer, optionally tied
  to a job.
- `app_meta` — singleton row holding the demo "seeded at" timestamp.

2. Design notes
- Primary keys are `text` (not uuid) so the frontend's existing ID generator
  (e.g. `job_...`, `app_...`) can insert rows without changing its ID format.
- String-array fields use `text[]`; the nested `workHistory` object array uses
  `jsonb`.
- Foreign keys keep referential integrity; ON DELETE CASCADE removes dependent
  rows when a parent user/profile/job is removed.

3. Security
- This is a single-tenant demo app with no real sign-in; all data is
  intentionally shared/public. Row Level Security is enabled on every table.
- CRUD policies are scoped `TO anon, authenticated` with `USING (true)` /
  `WITH CHECK (true)` because the anon-key frontend must read and write its own
  shared demo data.
- Grants are limited to the verbs each table uses and the roles its policies
  target.
*/

-- ---------- users (augment existing minimal table) ----------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification text NOT NULL DEFAULT 'unverified'
    CHECK (verification IN ('verified','demo_verified','unverified')),
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "avatarColor" text NOT NULL DEFAULT '#0d9488';

-- Add the role CHECK if missing (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('worker','employer','admin'));
  END IF;
END $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- employer_profiles ----------
CREATE TABLE IF NOT EXISTS employer_profiles (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "businessName" text NOT NULL,
  category text NOT NULL,
  address text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'Ahmedabad',
  phone text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  verification text NOT NULL DEFAULT 'unverified'
    CHECK (verification IN ('verified','demo_verified','unverified')),
  rating numeric NOT NULL DEFAULT 0,
  "ratingCount" integer NOT NULL DEFAULT 0,
  "jobsPosted" integer NOT NULL DEFAULT 0,
  "establishedYear" integer NOT NULL DEFAULT EXTRACT(year FROM now())::int
);

ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON employer_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_employer_profiles" ON employer_profiles;
CREATE POLICY "anon_select_employer_profiles" ON employer_profiles FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_employer_profiles" ON employer_profiles;
CREATE POLICY "anon_insert_employer_profiles" ON employer_profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_employer_profiles" ON employer_profiles;
CREATE POLICY "anon_update_employer_profiles" ON employer_profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_employer_profiles" ON employer_profiles;
CREATE POLICY "anon_delete_employer_profiles" ON employer_profiles FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- worker_profiles ----------
CREATE TABLE IF NOT EXISTS worker_profiles (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "fullName" text NOT NULL,
  phone text NOT NULL DEFAULT '',
  "preferredArea" text NOT NULL DEFAULT '',
  areas text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  availability text[] NOT NULL DEFAULT '{}',
  "experienceYears" integer NOT NULL DEFAULT 0,
  bio text NOT NULL DEFAULT '',
  rating numeric NOT NULL DEFAULT 0,
  "ratingCount" integer NOT NULL DEFAULT 0,
  "completedJobs" integer NOT NULL DEFAULT 0,
  "profileCompletion" integer NOT NULL DEFAULT 0,
  "workHistory" jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON worker_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_worker_profiles" ON worker_profiles;
CREATE POLICY "anon_select_worker_profiles" ON worker_profiles FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_worker_profiles" ON worker_profiles;
CREATE POLICY "anon_insert_worker_profiles" ON worker_profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_worker_profiles" ON worker_profiles;
CREATE POLICY "anon_update_worker_profiles" ON worker_profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_worker_profiles" ON worker_profiles;
CREATE POLICY "anon_delete_worker_profiles" ON worker_profiles FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- jobs ----------
CREATE TABLE IF NOT EXISTS jobs (
  id text PRIMARY KEY,
  "employerId" text NOT NULL REFERENCES employer_profiles(id) ON DELETE CASCADE,
  "employerUserId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  responsibilities text[] NOT NULL DEFAULT '{}',
  "requiredSkills" text[] NOT NULL DEFAULT '{}',
  "workersNeeded" integer NOT NULL DEFAULT 1,
  location text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'Ahmedabad',
  date text NOT NULL,
  "startTime" text NOT NULL DEFAULT '',
  "endTime" text NOT NULL DEFAULT '',
  "employmentType" text NOT NULL,
  "payAmount" numeric NOT NULL DEFAULT 0,
  "payBasis" text NOT NULL,
  "paymentTiming" text NOT NULL,
  "paymentMethod" text NOT NULL,
  requirements text[] NOT NULL DEFAULT '{}',
  "contactPreference" text NOT NULL DEFAULT 'call',
  benefits text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','paused','completed')),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  verification text NOT NULL DEFAULT 'unverified'
    CHECK (verification IN ('verified','demo_verified','unverified')),
  "applicantsCount" integer NOT NULL DEFAULT 0
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON jobs TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_jobs" ON jobs;
CREATE POLICY "anon_select_jobs" ON jobs FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_jobs" ON jobs;
CREATE POLICY "anon_insert_jobs" ON jobs FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_jobs" ON jobs;
CREATE POLICY "anon_update_jobs" ON jobs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_jobs" ON jobs;
CREATE POLICY "anon_delete_jobs" ON jobs FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- applications ----------
CREATE TABLE IF NOT EXISTS applications (
  id text PRIMARY KEY,
  "jobId" text NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  "workerUserId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "employerUserId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied','reviewed','shortlisted','accepted','rejected','withdrawn')),
  message text NOT NULL DEFAULT '',
  "appliedAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON applications TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_applications" ON applications;
CREATE POLICY "anon_select_applications" ON applications FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_applications" ON applications;
CREATE POLICY "anon_insert_applications" ON applications FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_applications" ON applications;
CREATE POLICY "anon_update_applications" ON applications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_applications" ON applications;
CREATE POLICY "anon_delete_applications" ON applications FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- saved_jobs ----------
CREATE TABLE IF NOT EXISTS saved_jobs (
  id text PRIMARY KEY,
  "jobId" text NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  "workerUserId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "savedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_jobs TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_saved_jobs" ON saved_jobs;
CREATE POLICY "anon_select_saved_jobs" ON saved_jobs FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_saved_jobs" ON saved_jobs;
CREATE POLICY "anon_insert_saved_jobs" ON saved_jobs FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_saved_jobs" ON saved_jobs;
CREATE POLICY "anon_update_saved_jobs" ON saved_jobs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_saved_jobs" ON saved_jobs;
CREATE POLICY "anon_delete_saved_jobs" ON saved_jobs FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  link text,
  read boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- reports ----------
CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  "reporterUserId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "targetType" text NOT NULL CHECK ("targetType" IN ('job','user')),
  "targetId" text NOT NULL,
  reason text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','dismissed','suspended')),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_reports" ON reports;
CREATE POLICY "anon_select_reports" ON reports FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reports" ON reports;
CREATE POLICY "anon_insert_reports" ON reports FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reports" ON reports;
CREATE POLICY "anon_update_reports" ON reports FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reports" ON reports;
CREATE POLICY "anon_delete_reports" ON reports FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- reviews ----------
CREATE TABLE IF NOT EXISTS reviews (
  id text PRIMARY KEY,
  "reviewerUserId" text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "targetType" text NOT NULL CHECK ("targetType" IN ('worker','employer')),
  "targetId" text NOT NULL,
  "jobId" text REFERENCES jobs(id) ON DELETE SET NULL,
  rating numeric NOT NULL DEFAULT 0,
  comment text NOT NULL DEFAULT '',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON reviews TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_reviews" ON reviews;
CREATE POLICY "anon_select_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;
CREATE POLICY "anon_insert_reviews" ON reviews FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reviews" ON reviews;
CREATE POLICY "anon_update_reviews" ON reviews FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reviews" ON reviews;
CREATE POLICY "anon_delete_reviews" ON reviews FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- app_meta (seeded-at timestamp) ----------
CREATE TABLE IF NOT EXISTS app_meta (
  id text PRIMARY KEY DEFAULT 'singleton',
  "seededAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_meta ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_meta TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_app_meta" ON app_meta;
CREATE POLICY "anon_select_app_meta" ON app_meta FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_app_meta" ON app_meta;
CREATE POLICY "anon_insert_app_meta" ON app_meta FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_app_meta" ON app_meta;
CREATE POLICY "anon_update_app_meta" ON app_meta FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_app_meta" ON app_meta;
CREATE POLICY "anon_delete_app_meta" ON app_meta FOR DELETE
  TO anon, authenticated USING (true);

-- ---------- indexes for common lookups ----------
CREATE INDEX IF NOT EXISTS idx_jobs_employer_user ON jobs ("employerUserId");
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_area ON jobs (area);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications ("jobId");
CREATE INDEX IF NOT EXISTS idx_applications_worker ON applications ("workerUserId");
CREATE INDEX IF NOT EXISTS idx_applications_employer ON applications ("employerUserId");
CREATE INDEX IF NOT EXISTS idx_saved_jobs_worker ON saved_jobs ("workerUserId");
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications ("userId");
CREATE INDEX IF NOT EXISTS idx_worker_profiles_user ON worker_profiles ("userId");
CREATE INDEX IF NOT EXISTS idx_employer_profiles_user ON employer_profiles ("userId");


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261026112926_secure_rls_and_auth_linkage.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Secure RLS and auth linkage for LocalConnect

Replaces the broad anon/authenticated USING(true) policies with
ownership-scoped Row Level Security, and links application users to
real Supabase Auth identities.

1. Schema changes
- `users.auth_id` (uuid, nullable, unique) — references auth.users(id)
  ON DELETE CASCADE. Seed/display rows keep auth_id NULL; real signed-up
  users have auth_id set to their Supabase Auth user id.
- Unique constraint on `applications("jobId","workerUserId")` to prevent
  duplicate applications at the database level.
- `is_admin()` SQL function — returns true when the current JWT's
  raw_app_meta_data.role = 'admin'. Used by admin-scoped policies.

2. Security
- Drops every prior "anon_*" broad policy.
- anon can SELECT only published jobs and the public user/profile columns
  needed to display them; anon cannot INSERT/UPDATE/DELETE anything.
- authenticated users are scoped to their own rows via auth_id resolution:
  - Employers manage only jobs/applications they own.
  - Workers manage only their own applications (and may only set status to
    'withdrawn' — they cannot accept/reject themselves), saved jobs,
    notifications, and their own profile.
  - Reports visible to the reporter and to admins; status updates admin-only.
  - Reviews public-read; insert/update/delete own.
- Grants tightened to the minimum verbs per role.

3. Notes
- No data is destroyed. Existing seed rows remain and stay publicly readable
  for browse-only views.
- Admin role is provisioned only via the Supabase dashboard (Auth → user →
  app metadata → role: "admin"); it cannot be set at signup or from the
  client.
*/

-- ---------- auth_id on users ----------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_id_unique
  ON users (auth_id) WHERE auth_id IS NOT NULL;

-- ---------- helper: is_admin ----------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------- unique application constraint ----------
CREATE UNIQUE INDEX IF NOT EXISTS applications_job_worker_unique
  ON applications ("jobId", "workerUserId");

-- ============================================================
-- USERS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Revoke broad grants, then grant minimum
REVOKE INSERT, UPDATE, DELETE ON users FROM anon;
GRANT SELECT ON users TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON users TO authenticated;

DROP POLICY IF EXISTS "anon_select_users" ON users;
DROP POLICY IF EXISTS "anon_insert_users" ON users;
DROP POLICY IF EXISTS "anon_update_users" ON users;
DROP POLICY IF EXISTS "anon_delete_users" ON users;

CREATE POLICY "users_select_public" ON users FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "users_insert_own" ON users FOR INSERT
  TO authenticated WITH CHECK (auth_id = auth.uid());

CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

CREATE POLICY "users_delete_own" ON users FOR DELETE
  TO authenticated USING (auth_id = auth.uid());

-- ============================================================
-- EMPLOYER_PROFILES
-- ============================================================
ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON employer_profiles FROM anon;
GRANT SELECT ON employer_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON employer_profiles TO authenticated;

DROP POLICY IF EXISTS "anon_select_employer_profiles" ON employer_profiles;
DROP POLICY IF EXISTS "anon_insert_employer_profiles" ON employer_profiles;
DROP POLICY IF EXISTS "anon_update_employer_profiles" ON employer_profiles;
DROP POLICY IF EXISTS "anon_delete_employer_profiles" ON employer_profiles;

CREATE POLICY "employer_profiles_select_public" ON employer_profiles FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "employer_profiles_insert_own" ON employer_profiles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = employer_profiles."userId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "employer_profiles_update_own" ON employer_profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = employer_profiles."userId" AND u.auth_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = employer_profiles."userId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "employer_profiles_delete_own" ON employer_profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = employer_profiles."userId" AND u.auth_id = auth.uid())
  );

-- ============================================================
-- WORKER_PROFILES
-- ============================================================
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON worker_profiles FROM anon;
GRANT SELECT ON worker_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON worker_profiles TO authenticated;

DROP POLICY IF EXISTS "anon_select_worker_profiles" ON worker_profiles;
DROP POLICY IF EXISTS "anon_insert_worker_profiles" ON worker_profiles;
DROP POLICY IF EXISTS "anon_update_worker_profiles" ON worker_profiles;
DROP POLICY IF EXISTS "anon_delete_worker_profiles" ON worker_profiles;

CREATE POLICY "worker_profiles_select_public" ON worker_profiles FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "worker_profiles_insert_own" ON worker_profiles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = worker_profiles."userId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "worker_profiles_update_own" ON worker_profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = worker_profiles."userId" AND u.auth_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = worker_profiles."userId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "worker_profiles_delete_own" ON worker_profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = worker_profiles."userId" AND u.auth_id = auth.uid())
  );

-- ============================================================
-- JOBS
-- ============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON jobs FROM anon;
GRANT SELECT ON jobs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON jobs TO authenticated;

DROP POLICY IF EXISTS "anon_select_jobs" ON jobs;
DROP POLICY IF EXISTS "anon_insert_jobs" ON jobs;
DROP POLICY IF EXISTS "anon_update_jobs" ON jobs;
DROP POLICY IF EXISTS "anon_delete_jobs" ON jobs;

CREATE POLICY "jobs_select_public_or_own" ON jobs FOR SELECT
  TO anon, authenticated USING (
    status = 'published'
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = jobs."employerUserId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "jobs_insert_own" ON jobs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = jobs."employerUserId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "jobs_update_own" ON jobs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = jobs."employerUserId" AND u.auth_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = jobs."employerUserId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "jobs_delete_own" ON jobs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = jobs."employerUserId" AND u.auth_id = auth.uid())
  );

-- ============================================================
-- APPLICATIONS
-- ============================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON applications FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON applications TO authenticated;

DROP POLICY IF EXISTS "anon_select_applications" ON applications;
DROP POLICY IF EXISTS "anon_insert_applications" ON applications;
DROP POLICY IF EXISTS "anon_update_applications" ON applications;
DROP POLICY IF EXISTS "anon_delete_applications" ON applications;

-- Worker sees own; employer sees applications for jobs they own
CREATE POLICY "applications_select_own" ON applications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = applications."workerUserId" AND u.auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM jobs j
      JOIN users u ON u.id = j."employerUserId"
      WHERE j.id = applications."jobId" AND u.auth_id = auth.uid()
    )
  );

-- Worker applies for themselves only; status must start as 'applied'
CREATE POLICY "applications_insert_own_worker" ON applications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = applications."workerUserId" AND u.auth_id = auth.uid())
    AND status = 'applied'
  );

-- Worker may only withdraw their own; employer may update status (not to withdrawn) for their jobs
CREATE POLICY "applications_update_own" ON applications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = applications."workerUserId" AND u.auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM jobs j
      JOIN users u ON u.id = j."employerUserId"
      WHERE j.id = applications."jobId" AND u.auth_id = auth.uid()
    )
  ) WITH CHECK (
    -- Worker updating own row may only set status to 'withdrawn'
    (EXISTS (SELECT 1 FROM users u WHERE u.id = applications."workerUserId" AND u.auth_id = auth.uid())
      AND status = 'withdrawn')
    OR
    -- Employer updating applications for their jobs may set any status except 'withdrawn'
    (EXISTS (
      SELECT 1 FROM jobs j
      JOIN users u ON u.id = j."employerUserId"
      WHERE j.id = applications."jobId" AND u.auth_id = auth.uid()
    ) AND status <> 'withdrawn')
  );

CREATE POLICY "applications_delete_own" ON applications FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = applications."workerUserId" AND u.auth_id = auth.uid())
  );

-- ============================================================
-- SAVED_JOBS
-- ============================================================
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON saved_jobs FROM anon;
GRANT SELECT, INSERT, DELETE ON saved_jobs TO authenticated;

DROP POLICY IF EXISTS "anon_select_saved_jobs" ON saved_jobs;
DROP POLICY IF EXISTS "anon_insert_saved_jobs" ON saved_jobs;
DROP POLICY IF EXISTS "anon_update_saved_jobs" ON saved_jobs;
DROP POLICY IF EXISTS "anon_delete_saved_jobs" ON saved_jobs;

CREATE POLICY "saved_jobs_select_own" ON saved_jobs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = saved_jobs."workerUserId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "saved_jobs_insert_own" ON saved_jobs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = saved_jobs."workerUserId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "saved_jobs_delete_own" ON saved_jobs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = saved_jobs."workerUserId" AND u.auth_id = auth.uid())
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON notifications FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = notifications."userId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = notifications."userId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = notifications."userId" AND u.auth_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = notifications."userId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = notifications."userId" AND u.auth_id = auth.uid())
  );

-- ============================================================
-- REPORTS
-- ============================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON reports FROM anon;
GRANT SELECT, INSERT, UPDATE ON reports TO authenticated;

DROP POLICY IF EXISTS "anon_select_reports" ON reports;
DROP POLICY IF EXISTS "anon_insert_reports" ON reports;
DROP POLICY IF EXISTS "anon_update_reports" ON reports;
DROP POLICY IF EXISTS "anon_delete_reports" ON reports;

CREATE POLICY "reports_select_own_or_admin" ON reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = reports."reporterUserId" AND u.auth_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = reports."reporterUserId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "reports_update_admin" ON reports FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- REVIEWS
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON reviews FROM anon;
GRANT SELECT ON reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON reviews TO authenticated;

DROP POLICY IF EXISTS "anon_select_reviews" ON reviews;
DROP POLICY IF EXISTS "anon_insert_reviews" ON reviews;
DROP POLICY IF EXISTS "anon_update_reviews" ON reviews;
DROP POLICY IF EXISTS "anon_delete_reviews" ON reviews;

CREATE POLICY "reviews_select_public" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = reviews."reviewerUserId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = reviews."reviewerUserId" AND u.auth_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = reviews."reviewerUserId" AND u.auth_id = auth.uid())
  );

CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = reviews."reviewerUserId" AND u.auth_id = auth.uid())
  );

-- ============================================================
-- APP_META
-- ============================================================
ALTER TABLE app_meta ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON app_meta FROM anon;
GRANT SELECT ON app_meta TO anon, authenticated;
GRANT INSERT, UPDATE ON app_meta TO authenticated;

DROP POLICY IF EXISTS "anon_select_app_meta" ON app_meta;
DROP POLICY IF EXISTS "anon_insert_app_meta" ON app_meta;
DROP POLICY IF EXISTS "anon_update_app_meta" ON app_meta;
DROP POLICY IF EXISTS "anon_delete_app_meta" ON app_meta;

CREATE POLICY "app_meta_select_public" ON app_meta FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "app_meta_insert_authed" ON app_meta FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "app_meta_update_authed" ON app_meta FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261026113108_seed_ahmedabad_demo_data.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Seed LocalConnect Ahmedabad demo data

Inserts realistic Ahmedabad-area employer profiles, worker profiles,
published jobs, sample applications, saved jobs, notifications, and
reviews so the public browse experience works immediately.

Repeatable: every INSERT uses ON CONFLICT (id) DO NOTHING, so re-running
the seed never duplicates rows or overwrites user-created data. Seed
users have auth_id = NULL (display-only); real signed-up users are
separate and linked via auth_id.
*/

-- ---------- Users (display-only, no auth_id) ----------
INSERT INTO users (id, role, name, email, phone, verification, "createdAt", "avatarColor") VALUES
('u_worker_demo','worker','Rahul Sharma','rahul.sharma@example.in','98250 11234','demo_verified', now() - interval '30 days', '#10b981'),
('u_worker_2','worker','Priya Patel','priya.patel@example.in','98250 22345','demo_verified', now() - interval '25 days', '#0d9488'),
('u_worker_3','worker','Imran Qureshi','imran.q@example.in','98250 33456','unverified', now() - interval '20 days', '#3b82f6'),
('u_worker_4','worker','Sneha Desai','sneha.desai@example.in','98250 44567','demo_verified', now() - interval '15 days', '#f59e0b'),
('u_worker_5','worker','Amit Jadeja','amit.jadeja@example.in','98250 55678','unverified', now() - interval '10 days', '#ef4444'),
('u_emp_demo','employer','Karan Mehta','karan@satvikmart.in','79264 77881','demo_verified', now() - interval '60 days', '#0d9488'),
('u_emp_2','employer','Deepa Shah','deepa@lawgardenevents.in','79264 77882','demo_verified', now() - interval '50 days', '#3b82f6'),
('u_emp_3','employer','Ramesh Gupta','ramesh@swiftcargo.in','79264 77883','unverified', now() - interval '40 days', '#ef4444'),
('u_emp_4','employer','Farhan Ansari','farhan@spicebistro.in','79264 77884','demo_verified', now() - interval '35 days', '#8b5cf6'),
('u_emp_5','employer','Nisha Bhatt','nisha@brightpath.in','79264 77885','unverified', now() - interval '28 days', '#06b6d4')
ON CONFLICT (id) DO NOTHING;

-- ---------- Employer profiles ----------
INSERT INTO employer_profiles (id, "userId", "businessName", category, address, area, city, phone, description, verification, rating, "ratingCount", "jobsPosted", "establishedYear") VALUES
('ep_demo','u_emp_demo','Satvik Mart','retail','Ground Floor, Iscon Center, Satellite Road','Satellite','Ahmedabad','79264 77881','A neighbourhood grocery and daily-needs mart serving Satellite and Bodakdev families since 2016. Known for organised aisles and quick checkout.','demo_verified',4.5,14,9,2016),
('ep_2','u_emp_2','Law Garden Events','event_support','Law Garden, Ellisbridge','Ellisbridge','Ahmedabad','79264 77882','Event management team specialising in weekend cultural shows, college fests, and corporate gatherings across Ahmedabad.','demo_verified',4.7,11,6,2018),
('ep_3','u_emp_3','Swift Cargo Movers','warehouse','Plot 14, Naroda GIDC','Naroda','Ahmedabad','79264 77883','Logistics and packing company operating from Naroda GIDC. Handles local dispatch and intercity cargo packing.','unverified',3.9,5,4,2021),
('ep_4','u_emp_4','Spice Bistro','restaurant','Prahlad Nagar Corporate Road, Near AUDA Garden','Prahlad Nagar','Ahmedabad','79264 77884','Casual dining restaurant serving North Indian and Gujarati thali. Busy weekend dinner rushes.','demo_verified',4.3,9,5,2019),
('ep_5','u_emp_5','Brightpath Office Services','office_support','B-wing, Sattva Cube, Thaltej','Thaltej','Ahmedabad','79264 77885','Back-office services firm handling data entry and document scanning for small businesses.','unverified',0,0,2,2023)
ON CONFLICT (id) DO NOTHING;

-- ---------- Worker profiles ----------
INSERT INTO worker_profiles (id, "userId", "fullName", phone, "preferredArea", areas, skills, availability, "experienceYears", bio, rating, "ratingCount", "completedJobs", "profileCompletion", "workHistory") VALUES
('wp_demo','u_worker_demo','Rahul Sharma','98250 11234','Satellite, Ahmedabad',ARRAY['Satellite','Bodakdev','Vastrapur','Prahlad Nagar']::text[],ARRAY['Counter sales','Billing (POS)','Inventory packing','Basic English','Cash handling']::text[],ARRAY['Weekday mornings','Weekends','Evenings']::text[],3,'Reliable retail and packing worker with 3 years of experience across shops in Satellite and Bodakdev. Comfortable with POS billing and stock organization.',4.6,8,11,85,'[]'::jsonb),
('wp_2','u_worker_2','Priya Patel','98250 22345','Vastrapur, Ahmedabad',ARRAY['Vastrapur','Bodakdev','Thaltej']::text[],ARRAY['Event ushering','Registration desk','Crowd management','Hospitality','Basic Excel']::text[],ARRAY['Weekends','Evenings','Festive season']::text[],2,'Event support specialist. Experienced with registration desks and guest coordination for college and corporate events.',4.8,6,9,92,'[]'::jsonb),
('wp_3','u_worker_3','Imran Qureshi','98250 33456','Kalupur, Ahmedabad',ARRAY['Kalupur','Naroda','Vatva','Asarwa']::text[],ARRAY['Loading/unloading','Warehouse picking','Two-wheeler license','Heavy lifting']::text[],ARRAY['Weekday mornings','Weekday afternoons','Weekends']::text[],5,'Warehouse and loading worker with experience in dispatch and inventory movement. Two-wheeler license holder.',4.2,4,7,60,'[]'::jsonb),
('wp_4','u_worker_4','Sneha Desai','98250 44567','Prahlad Nagar, Ahmedabad',ARRAY['Prahlad Nagar','Satellite','Bopal']::text[],ARRAY['Delivery executive','Two-wheeler license','Google Maps navigation','Customer interaction']::text[],ARRAY['Weekday afternoons','Evenings','Weekends']::text[],1,'Delivery executive with two-wheeler license. Familiar with Prahlad Nagar and Bopal routes.',4.5,5,6,70,'[]'::jsonb),
('wp_5','u_worker_5','Amit Jadeja','98250 55678','Maninagar, Ahmedabad',ARRAY['Maninagar','Iscon','Satellite']::text[],ARRAY['Restaurant service','Kitchen help','Table cleaning','Cash handling']::text[],ARRAY['Evenings','Weekends']::text[],4,'Restaurant helper with experience in busy family dining outlets in Maninagar.',4.0,3,5,50,'[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------- Jobs (published + a couple of draft/completed for employer variety) ----------
INSERT INTO jobs (id, "employerId", "employerUserId", title, category, description, responsibilities, "requiredSkills", "workersNeeded", location, area, city, date, "startTime", "endTime", "employmentType", "payAmount", "payBasis", "paymentTiming", "paymentMethod", requirements, "contactPreference", benefits, status, "createdAt", verification, "applicantsCount") VALUES
('job_1','ep_demo','u_emp_demo','Counter Sales Helper — Weekend','retail','Help customers at the billing counter, restock shelves, and assist with bag packing during the weekend rush. Friendly behaviour and basic Hindi/Gujarati required. POS training will be given on the spot.',ARRAY['Operate billing counter during peak hours','Restock fast-moving items on shelves','Help customers locate products','Pack grocery bags at checkout']::text[],ARRAY['Counter sales','Billing (POS)','Cash handling','Hindi','Gujarati']::text[],2,'Iscon Center, Satellite Road','Satellite','Ahmedabad',(CURRENT_DATE + INTERVAL '3 days')::text,'09:30','20:00','weekend',450,'per_day','same_day','cash_or_upi',ARRAY['Aadhaar or any ID for entry','Comfortable standing for long shifts']::text[],'call',ARRAY['Lunch provided','Travel allowance: ₹50']::text[],'published', now() - interval '2 days','demo_verified',3),
('job_2','ep_2','u_emp_2','Event Ushers — Sunday Cultural Night','event_support','Usher guests to seats, manage registration desk, and guide attendees during a Sunday evening cultural event at Law Garden. Uniform (sash) provided. Reporting time 4:00 PM.',ARRAY['Guest registration and ticket check','Guide attendees to seating zones','Manage entry and exit crowd flow','Assist performers with basic coordination']::text[],ARRAY['Event ushering','Registration desk','Crowd management','Hindi']::text[],6,'Law Garden, Ellisbridge','Ellisbridge','Ahmedabad',(CURRENT_DATE + INTERVAL '5 days')::text,'16:00','22:00','event',180,'per_shift','end_of_shift','upi',ARRAY['Formal kurta or white shirt + dark trousers','Reach venue by 3:30 PM']::text[],'whatsapp',ARRAY['Snacks provided','Event pass for off-duty hours']::text[],'published', now() - interval '3 days','demo_verified',2),
('job_3','ep_3','u_emp_3','Packing Helpers — Dispatch Day','packing','Pack outgoing parcels, label boxes, and load packed items onto dispatch vehicles. Heavy lifting involved. Gloves and water provided.',ARRAY['Pack items into cartons with protective material','Stick shipping labels and verify counts','Move packed cartons to dispatch bay','Assist loading into tempo']::text[],ARRAY['Loading/unloading','Packing','Heavy lifting']::text[],4,'Plot 14, Naroda GIDC','Naroda','Ahmedabad',(CURRENT_DATE + INTERVAL '2 days')::text,'08:00','17:00','one_day',75,'per_hour','after_completion','cash',ARRAY['Own transport to Naroda GIDC','Physically fit for lifting']::text[],'call',ARRAY['Tea and lunch provided']::text[],'published', now() - interval '1 day','unverified',1),
('job_4','ep_4','u_emp_4','Restaurant Service Helper — Dinner Rush','restaurant','Assist waiters during the dinner rush: clear tables, serve water and rotis, and keep the floor clean. Fast-paced environment. Uniform apron provided.',ARRAY['Clear and wipe tables quickly','Serve water, papad, and breads to tables','Refill chutneys and side dishes','Keep dining floor clean and dry']::text[],ARRAY['Restaurant service','Kitchen help','Teamwork']::text[],3,'Prahlad Nagar Corporate Road','Prahlad Nagar','Ahmedabad',(CURRENT_DATE + INTERVAL '4 days')::text,'19:00','23:30','part_time',60,'per_hour','end_of_shift','cash_or_upi',ARRAY['Clean appearance','Reach by 6:45 PM']::text[],'call',ARRAY['Staff meal after shift']::text[],'published', now() - interval '4 days','demo_verified',1),
('job_5','ep_demo','u_emp_demo','Inventory Stock Check — Monthly Audit','warehouse','Help with the monthly stock audit: count items aisle-wise, record on provided sheet, and flag mismatches. Attention to detail is important.',ARRAY['Count stock for assigned aisles','Record counts on audit sheet','Flag damaged or expired items','Help reorganise mis-shelved stock']::text[],ARRAY['Inventory packing','Basic English','Attention to detail']::text[],2,'Iscon Center, Satellite Road','Satellite','Ahmedabad',(CURRENT_DATE + INTERVAL '6 days')::text,'10:00','18:00','one_day',400,'per_day','same_day','upi',ARRAY['Basic reading/writing','Carry own pen']::text[],'app_message',ARRAY['Lunch and tea provided']::text[],'published', now() - interval '5 days','demo_verified',1),
('job_6','ep_5','u_emp_5','Data Entry Operator — 3 Day Project','office_support','Enter customer details from scanned forms into Excel. Fixed format provided. Need accuracy and decent typing speed. Laptop will be provided at office.',ARRAY['Enter form data into provided Excel template','Cross-check 10% of entries for accuracy','Flag illegible forms for review','Submit daily count by end of shift']::text[],ARRAY['Basic Excel','Basic English','Typing']::text[],2,'B-wing, Sattva Cube, Thaltej','Thaltej','Ahmedabad',(CURRENT_DATE + INTERVAL '7 days')::text,'10:00','17:00','temporary',350,'per_day','weekly','bank_transfer',ARRAY['Typing speed 25+ wpm','Bring Aadhaar for office entry']::text[],'email',ARRAY['Air-conditioned office','Tea provided']::text[],'published', now() - interval '6 days','unverified',0),
('job_7','ep_3','u_emp_3','Warehouse Picker — Morning Shift','warehouse','Pick orders from shelves based on pick list, pack into dispatch bags, and stage for delivery. Two-wheeler license preferred but not required.',ARRAY['Read pick list and collect items','Pack orders into dispatch bags','Update picked status on sheet','Stage packed orders for dispatch']::text[],ARRAY['Warehouse picking','Loading/unloading','Basic English']::text[],3,'Plot 14, Naroda GIDC','Naroda','Ahmedabad',(CURRENT_DATE + INTERVAL '1 day')::text,'07:30','13:00','part_time',70,'per_hour','after_completion','cash',ARRAY['Reach warehouse by 7:15 AM','Carry water bottle']::text[],'call',ARRAY['Tea and breakfast provided']::text[],'published', now() - interval '1 day','unverified',1),
('job_8','ep_4','u_emp_4','Tandoor Helper — Weekend Dinner','restaurant','Assist the tandoor chef with prep: knead dough, cut vegetables, manage coal and skewers. Hot working area near tandoor.',ARRAY['Knead dough as instructed','Prep and skewer kebabs','Manage tandoor coal and temperature','Keep tandoor station clean']::text[],ARRAY['Kitchen help','Restaurant service']::text[],1,'Prahlad Nagar Corporate Road','Prahlad Nagar','Ahmedabad',(CURRENT_DATE + INTERVAL '5 days')::text,'18:00','23:30','weekend',250,'per_shift','end_of_shift','cash',ARRAY['Prior kitchen exposure','Comfortable near heat']::text[],'whatsapp',ARRAY['Staff meal','Apron and gloves provided']::text[],'published', now() - interval '2 days','demo_verified',1),
('job_9','ep_2','u_emp_2','Stall Coordinator — Weekend Handicraft Bazaar','event_support','Coordinate 4 handicraft stalls at a weekend bazaar: help stall owners set up, manage visitor flow, collect feedback. Reporting 8 AM both days.',ARRAY['Help stall owners with setup and signage','Guide visitors and answer queries','Monitor stall areas for cleanliness','Collect visitor feedback forms']::text[],ARRAY['Event ushering','Hospitality','Hindi','Gujarati']::text[],4,'Law Garden, Ellisbridge','Ellisbridge','Ahmedabad',(CURRENT_DATE + INTERVAL '8 days')::text,'08:30','19:00','weekend',200,'per_day','after_completion','upi',ARRAY['Reach by 8:00 AM both days','Polite communication']::text[],'whatsapp',ARRAY['Lunch provided','Bazaar discount voucher']::text[],'published', now() - interval '3 days','demo_verified',1),
('job_10','ep_demo','u_emp_demo','Delivery Assistant — Evening Grocery Run','delivery','Accompany delivery rider on evening grocery deliveries in Satellite and Bodakdev. Carry parcels to doorsteps and collect cash/UPI payments.',ARRAY['Carry parcels to customer doorsteps','Collect cash/UPI and hand over to rider','Verify delivery addresses','Maintain delivery log']::text[],ARRAY['Delivery executive','Customer interaction','Gujarati']::text[],2,'Iscon Center, Satellite Road','Satellite','Ahmedabad',(CURRENT_DATE + INTERVAL '2 days')::text,'17:00','21:30','part_time',50,'per_hour','same_day','cash_or_upi',ARRAY['Comfortable with two-wheeler pillion','Basic phone for UPI']::text[],'call',ARRAY['Tea provided','₹40 travel allowance']::text[],'published', now() - interval '1 day','demo_verified',1),
('job_11','ep_5','u_emp_5','Document Scanning Helper','office_support','Scan old client files using office scanner, rename files as per format, and save to shared folder. Simple but repetitive task. Training given.',ARRAY['Scan documents using provided scanner','Rename files per naming format','Save to correct folder','Sort physical files after scanning']::text[],ARRAY['Basic English','Basic computer']::text[],1,'B-wing, Sattva Cube, Thaltej','Thaltej','Ahmedabad',(CURRENT_DATE + INTERVAL '9 days')::text,'11:00','16:00','one_day',300,'per_day','same_day','upi',ARRAY['Careful handling of old documents']::text[],'email',ARRAY['Air-conditioned office']::text[],'published', now() - interval '7 days','unverified',0),
('job_12','ep_3','u_emp_3','Loading Helpers — Tempo Loading','packing','Load packed cartons into tempos for intercity dispatch. Heavy lifting. Quick 3-hour job in the morning.',ARRAY['Load cartons into tempo as per load plan','Stack and secure with rope/strap','Verify count against challan']::text[],ARRAY['Loading/unloading','Heavy lifting']::text[],5,'Plot 14, Naroda GIDC','Naroda','Ahmedabad',(CURRENT_DATE + INTERVAL '3 days')::text,'06:30','09:30','one_day',120,'per_task','same_day','cash',ARRAY['Physically fit','Reach by 6:15 AM']::text[],'call',ARRAY['Tea and biscuits']::text[],'published', now() - interval '2 days','unverified',0),
('job_13','ep_demo','u_emp_demo','Festival Decor Help — Draft','event_support','Help with Diwali decor setup inside the store. Still finalising dates and worker count.',ARRAY['Hang decorations','Arrange festive display']::text[],ARRAY['Event ushering']::text[],2,'Iscon Center, Satellite Road','Satellite','Ahmedabad',(CURRENT_DATE + INTERVAL '20 days')::text,'10:00','18:00','one_day',350,'per_day','same_day','cash_or_upi',ARRAY['Creative and careful']::text[],'app_message',ARRAY['Festival sweets box']::text[],'draft', now() - interval '1 day','demo_verified',0),
('job_14','ep_2','u_emp_2','College Fest Ushers (Completed)','event_support','Past event — ushers for a college fest registration desk. Completed last month.',ARRAY['Registration desk','Crowd flow']::text[],ARRAY['Event ushering','Registration desk']::text[],5,'Law Garden, Ellisbridge','Ellisbridge','Ahmedabad',(CURRENT_DATE - INTERVAL '15 days')::text,'15:00','21:00','event',200,'per_shift','end_of_shift','upi',ARRAY['Formal attire']::text[],'whatsapp',ARRAY['Snacks']::text[],'completed', now() - interval '25 days','demo_verified',1)
ON CONFLICT (id) DO NOTHING;

-- ---------- Applications (seed) ----------
INSERT INTO applications (id, "jobId", "workerUserId", "employerUserId", status, message, "appliedAt", "updatedAt") VALUES
('app_1','job_1','u_worker_demo','u_emp_demo','shortlisted','I have 3 years of counter sales experience and live nearby in Satellite.', now() - interval '1 day', now() - interval '1 day'),
('app_2','job_2','u_worker_demo','u_emp_2','applied','Available full shift on Sunday. Have done registration desk before.', now() - interval '2 days', now() - interval '2 days'),
('app_3','job_5','u_worker_demo','u_emp_demo','accepted','Comfortable with stock audits. Can carry my own pen.', now() - interval '4 days', now() - interval '1 day'),
('app_4','job_3','u_worker_3','u_emp_3','reviewed','Experienced in loading and packing at Naroda.', now() - interval '1 day', now() - interval '1 day'),
('app_5','job_7','u_worker_3','u_emp_3','applied','', now() - interval '1 day', now() - interval '1 day'),
('app_6','job_2','u_worker_2','u_emp_2','shortlisted','Done ushering at 3 events. Polite with guests.', now() - interval '2 days', now() - interval '1 day'),
('app_7','job_9','u_worker_2','u_emp_2','accepted','Available both weekend days.', now() - interval '3 days', now() - interval '1 day'),
('app_8','job_10','u_worker_4','u_emp_demo','applied','I know Satellite and Bodakdev routes well.', now() - interval '1 day', now() - interval '1 day'),
('app_9','job_4','u_worker_5','u_emp_4','rejected','Have 4 years of restaurant helper experience.', now() - interval '3 days', now() - interval '2 days'),
('app_10','job_8','u_worker_5','u_emp_4','applied','Comfortable near tandoor. Have done kitchen help before.', now() - interval '1 day', now() - interval '1 day'),
('app_11','job_1','u_worker_2','u_emp_demo','applied','Can do both weekend days.', now() - interval '1 day', now() - interval '1 day'),
('app_12','job_14','u_worker_2','u_emp_2','accepted','Completed the fest ushering.', now() - interval '22 days', now() - interval '15 days')
ON CONFLICT (id) DO NOTHING;

-- ---------- Saved jobs (seed) ----------
INSERT INTO saved_jobs (id, "jobId", "workerUserId", "savedAt") VALUES
('sav_1','job_2','u_worker_demo', now() - interval '3 days'),
('sav_2','job_10','u_worker_demo', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- ---------- Notifications (seed) ----------
INSERT INTO notifications (id, "userId", type, title, body, link, read, "createdAt") VALUES
('n_1','u_worker_demo','application_status','Application shortlisted','Satvik Mart shortlisted your application for Counter Sales Helper — Weekend.','/worker/applications', false, now() - interval '1 hour'),
('n_2','u_worker_demo','application_status','Application accepted','Satvik Mart accepted your application for Inventory Stock Check — Monthly Audit.','/worker/applications', false, now() - interval '6 hours'),
('n_3','u_worker_demo','saved_job','Reminder: saved job closes soon','Event Ushers — Sunday Cultural Night is filling up fast.','/worker/saved', true, now() - interval '24 hours'),
('n_4','u_emp_demo','application_received','New application received','Rahul Sharma applied to Counter Sales Helper — Weekend.','/employer/applicants', false, now() - interval '2 hours'),
('n_5','u_emp_demo','application_received','New application received','Priya Patel applied to Counter Sales Helper — Weekend.','/employer/applicants', false, now() - interval '3 hours'),
('n_6','u_emp_demo','job_status_changed','Job auto-flagged for review','Your draft "Festival Decor Help" is still unpublished.','/employer/jobs', true, now() - interval '48 hours')
ON CONFLICT (id) DO NOTHING;

-- ---------- Reviews (seed) ----------
INSERT INTO reviews (id, "reviewerUserId", "targetType", "targetId", "jobId", rating, comment, "createdAt") VALUES
('rev_1','u_emp_demo','worker','wp_demo','job_1',5,'Very reliable and good with customers.', now() - interval '10 days'),
('rev_2','u_emp_2','worker','wp_2',NULL,5,'Excellent usher, guests complimented her.', now() - interval '4 days'),
('rev_3','u_worker_demo','employer','ep_demo','job_1',5,'Paid on time, clear instructions.', now() - interval '12 days')
ON CONFLICT (id) DO NOTHING;

-- ---------- app_meta ----------
INSERT INTO app_meta (id, "seededAt") VALUES ('singleton', now())
ON CONFLICT (id) DO NOTHING;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261026113127_is_admin_security_invoker.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

/*
# Make is_admin() SECURITY INVOKER

The is_admin() helper only reads auth.jwt() app_metadata, which is
available to the calling role, so SECURITY DEFINER is unnecessary.
Switching to SECURITY INVOKER clears the security advisor warning and
removes the elevated-privilege surface.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261026223000_harden_profile_data_and_write_permissions.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- Keep contact details out of public table reads and make protected fields
-- writable only through trusted server-side operations.

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role
  FROM public.users u
  WHERE u.auth_id = auth.uid()
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_app_user_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_account()
RETURNS TABLE (
  user_id text,
  account_role text,
  name text,
  email text,
  user_phone text,
  verification text,
  created_at timestamptz,
  avatar_color text,
  worker_profile_id text,
  worker_phone text,
  employer_profile_id text,
  employer_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.role,
    u.name,
    u.email,
    u.phone,
    u.verification,
    u."createdAt",
    u."avatarColor",
    wp.id,
    wp.phone,
    ep.id,
    ep.phone
  FROM public.users u
  LEFT JOIN public.worker_profiles wp ON wp."userId" = u.id
  LEFT JOIN public.employer_profiles ep ON ep."userId" = u.id
  WHERE u.auth_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_authorized_profile_phone(target_user_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(wp.phone, ep.phone, u.phone)
  FROM public.users u
  LEFT JOIN public.worker_profiles wp ON wp."userId" = u.id
  LEFT JOIN public.employer_profiles ep ON ep."userId" = u.id
  WHERE u.id = target_user_id
    AND (
      u.auth_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.jobs j ON j.id = a."jobId"
        WHERE a."workerUserId" = u.id
          AND a.status = 'accepted'
          AND j."employerUserId" = public.current_app_user_id()
      )
      OR EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a."employerUserId" = u.id
          AND a."workerUserId" = public.current_app_user_id()
          AND a.status = 'accepted'
      )
    )
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_account() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_authorized_profile_phone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_authorized_profile_phone(text) TO authenticated;

-- Expose only non-contact profile columns through direct table queries.
REVOKE SELECT ON public.users, public.worker_profiles, public.employer_profiles FROM anon, authenticated;
GRANT SELECT (id, role, name, verification, "createdAt", "avatarColor")
  ON public.users TO anon, authenticated;
GRANT SELECT (
  id, "userId", "businessName", category, address, area, city, description,
  verification, rating, "ratingCount", "jobsPosted", "establishedYear"
) ON public.employer_profiles TO anon, authenticated;
GRANT SELECT (
  id, "userId", "fullName", "preferredArea", areas, skills, availability,
  "experienceYears", bio, rating, "ratingCount", "completedJobs",
  "profileCompletion", "workHistory"
) ON public.worker_profiles TO authenticated;
DROP POLICY IF EXISTS "worker_profiles_select_public" ON public.worker_profiles;
CREATE POLICY "worker_profiles_select_authorized" ON public.worker_profiles FOR SELECT
  TO authenticated USING (
    "userId" = public.current_app_user_id()
    OR EXISTS (
      SELECT 1
      FROM public.applications a
      WHERE a."workerUserId" = worker_profiles."userId"
        AND a."employerUserId" = public.current_app_user_id()
    )
    OR public.is_admin()
  );

-- Users can create their own worker or employer account, but cannot mutate
-- their role, verification, auth linkage, or delete account rows directly.
REVOKE UPDATE, DELETE ON public.users FROM authenticated;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_delete_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT
  TO authenticated WITH CHECK (
    auth_id = auth.uid()
    AND role IN ('worker', 'employer')
    AND verification = 'unverified'
  );

-- Profile owners can edit profile content but not verification or trusted
-- counters. Contact columns remain accessible only via the functions above.
REVOKE UPDATE, DELETE ON public.employer_profiles FROM authenticated;
GRANT UPDATE (
  "businessName", category, address, area, city, phone, description, "establishedYear"
) ON public.employer_profiles TO authenticated;
DROP POLICY IF EXISTS "employer_profiles_insert_own" ON public.employer_profiles;
DROP POLICY IF EXISTS "employer_profiles_update_own" ON public.employer_profiles;
DROP POLICY IF EXISTS "employer_profiles_delete_own" ON public.employer_profiles;
CREATE POLICY "employer_profiles_insert_own" ON public.employer_profiles FOR INSERT
  TO authenticated WITH CHECK (
    "userId" = public.current_app_user_id()
    AND public.current_app_role() = 'employer'
    AND verification = 'unverified'
    AND rating = 0
    AND "ratingCount" = 0
    AND "jobsPosted" = 0
  );
CREATE POLICY "employer_profiles_update_own" ON public.employer_profiles FOR UPDATE
  TO authenticated USING (
    "userId" = public.current_app_user_id()
    AND public.current_app_role() = 'employer'
  ) WITH CHECK (
    "userId" = public.current_app_user_id()
    AND public.current_app_role() = 'employer'
  );

REVOKE UPDATE, DELETE ON public.worker_profiles FROM authenticated;
GRANT UPDATE (
  "fullName", phone, "preferredArea", areas, skills, availability,
  "experienceYears", bio, "profileCompletion", "workHistory"
) ON public.worker_profiles TO authenticated;
DROP POLICY IF EXISTS "worker_profiles_insert_own" ON public.worker_profiles;
DROP POLICY IF EXISTS "worker_profiles_update_own" ON public.worker_profiles;
DROP POLICY IF EXISTS "worker_profiles_delete_own" ON public.worker_profiles;
CREATE POLICY "worker_profiles_insert_own" ON public.worker_profiles FOR INSERT
  TO authenticated WITH CHECK (
    "userId" = public.current_app_user_id()
    AND public.current_app_role() = 'worker'
    AND rating = 0
    AND "ratingCount" = 0
    AND "completedJobs" = 0
    AND "profileCompletion" BETWEEN 0 AND 100
  );
CREATE POLICY "worker_profiles_update_own" ON public.worker_profiles FOR UPDATE
  TO authenticated USING (
    "userId" = public.current_app_user_id()
    AND public.current_app_role() = 'worker'
  ) WITH CHECK (
    "userId" = public.current_app_user_id()
    AND public.current_app_role() = 'worker'
  );

-- Job owners may update listing fields and status, but cannot forge employer
-- identity, verification, or applicant counts.
REVOKE UPDATE ON public.jobs FROM authenticated;
GRANT UPDATE (
  title, category, description, responsibilities, "requiredSkills",
  "workersNeeded", location, area, city, date, "startTime", "endTime",
  "employmentType", "payAmount", "payBasis", "paymentTiming",
  "paymentMethod", requirements, "contactPreference", benefits, status
) ON public.jobs TO authenticated;
DROP POLICY IF EXISTS "jobs_select_public_or_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_own" ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete_own" ON public.jobs;
CREATE POLICY "jobs_select_public_or_own" ON public.jobs FOR SELECT
  TO authenticated USING (
    status = 'published'
    OR "employerUserId" = public.current_app_user_id()
    OR public.is_admin()
  );
CREATE POLICY "jobs_select_published_public" ON public.jobs FOR SELECT
  TO anon USING (status = 'published');
CREATE POLICY "jobs_insert_own" ON public.jobs FOR INSERT
  TO authenticated WITH CHECK (
    public.current_app_role() = 'employer'
    AND "employerUserId" = public.current_app_user_id()
    AND EXISTS (
      SELECT 1
      FROM public.employer_profiles ep
      WHERE ep.id = jobs."employerId"
        AND ep."userId" = public.current_app_user_id()
        AND ep.verification = jobs.verification
    )
    AND "applicantsCount" = 0
  );
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE
  TO authenticated USING (
    public.current_app_role() = 'employer'
    AND "employerUserId" = public.current_app_user_id()
  ) WITH CHECK (
    public.current_app_role() = 'employer'
    AND "employerUserId" = public.current_app_user_id()
  );
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE
  TO authenticated USING (
    public.current_app_role() = 'employer'
    AND "employerUserId" = public.current_app_user_id()
  );

-- Prevent applications from being reassigned or edited beyond their status.
REVOKE UPDATE ON public.applications FROM authenticated;
GRANT UPDATE (status, "updatedAt") ON public.applications TO authenticated;
DROP POLICY IF EXISTS "applications_select_own" ON public.applications;
DROP POLICY IF EXISTS "applications_insert_own_worker" ON public.applications;
DROP POLICY IF EXISTS "applications_update_own" ON public.applications;
DROP POLICY IF EXISTS "applications_delete_own" ON public.applications;
CREATE POLICY "applications_select_own" ON public.applications FOR SELECT
  TO authenticated USING (
    "workerUserId" = public.current_app_user_id()
    OR "employerUserId" = public.current_app_user_id()
    OR public.is_admin()
  );
CREATE POLICY "applications_insert_own_worker" ON public.applications FOR INSERT
  TO authenticated WITH CHECK (
    public.current_app_role() = 'worker'
    AND "workerUserId" = public.current_app_user_id()
    AND status = 'applied'
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications."jobId"
        AND j."employerUserId" = applications."employerUserId"
        AND j.status = 'published'
    )
  );
CREATE POLICY "applications_update_own" ON public.applications FOR UPDATE
  TO authenticated USING (
    ("workerUserId" = public.current_app_user_id() AND public.current_app_role() = 'worker')
    OR ("employerUserId" = public.current_app_user_id() AND public.current_app_role() = 'employer')
  ) WITH CHECK (
    ("workerUserId" = public.current_app_user_id()
      AND public.current_app_role() = 'worker'
      AND status = 'withdrawn')
    OR ("employerUserId" = public.current_app_user_id()
      AND public.current_app_role() = 'employer'
      AND status <> 'withdrawn')
  );
CREATE POLICY "applications_delete_own" ON public.applications FOR DELETE
  TO authenticated USING (
    "workerUserId" = public.current_app_user_id()
    AND public.current_app_role() = 'worker'
  );

-- Replace cross-table auth lookups with the protected helper so column-level
-- restrictions on users.auth_id do not break ownership checks.
DROP POLICY IF EXISTS "saved_jobs_select_own" ON public.saved_jobs;
DROP POLICY IF EXISTS "saved_jobs_insert_own" ON public.saved_jobs;
DROP POLICY IF EXISTS "saved_jobs_delete_own" ON public.saved_jobs;
CREATE POLICY "saved_jobs_select_own" ON public.saved_jobs FOR SELECT
  TO authenticated USING (
    "workerUserId" = public.current_app_user_id()
    AND public.current_app_role() = 'worker'
  );
CREATE POLICY "saved_jobs_insert_own" ON public.saved_jobs FOR INSERT
  TO authenticated WITH CHECK (
    "workerUserId" = public.current_app_user_id()
    AND public.current_app_role() = 'worker'
  );
CREATE POLICY "saved_jobs_delete_own" ON public.saved_jobs FOR DELETE
  TO authenticated USING (
    "workerUserId" = public.current_app_user_id()
    AND public.current_app_role() = 'worker'
  );

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;
GRANT UPDATE (read) ON public.notifications TO authenticated;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  TO authenticated USING ("userId" = public.current_app_user_id());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  TO authenticated USING ("userId" = public.current_app_user_id())
  WITH CHECK ("userId" = public.current_app_user_id());

DROP POLICY IF EXISTS "reports_select_own_or_admin" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
DROP POLICY IF EXISTS "reports_update_admin" ON public.reports;
REVOKE UPDATE ON public.reports FROM authenticated;
GRANT UPDATE (status) ON public.reports TO authenticated;
CREATE POLICY "reports_select_own_or_admin" ON public.reports FOR SELECT
  TO authenticated USING (
    "reporterUserId" = public.current_app_user_id()
    OR public.is_admin()
  );
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT
  TO authenticated WITH CHECK (
    "reporterUserId" = public.current_app_user_id()
    AND status = 'open'
  );
CREATE POLICY "reports_update_admin" ON public.reports FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (
    "reviewerUserId" = public.current_app_user_id()
  );
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE
  TO authenticated USING (
    "reviewerUserId" = public.current_app_user_id()
  ) WITH CHECK (
    "reviewerUserId" = public.current_app_user_id()
  );
CREATE POLICY "reviews_delete_own" ON public.reviews FOR DELETE
  TO authenticated USING (
    "reviewerUserId" = public.current_app_user_id()
  );

-- app_meta is system state, not client-managed business data.
REVOKE INSERT, UPDATE, DELETE ON public.app_meta FROM anon, authenticated;
DROP POLICY IF EXISTS "app_meta_insert_authed" ON public.app_meta;
DROP POLICY IF EXISTS "app_meta_update_authed" ON public.app_meta;
DROP POLICY IF EXISTS "app_meta_select_public" ON public.app_meta;
CREATE POLICY "app_meta_select_public" ON public.app_meta FOR SELECT
  TO anon, authenticated USING (true);

-- Notifications to another user are emitted by trusted database triggers,
-- not by a client holding the public anon key.
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id text,
  notification_type text,
  notification_title text,
  notification_body text,
  notification_link text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (
    id, "userId", type, title, body, link, read, "createdAt"
  )
  VALUES (
    'n_' || md5(random()::text || clock_timestamp()::text),
    target_user_id,
    notification_type,
    notification_title,
    notification_body,
    notification_link,
    false,
    now()
  )
$$;

CREATE OR REPLACE FUNCTION public.notify_application_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_title text;
BEGIN
  SELECT j.title INTO job_title
  FROM public.jobs j
  WHERE j.id = NEW."jobId";

  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(
      NEW."employerUserId",
      'application_received',
      'New application received',
      'A worker applied to "' || coalesce(job_title, 'your job') || '".',
      '/employer/applicants'
    );
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'withdrawn'
       AND public.current_app_user_id() = NEW."workerUserId" THEN
      PERFORM public.create_notification(
        NEW."employerUserId",
        'application_status',
        'Application withdrawn',
        'A worker withdrew their application from "' || coalesce(job_title, 'your job') || '".',
        '/employer/applicants'
      );
    ELSIF NEW.status <> 'reviewed'
       AND public.current_app_user_id() = NEW."employerUserId" THEN
      PERFORM public.create_notification(
        NEW."workerUserId",
        'application_status',
        'Application ' || NEW.status,
        'Your application for "' || coalesce(job_title, 'a job') || '" was marked ' || NEW.status || ' by the employer.',
        '/worker/applications'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_job_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('completed', 'paused') THEN
    INSERT INTO public.notifications (
      id, "userId", type, title, body, link, read, "createdAt"
    )
    SELECT
      'n_' || md5(random()::text || clock_timestamp()::text || a.id),
      a."workerUserId",
      'job_status_changed',
      CASE WHEN NEW.status = 'completed' THEN 'Job marked completed' ELSE 'Job paused' END,
      'The job "' || NEW.title || '" was marked ' || NEW.status || ' by the employer.',
      '/worker/applications',
      false,
      now()
    FROM public.applications a
    WHERE a."jobId" = NEW.id AND a.status = 'accepted';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_report_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(
      NEW."reporterUserId",
      'report_update',
      'Report submitted',
      'Your report has been received and will be reviewed by the moderation team.',
      NULL
    );
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.create_notification(
      NEW."reporterUserId",
      'report_update',
      CASE
        WHEN NEW.status = 'dismissed' THEN 'Report dismissed'
        WHEN NEW.status = 'suspended' THEN 'Record suspended'
        ELSE 'Report reviewed'
      END,
      'Your report was reviewed by the moderation team and marked ' || NEW.status || '.',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_notification(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_application_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_job_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_report_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS applications_notify_change ON public.applications;
CREATE TRIGGER applications_notify_change
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_change();

DROP TRIGGER IF EXISTS jobs_notify_status_change ON public.jobs;
CREATE TRIGGER jobs_notify_status_change
  AFTER UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.notify_job_status_change();

DROP TRIGGER IF EXISTS reports_notify_status_change ON public.reports;
CREATE TRIGGER reports_notify_status_change
  AFTER INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_report_status_change();


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- FILE: 20261026230000_repair_auth_tokens_and_security.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================
-- LocalConnect Migration: 20261026230000_repair_auth_tokens_and_security.sql
-- 1. Repair auth.users NULL token columns (fixes GoTrue login scan error)
-- 2. Allow authenticated workflow notifications across users
-- 3. Restrict app_meta mutation to administrators only
-- 4. Add unique constraint on saved_jobs(jobId, workerUserId)
-- ============================================================

-- 1. FIX AUTH.USERS NULL TOKENS
-- GoTrue (Supabase Auth in Go) fails with:
--   "sql: Scan error on column index 3, name 'confirmation_token': converting NULL to string is unsupported"
-- when confirmation_token or other token columns are NULL on seeded/manually inserted users.
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
  confirmation_token IS NULL 
  OR recovery_token IS NULL 
  OR email_change IS NULL 
  OR email_change_token_new IS NULL
  OR email_change_token_current IS NULL
  OR reauthentication_token IS NULL;

-- 2. NOTIFICATIONS CROSS-USER INSERT POLICY
-- When a worker applies or withdraws, or an employer updates status,
-- the actor must insert a notification destined for the other party.
-- The previous policy only permitted inserting rows where userId = actor.
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;

CREATE POLICY "notifications_insert_authenticated" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    -- Target user must exist in public.users
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = notifications."userId")
  );

-- 3. RESTRICT APP_META MUTATION TO ADMINS
-- Previous migration allowed any authenticated user to insert or update app_meta
DROP POLICY IF EXISTS "app_meta_insert_authed" ON app_meta;
DROP POLICY IF EXISTS "app_meta_update_authed" ON app_meta;
DROP POLICY IF EXISTS "app_meta_insert_admin" ON app_meta;
DROP POLICY IF EXISTS "app_meta_update_admin" ON app_meta;

CREATE POLICY "app_meta_insert_admin" ON app_meta FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "app_meta_update_admin" ON app_meta FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. PREVENT DUPLICATE SAVED JOBS
CREATE UNIQUE INDEX IF NOT EXISTS saved_jobs_job_worker_unique 
  ON saved_jobs ("jobId", "workerUserId");

