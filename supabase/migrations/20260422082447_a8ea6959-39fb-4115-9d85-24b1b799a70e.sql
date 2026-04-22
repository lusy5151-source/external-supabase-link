-- ============================================================
-- 1. Fix plan_applications overpermissive UPDATE
-- ============================================================

DROP POLICY IF EXISTS "Users can update applications" ON public.plan_applications;

CREATE POLICY "Plan owner can update applications" ON public.plan_applications
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IN (
      SELECT creator_id FROM public.hiking_plans WHERE id = plan_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT creator_id FROM public.hiking_plans WHERE id = plan_id
    )
  );

-- ============================================================
-- 2. Add admin policies for reports table
-- ============================================================

CREATE POLICY "Admins can read all reports" ON public.reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. Add admin write policies for announcements
-- ============================================================

CREATE POLICY "Admins can insert announcements" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update announcements" ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete announcements" ON public.announcements
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. Fix function search_path on mutable functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, user_id, nickname, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.nickname, split_part(NEW.email, '@', 1)),
    NEW.profile_image,
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_challenge_progress_on_summit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_challenge RECORD;
  v_progress INTEGER;
  v_mountain_is_bac100 BOOLEAN;
  v_mountain_is_np BOOLEAN;
  v_mountain_height INTEGER;
BEGIN
  SELECT is_bac100, is_national_park, height
  INTO v_mountain_is_bac100, v_mountain_is_np, v_mountain_height
  FROM mountains
  WHERE id = NEW.mountain_id;

  FOR v_challenge IN
    SELECT uc.id, uc.challenge_id, uc.progress, uc.completed, c.goal_type, c.goal_value
    FROM user_challenges uc
    JOIN challenges c ON c.id = uc.challenge_id
    WHERE uc.user_id = NEW.user_id
      AND (uc.completed IS NULL OR uc.completed = false)
  LOOP
    v_progress := NULL;

    IF v_challenge.goal_type = 'mountain' THEN
      SELECT COUNT(*) INTO v_progress
      FROM summit_claims
      WHERE user_id = NEW.user_id;

    ELSIF v_challenge.goal_type = 'bac100' THEN
      SELECT COUNT(DISTINCT sc.mountain_id) INTO v_progress
      FROM summit_claims sc
      JOIN mountains m ON m.id = sc.mountain_id
      WHERE sc.user_id = NEW.user_id
        AND m.is_bac100 = true;

    ELSIF v_challenge.goal_type = 'national_park' THEN
      SELECT COUNT(DISTINCT sc.mountain_id) INTO v_progress
      FROM summit_claims sc
      JOIN mountains m ON m.id = sc.mountain_id
      WHERE sc.user_id = NEW.user_id
        AND m.is_national_park = true;

    ELSIF v_challenge.goal_type = 'single_elevation' THEN
      SELECT COALESCE(MAX(m.height), 0) INTO v_progress
      FROM summit_claims sc
      JOIN mountains m ON m.id = sc.mountain_id
      WHERE sc.user_id = NEW.user_id;

    ELSIF v_challenge.goal_type = 'elevation_total' THEN
      SELECT COALESCE(SUM(m.height), 0) INTO v_progress
      FROM (
        SELECT DISTINCT ON (sc.mountain_id) m.height
        FROM summit_claims sc
        JOIN mountains m ON m.id = sc.mountain_id
        WHERE sc.user_id = NEW.user_id
      ) m;

    ELSIF v_challenge.goal_type = 'monthly_count' THEN
      SELECT COUNT(*) INTO v_progress
      FROM summit_claims
      WHERE user_id = NEW.user_id
        AND date_trunc('month', claimed_at) = date_trunc('month', NOW());

    ELSIF v_challenge.goal_type = 'count' THEN
      SELECT COUNT(*) INTO v_progress
      FROM summit_claims
      WHERE user_id = NEW.user_id;

    END IF;

    IF v_progress IS NOT NULL THEN
      UPDATE user_challenges
      SET 
        progress = v_progress,
        completed = CASE 
          WHEN v_progress >= COALESCE(v_challenge.goal_value, 999999) THEN true
          ELSE false
        END,
        completed_at = CASE 
          WHEN v_progress >= COALESCE(v_challenge.goal_value, 999999) THEN NOW()
          ELSE NULL
        END
      WHERE id = v_challenge.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 5. Fix profiles overly permissive INSERT policy
-- ============================================================

DROP POLICY IF EXISTS "Enable insert for service role" ON public.profiles;
-- Service role bypasses RLS anyway, so this policy is unnecessary