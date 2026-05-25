
-- =========================================================
-- PROFILES
-- =========================================================
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update profiles for all" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

CREATE POLICY "Public can read profiles"
ON public.profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.is_admin());

-- Prevent role self-escalation
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('role', true) <> 'service_role' AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Not allowed to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

-- Recreate profiles_safe view without SECURITY DEFINER
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_invoker = true) AS
SELECT id, user_id, nickname, bio, location, avatar_url, hiking_styles,
       created_at, updated_at, provider, is_active, role
FROM public.profiles;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =========================================================
-- ACHIEVEMENTS / USER_ACHIEVEMENTS / XP_LOG
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read achievements" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can insert achievements" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can update achievements" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can delete achievements" ON public.achievements;

CREATE POLICY "Users read own achievements" ON public.achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own achievements" ON public.achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own achievements" ON public.achievements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own achievements" ON public.achievements FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Anyone can read user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Anyone can insert user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Anyone can update user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Anyone can delete user_achievements" ON public.user_achievements;

CREATE POLICY "Users read own user_achievements" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own user_achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own user_achievements" ON public.user_achievements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own user_achievements" ON public.user_achievements FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all xp_log" ON public.xp_log;
CREATE POLICY "Users read own xp_log" ON public.xp_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own xp_log" ON public.xp_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- USER_CHALLENGES / USER_MOUNTAIN_CHALLENGES
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read user_challenges" ON public.user_challenges;
DROP POLICY IF EXISTS "Anyone can insert user_challenges" ON public.user_challenges;
DROP POLICY IF EXISTS "Anyone can update user_challenges" ON public.user_challenges;
DROP POLICY IF EXISTS "Anyone can delete user_challenges" ON public.user_challenges;

CREATE POLICY "Users read own user_challenges" ON public.user_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own user_challenges" ON public.user_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own user_challenges" ON public.user_challenges FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own user_challenges" ON public.user_challenges FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read user_mountain_challenges" ON public.user_mountain_challenges;
DROP POLICY IF EXISTS "Anyone can insert user_mountain_challenges" ON public.user_mountain_challenges;
DROP POLICY IF EXISTS "Anyone can update user_mountain_challenges" ON public.user_mountain_challenges;
DROP POLICY IF EXISTS "Anyone can delete user_mountain_challenges" ON public.user_mountain_challenges;

CREATE POLICY "Users read own ummc" ON public.user_mountain_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ummc" ON public.user_mountain_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ummc" ON public.user_mountain_challenges FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ummc" ON public.user_mountain_challenges FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- HIKING_GROUP / GROUP_INVITATIONS
-- =========================================================
DROP POLICY IF EXISTS "Anyone can create groups" ON public.hiking_group;
DROP POLICY IF EXISTS "Anyone can update groups" ON public.hiking_group;
DROP POLICY IF EXISTS "Anyone can delete groups" ON public.hiking_group;

CREATE POLICY "Users create own groups" ON public.hiking_group FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator updates own group" ON public.hiking_group FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator deletes own group" ON public.hiking_group FOR DELETE TO authenticated USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Anyone can read group_invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Anyone can insert group_invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Anyone can update group_invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Anyone can delete group_invitations" ON public.group_invitations;

CREATE POLICY "Inviter or invitee read invitations" ON public.group_invitations FOR SELECT TO authenticated USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
CREATE POLICY "Inviter creates invitations" ON public.group_invitations FOR INSERT TO authenticated WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Inviter or invitee updates invitation" ON public.group_invitations FOR UPDATE TO authenticated USING (auth.uid() = invitee_id OR auth.uid() = inviter_id) WITH CHECK (auth.uid() = invitee_id OR auth.uid() = inviter_id);
CREATE POLICY "Inviter deletes invitation" ON public.group_invitations FOR DELETE TO authenticated USING (auth.uid() = inviter_id);

-- =========================================================
-- HIKING_JOURNALS
-- =========================================================
DROP POLICY IF EXISTS "Anyone can insert journals" ON public.hiking_journals;
DROP POLICY IF EXISTS "Anyone can update journals" ON public.hiking_journals;
DROP POLICY IF EXISTS "Anyone can delete journals" ON public.hiking_journals;

CREATE POLICY "Users insert own journals" ON public.hiking_journals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own journals" ON public.hiking_journals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own journals" ON public.hiking_journals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- HIKING_PLANS  (public plans readable by everyone, incl. anon)
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read plans" ON public.hiking_plans;
DROP POLICY IF EXISTS "Anyone can create plans" ON public.hiking_plans;
DROP POLICY IF EXISTS "Anyone can update plans" ON public.hiking_plans;
DROP POLICY IF EXISTS "Anyone can delete plans" ON public.hiking_plans;

CREATE POLICY "Public plans readable by anyone"
ON public.hiking_plans FOR SELECT TO public
USING (coalesce(is_public, false) = true);

CREATE POLICY "Authenticated read accessible plans"
ON public.hiking_plans FOR SELECT TO authenticated
USING (auth.uid() = creator_id OR public.can_access_plan(id, auth.uid()));

