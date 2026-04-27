ALTER TABLE public.hiking_journals
ADD COLUMN IF NOT EXISTS mountain_ids integer[];

CREATE INDEX IF NOT EXISTS idx_hiking_journals_mountain_ids
ON public.hiking_journals USING GIN (mountain_ids);