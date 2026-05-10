
DROP POLICY IF EXISTS "Auth upload club-logos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own club-logos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own club-logos" ON storage.objects;

CREATE POLICY "Group leaders upload club-logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'club-logos'
  AND EXISTS (
    SELECT 1 FROM public.hiking_group hg
    WHERE hg.id::text = (storage.foldername(name))[1]
      AND hg.creator_id = auth.uid()
  )
);

CREATE POLICY "Group leaders update club-logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'club-logos'
  AND EXISTS (
    SELECT 1 FROM public.hiking_group hg
    WHERE hg.id::text = (storage.foldername(name))[1]
      AND hg.creator_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'club-logos'
  AND EXISTS (
    SELECT 1 FROM public.hiking_group hg
    WHERE hg.id::text = (storage.foldername(name))[1]
      AND hg.creator_id = auth.uid()
  )
);

CREATE POLICY "Group leaders delete club-logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'club-logos'
  AND EXISTS (
    SELECT 1 FROM public.hiking_group hg
    WHERE hg.id::text = (storage.foldername(name))[1]
      AND hg.creator_id = auth.uid()
  )
);
