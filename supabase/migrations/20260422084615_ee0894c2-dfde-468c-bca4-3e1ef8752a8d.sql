BEGIN;

-- Protect profile email addresses while keeping safe public profile fields readable
REVOKE SELECT (email) ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, nickname, avatar_url, bio, location, hiking_styles, provider, is_active, created_at, updated_at)
ON TABLE public.profiles TO anon, authenticated;

-- Restrict club chat reads to members and admins
DROP POLICY IF EXISTS "Anyone can read club messages" ON public.club_messages;
CREATE POLICY "Club members can read club messages"
ON public.club_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = club_messages.club_id
      AND gm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.hiking_group hg
    WHERE hg.id = club_messages.club_id
      AND hg.creator_id = auth.uid()
  )
);

-- Tighten user mountain visibility and moderation access
DROP POLICY IF EXISTS "Anyone can read user_mountains" ON public.user_mountains;
DROP POLICY IF EXISTS "Users can insert own mountains" ON public.user_mountains;
DROP POLICY IF EXISTS "Users can update own mountains" ON public.user_mountains;
DROP POLICY IF EXISTS "Users can delete own mountains" ON public.user_mountains;

CREATE POLICY "Approved mountains are public and owners can read their own"
ON public.user_mountains
FOR SELECT
TO public
USING (
  status = 'active'
  OR auth.uid() = COALESCE(user_mountains.user_id, user_mountains.created_by)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert own mountains"
ON public.user_mountains
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = COALESCE(user_mountains.user_id, user_mountains.created_by)
);

CREATE POLICY "Owners and admins can update user mountains"
ON public.user_mountains
FOR UPDATE
TO authenticated
USING (
  auth.uid() = COALESCE(user_mountains.user_id, user_mountains.created_by)
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = COALESCE(user_mountains.user_id, user_mountains.created_by)
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Owners and admins can delete user mountains"
ON public.user_mountains
FOR DELETE
TO authenticated
USING (
  auth.uid() = COALESCE(user_mountains.user_id, user_mountains.created_by)
  OR public.has_role(auth.uid(), 'admin')
);

-- Allow admins to review duplicate mountain reports
CREATE POLICY "Admins can read duplicate reports"
ON public.mountain_duplicate_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Lock magazine management to admins while keeping published content readable
CREATE POLICY "Admins can create magazine posts"
ON public.magazine_posts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update magazine posts"
ON public.magazine_posts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete magazine posts"
ON public.magazine_posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create magazine slides"
ON public.magazine_slides
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update magazine slides"
ON public.magazine_slides
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete magazine slides"
ON public.magazine_slides
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin-only read policies to internal operational tables with RLS enabled
CREATE POLICY "Admins can read email send logs"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read email send state"
ON public.email_send_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read unsubscribe tokens"
ON public.email_unsubscribe_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read forestry sync log"
ON public.forestry_sync_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix mutable search_path warning on auth sync function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_id,
    email,
    nickname,
    avatar_url,
    provider,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    nickname = COALESCE(EXCLUDED.nickname, profiles.nickname),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    provider = EXCLUDED.provider,
    updated_at = NOW();

  INSERT INTO public.privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

COMMIT;