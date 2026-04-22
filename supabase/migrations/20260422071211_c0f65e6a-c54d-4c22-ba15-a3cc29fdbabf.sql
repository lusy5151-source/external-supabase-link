
UPDATE user_challenges
SET 
  progress = sub.cnt,
  completed = CASE
    WHEN sub.cnt >= COALESCE(c.goal_value, 999999) THEN true
    ELSE false
  END,
  completed_at = CASE
    WHEN sub.cnt >= COALESCE(c.goal_value, 999999) THEN NOW()
    ELSE NULL
  END
FROM (
  SELECT sc.user_id, COUNT(*) as cnt
  FROM summit_claims sc
  GROUP BY sc.user_id
) sub,
challenges c
WHERE user_challenges.user_id = sub.user_id
  AND c.id = user_challenges.challenge_id
  AND c.goal_type = 'summit_count'
  AND (user_challenges.completed IS NULL OR user_challenges.completed = false);
