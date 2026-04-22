
CREATE OR REPLACE FUNCTION update_challenge_progress_on_summit()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge RECORD;
  v_progress INTEGER;
  v_mountain_is_bac100 BOOLEAN;
  v_mountain_is_np BOOLEAN;
  v_mountain_height INTEGER;
BEGIN
  -- Get mountain info
  SELECT is_bac100, is_national_park, height
  INTO v_mountain_is_bac100, v_mountain_is_np, v_mountain_height
  FROM mountains
  WHERE id = NEW.mountain_id;

  -- Find all active (incomplete) challenges for this user
  FOR v_challenge IN
    SELECT uc.id, uc.challenge_id, uc.progress, uc.completed, c.goal_type, c.goal_value
    FROM user_challenges uc
    JOIN challenges c ON c.id = uc.challenge_id
    WHERE uc.user_id = NEW.user_id
      AND (uc.completed IS NULL OR uc.completed = false)
  LOOP
    v_progress := NULL;

    -- goal_type = 'mountain': count distinct mountains from summit_claims
    IF v_challenge.goal_type = 'mountain' THEN
      SELECT COUNT(DISTINCT mountain_id) INTO v_progress
      FROM summit_claims
      WHERE user_id = NEW.user_id;

    -- goal_type = 'bac100': count distinct bac100 mountains
    ELSIF v_challenge.goal_type = 'bac100' THEN
      SELECT COUNT(DISTINCT sc.mountain_id) INTO v_progress
      FROM summit_claims sc
      JOIN mountains m ON m.id = sc.mountain_id
      WHERE sc.user_id = NEW.user_id
        AND m.is_bac100 = true;

    -- goal_type = 'national_park': count distinct national park mountains
    ELSIF v_challenge.goal_type = 'national_park' THEN
      SELECT COUNT(DISTINCT sc.mountain_id) INTO v_progress
      FROM summit_claims sc
      JOIN mountains m ON m.id = sc.mountain_id
      WHERE sc.user_id = NEW.user_id
        AND m.is_national_park = true;

    -- goal_type = 'single_elevation': max height from claimed mountains
    ELSIF v_challenge.goal_type = 'single_elevation' THEN
      SELECT COALESCE(MAX(m.height), 0) INTO v_progress
      FROM summit_claims sc
      JOIN mountains m ON m.id = sc.mountain_id
      WHERE sc.user_id = NEW.user_id;

    -- goal_type = 'elevation_total': sum of heights from distinct claimed mountains
    ELSIF v_challenge.goal_type = 'elevation_total' THEN
      SELECT COALESCE(SUM(m.height), 0) INTO v_progress
      FROM (
        SELECT DISTINCT ON (sc.mountain_id) m.height
        FROM summit_claims sc
        JOIN mountains m ON m.id = sc.mountain_id
        WHERE sc.user_id = NEW.user_id
      ) m;

    -- goal_type = 'monthly_count': count claims this month
    ELSIF v_challenge.goal_type = 'monthly_count' THEN
      SELECT COUNT(*) INTO v_progress
      FROM summit_claims
      WHERE user_id = NEW.user_id
        AND date_trunc('month', claimed_at) = date_trunc('month', NOW());

    -- goal_type = 'count': total claim count
    ELSIF v_challenge.goal_type = 'count' THEN
      SELECT COUNT(*) INTO v_progress
      FROM summit_claims
      WHERE user_id = NEW.user_id;

    END IF;

    -- Update if we computed a progress value
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
