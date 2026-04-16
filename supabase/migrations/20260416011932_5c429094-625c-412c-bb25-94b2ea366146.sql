ALTER TABLE public.summit_claims
ADD COLUMN ai_verified boolean DEFAULT NULL,
ADD COLUMN ai_confidence integer DEFAULT NULL;