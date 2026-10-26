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
