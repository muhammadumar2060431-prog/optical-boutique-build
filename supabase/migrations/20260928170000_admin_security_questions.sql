BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_security_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_answer_hash TEXT NOT NULL,
  school_answer_salt TEXT NOT NULL,
  friend_answer_hash TEXT NOT NULL,
  friend_answer_salt TEXT NOT NULL,
  city_answer_hash TEXT NOT NULL,
  city_answer_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_security_profiles_single_admin_idx
  ON public.admin_security_profiles ((true));

ALTER TABLE public.admin_security_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_security_profiles FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_security_profiles TO service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users AS admins
    INNER JOIN public.admin_security_profiles AS security
      ON security.user_id = admins.user_id
    WHERE admins.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

COMMIT;