CREATE POLICY "Users create own plans" ON public.hiking_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator updates plan" ON public.hiking_plans FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator deletes plan" ON public.hiking_plans FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- =========================================================
-- PLAN_PARTICIPANTS  (visible on public plans to anyone)
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read plan_participants" ON public.plan_participants;
DROP POLICY IF EXISTS "Anyone can insert plan_participants" ON public.plan_participants;
DROP POLICY IF EXISTS "Anyone can update plan_participants" ON public.plan_participants;
DROP POLICY IF EXISTS "Anyone can delete plan_participants" ON public.plan_participants;

CREATE POLICY "Public-plan participants readable by anyone"
ON public.plan_participants FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND coalesce(p.is_public, false) = true));

CREATE POLICY "Auth participants of accessible plans read"
ON public.plan_participants FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.can_access_plan(plan_id, auth.uid()));

CREATE POLICY "User joins as self or creator adds"
ON public.plan_participants FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));

CREATE POLICY "User or creator updates participation"
ON public.plan_participants FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));

CREATE POLICY "User leaves or creator removes"
ON public.plan_participants FOR DELETE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));

-- =========================================================
-- PLAN_NOTIFICATIONS
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read plan_notifications" ON public.plan_notifications;
DROP POLICY IF EXISTS "Anyone can insert plan_notifications" ON public.plan_notifications;
DROP POLICY IF EXISTS "Anyone can update plan_notifications" ON public.plan_notifications;
DROP POLICY IF EXISTS "Anyone can delete plan_notifications" ON public.plan_notifications;

CREATE POLICY "Recipient or creator reads plan_notifications"
ON public.plan_notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));
CREATE POLICY "Creator inserts plan_notifications"
ON public.plan_notifications FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));
CREATE POLICY "Recipient or creator updates plan_notifications"
ON public.plan_notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));
CREATE POLICY "Creator deletes plan_notifications"
ON public.plan_notifications FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));

-- =========================================================
-- PLAN_APPLICATIONS  (counts visible on public plans)
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read plan_applications" ON public.plan_applications;
DROP POLICY IF EXISTS "Anyone can insert plan_applications" ON public.plan_applications;
DROP POLICY IF EXISTS "Anyone can update plan_applications" ON public.plan_applications;
DROP POLICY IF EXISTS "Anyone can delete plan_applications" ON public.plan_applications;

CREATE POLICY "Public-plan applications readable by anyone"
ON public.plan_applications FOR SELECT TO public
USING (EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND coalesce(p.is_public, false) = true));

CREATE POLICY "Auth read own or creator applications"
ON public.plan_applications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));

CREATE POLICY "User applies as self"
ON public.plan_applications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creator or applicant updates application"
ON public.plan_applications FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));

CREATE POLICY "Applicant withdraws or creator removes"
ON public.plan_applications FOR DELETE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.hiking_plans p WHERE p.id = plan_id AND p.creator_id = auth.uid()));

-- =========================================================
-- SUMMIT_CLAIMS  (public SELECT preserved for live feed)
-- =========================================================
DROP POLICY IF EXISTS "Anyone can insert summit claims" ON public.summit_claims;
DROP POLICY IF EXISTS "Anyone can delete summit claims" ON public.summit_claims;

CREATE POLICY "Users insert own summit_claims"
ON public.summit_claims FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own summit_claims"
ON public.summit_claims FOR DELETE TO authenticated
USING (auth.uid() = user_id);
-- NOTE: existing "Anyone can read summit claims" SELECT policy is intentionally kept
-- so the live summit feed remains visible to all (including anonymous) visitors.

-- =========================================================
-- STORAGE POLICIES
-- =========================================================
DROP POLICY IF EXISTS "Anyone upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone upload club-logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone update club-logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone delete club-logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone upload journal-photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone update journal-photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone upload summit-photos" ON storage.objects;

CREATE POLICY "Users upload own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth upload club-logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'club-logos' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Auth update club-logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'club-logos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'club-logos' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Auth delete club-logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'club-logos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own journal-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'journal-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own journal-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'journal-photos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'journal-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own summit-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'summit-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- =========================================================
-- ENABLE RLS ON REFERENCE TABLES (public read-only)
-- =========================================================
ALTER TABLE public.hiking_center_peaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osm_peaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osm_trail_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_safety_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_starting_points_geocoded ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trails_name_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vworld_trail_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_code_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hiking_center_peaks" ON public.hiking_center_peaks FOR SELECT TO public USING (true);
CREATE POLICY "Public read osm_peaks" ON public.osm_peaks FOR SELECT TO public USING (true);
CREATE POLICY "Public read osm_trail_segments" ON public.osm_trail_segments FOR SELECT TO public USING (true);
CREATE POLICY "Public read trail_safety_spots" ON public.trail_safety_spots FOR SELECT TO public USING (true);
CREATE POLICY "Public read trail_starting_points_geocoded" ON public.trail_starting_points_geocoded FOR SELECT TO public USING (true);
CREATE POLICY "Public read vworld_trail_segments" ON public.vworld_trail_segments FOR SELECT TO public USING (true);
CREATE POLICY "Public read weather_code_map" ON public.weather_code_map FOR SELECT TO public USING (true);
