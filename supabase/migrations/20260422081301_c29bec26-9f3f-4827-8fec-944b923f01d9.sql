-- ============================================================
-- 1. Enable RLS on ALL tables that have it disabled
-- ============================================================

-- Tables with existing policies
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiking_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mountains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_completion_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Internal/admin tables (service role only)
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forestry_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

-- Public reference data tables
ALTER TABLE public.bac100_mountains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mountain_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_parks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_safety_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_trail_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.np_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_coordinates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walking_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walking_path_courses ENABLE ROW LEVEL SECURITY;

-- User data tables needing policies
ALTER TABLE public.club_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mountain_duplicate_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mountain_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Add missing SELECT policies for public reference data
-- ============================================================

CREATE POLICY "Anyone can read bac100_mountains" ON public.bac100_mountains FOR SELECT USING (true);
CREATE POLICY "Anyone can read mountain_facilities" ON public.mountain_facilities FOR SELECT USING (true);
CREATE POLICY "Anyone can read national_parks" ON public.national_parks FOR SELECT USING (true);
CREATE POLICY "Anyone can read np_facilities" ON public.np_facilities FOR SELECT USING (true);
CREATE POLICY "Anyone can read np_safety_zones" ON public.np_safety_zones FOR SELECT USING (true);
CREATE POLICY "Anyone can read np_trail_restrictions" ON public.np_trail_restrictions FOR SELECT USING (true);
CREATE POLICY "Anyone can read np_trails" ON public.np_trails FOR SELECT USING (true);
CREATE POLICY "Anyone can read trail_closures" ON public.trail_closures FOR SELECT USING (true);
CREATE POLICY "Anyone can read trail_coordinates" ON public.trail_coordinates FOR SELECT USING (true);
CREATE POLICY "Anyone can read walking_paths" ON public.walking_paths FOR SELECT USING (true);
CREATE POLICY "Anyone can read walking_path_courses" ON public.walking_path_courses FOR SELECT USING (true);

-- Also add read policy for trails (existing policies are service_role only for write)
CREATE POLICY "Anyone can read trails" ON public.trails FOR SELECT USING (true);

-- ============================================================
-- 3. Add missing policies for user data tables
-- ============================================================

-- club_messages
CREATE POLICY "Anyone can read club messages" ON public.club_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert own club messages" ON public.club_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own club messages" ON public.club_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- magazine_posts & slides (read-only for public)
CREATE POLICY "Anyone can read magazine posts" ON public.magazine_posts FOR SELECT USING (true);
CREATE POLICY "Anyone can read magazine slides" ON public.magazine_slides FOR SELECT USING (true);

-- magazine_likes
CREATE POLICY "Anyone can read magazine likes" ON public.magazine_likes FOR SELECT USING (true);
CREATE POLICY "Users can like magazine posts" ON public.magazine_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike magazine posts" ON public.magazine_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- magazine_saves
CREATE POLICY "Anyone can read magazine saves" ON public.magazine_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save magazine posts" ON public.magazine_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave magazine posts" ON public.magazine_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- message_reactions
CREATE POLICY "Anyone can read message reactions" ON public.message_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.message_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- message_reads
CREATE POLICY "Users can read own message reads" ON public.message_reads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own message reads" ON public.message_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own message reads" ON public.message_reads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- mountain_duplicate_reports
CREATE POLICY "Users can read own duplicate reports" ON public.mountain_duplicate_reports FOR SELECT TO authenticated USING (auth.uid() = reported_by);
CREATE POLICY "Users can create duplicate reports" ON public.mountain_duplicate_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);

-- user_mountain_challenges
CREATE POLICY "Users can read own mountain challenges" ON public.user_mountain_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mountain challenges" ON public.user_mountain_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mountain challenges" ON public.user_mountain_challenges FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own mountain challenges" ON public.user_mountain_challenges FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_roles (read own only)
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 4. Fix achievements admin role check (privilege escalation)
-- ============================================================

-- Create security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  )
$$;

-- Drop old policies with JWT role check
DROP POLICY IF EXISTS "achievements_delete_owner_or_admin" ON public.achievements;
DROP POLICY IF EXISTS "achievements_select_owner_or_admin" ON public.achievements;
DROP POLICY IF EXISTS "achievements_update_owner_or_admin" ON public.achievements;

-- Recreate with proper role check
CREATE POLICY "achievements_delete_owner_or_admin" ON public.achievements
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "achievements_select_owner_or_admin" ON public.achievements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "achievements_update_owner_or_admin" ON public.achievements
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Fix profiles UPDATE policy (uses id instead of user_id)
-- ============================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. Fix user_challenge_summary view (SECURITY DEFINER -> INVOKER)
-- ============================================================

CREATE OR REPLACE VIEW public.user_challenge_summary
WITH (security_invoker = true)
AS
SELECT user_id,
    challenge_type,
    count(*) FILTER (WHERE is_completed = true) AS completed_count,
    count(*) AS total_attempted,
    CASE
        WHEN challenge_type = 'forestry_100'::challenge_list_type THEN 100
        WHEN challenge_type = 'bac_100'::challenge_list_type THEN 100
        ELSE 100
    END AS total_count,
    min(completed_at) AS first_completed_at,
    max(completed_at) AS last_completed_at
FROM user_mountain_challenges
GROUP BY user_id, challenge_type;

-- ============================================================
-- 7. Add missing INSERT policy for plan_notifications
-- ============================================================

CREATE POLICY "Users can insert plan notifications" ON public.plan_notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. Add missing policies for shared_completion_participants
-- ============================================================

CREATE POLICY "Users can insert shared completion participants" ON public.shared_completion_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);