BEGIN;

-- Remove overly broad read access on profiles and keep only safe column visibility.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

CREATE POLICY "Public can view safe profile fields"
ON public.profiles
FOR SELECT
TO public
USING (true);

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, nickname, avatar_url, bio, location, hiking_styles, provider, is_active, created_at, updated_at) ON public.profiles TO anon, authenticated;
GRANT INSERT (id, user_id, email, nickname, avatar_url, bio, location, hiking_styles, provider, is_active, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (nickname, avatar_url, bio, location, hiking_styles, provider, is_active, updated_at) ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO authenticated;

-- Ensure profile owners keep managing only their own record.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Restrict plan application visibility to the applicant, plan owner, or admins.
DROP POLICY IF EXISTS "Anyone can read applications" ON public.plan_applications;
DROP POLICY IF EXISTS "Applicants and plan owners can read applications" ON public.plan_applications;

CREATE POLICY "Applicants and plan owners can read applications"
ON public.plan_applications
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.hiking_plans hp
    WHERE hp.id = plan_applications.plan_id
      AND hp.creator_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

COMMIT;