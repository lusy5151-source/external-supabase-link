
-- STEP 1: Create the trigger function
CREATE OR REPLACE FUNCTION public.update_challenge_progress_on_summit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_summit_count INTEGER;
BEGIN
  -- Count total summit claims for this user
  SELECT COUNT(*) INTO v_summit_count
  FROM summit_claims
  WHERE user_id = NEW.user_id;

  -- Find all active challenges for this user where goal_type is summit-based
  FOR v_challenge IN
    SELECT uc.id, uc.challenge_id, uc.progress, uc.completed, c.goal_value
    FROM user_challenges uc
    JOIN challenges c ON c.id = uc.challenge_id
    WHERE uc.user_id = NEW.user_id
      AND (uc.completed IS NULL OR uc.completed = false)
      AND c.goal_type = 'summit_count'
  LOOP
    UPDATE user_challenges
    SET 
      progress = v_summit_count,
      completed = CASE 
        WHEN v_summit_count >= COALESCE(v_challenge.goal_value, 999999) THEN true
        ELSE false
      END,
      completed_at = CASE 
        WHEN v_summit_count >= COALESCE(v_challenge.goal_value, 999999) THEN NOW()
        ELSE NULL
      END
    WHERE id = v_challenge.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- STEP 2: Attach the trigger to summit_claims table
DROP TRIGGER IF EXISTS trigger_update_challenge_on_summit ON summit_claims;

CREATE TRIGGER trigger_update_challenge_on_summit
  AFTER INSERT ON summit_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge_progress_on_summit();
