CREATE TRIGGER trg_update_challenge_on_summit
AFTER INSERT ON public.summit_claims
FOR EACH ROW
EXECUTE FUNCTION public.update_challenge_progress_on_summit();