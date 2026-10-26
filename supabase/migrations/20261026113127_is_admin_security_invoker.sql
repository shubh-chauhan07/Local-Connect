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
