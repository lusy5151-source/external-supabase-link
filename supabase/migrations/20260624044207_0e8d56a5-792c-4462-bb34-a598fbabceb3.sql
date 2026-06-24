ALTER TABLE public.magazine_content_blocks ADD COLUMN IF NOT EXISTS mountain_id integer;
ALTER TABLE public.magazine_content_blocks ADD COLUMN IF NOT EXISTS body_html text;