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
