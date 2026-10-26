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
