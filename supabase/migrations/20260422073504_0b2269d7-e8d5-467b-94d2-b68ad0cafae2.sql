
ALTER TABLE user_challenges 
ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMPTZ;

ALTER TABLE user_challenges
ADD COLUMN IF NOT EXISTS abandon_reason TEXT;
