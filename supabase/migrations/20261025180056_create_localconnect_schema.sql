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
