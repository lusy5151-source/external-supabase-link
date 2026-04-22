create or replace view public.public_profiles as
select
  id,
  user_id,
  nickname,
  avatar_url,
  bio,
  location,
  hiking_styles,
  is_active,
  created_at,
  updated_at
from public.profiles;

revoke all on table public.public_profiles from public;
grant select on table public.public_profiles to anon, authenticated;

alter view public.public_profiles set (security_barrier = true);

drop policy if exists "Public can view safe profile fields" on public.profiles;

drop policy if exists "Anyone can view photos" on storage.objects;
drop policy if exists "Users can upload photos" on storage.objects;
drop policy if exists "Users can delete own photos" on storage.objects;

create policy "Public read journal-photos"
on storage.objects
for select
to public
using (bucket_id = 'journal-photos');

create policy "Users upload own journal-photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'journal-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users delete own journal-photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'journal-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);