drop view if exists public.public_profiles;

drop view if exists public.profiles_public;

create table if not exists public.public_profiles (
  user_id uuid primary key,
  nickname text,
  avatar_url text,
  bio text,
  location text,
  hiking_styles text[],
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

alter table public.public_profiles enable row level security;

create or replace function public.sync_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.public_profiles where user_id = old.user_id;
    return old;
  end if;

  insert into public.public_profiles (
    user_id,
    nickname,
    avatar_url,
    bio,
    location,
    hiking_styles,
    is_active,
    created_at,
    updated_at
  )
  values (
    new.user_id,
    new.nickname,
    new.avatar_url,
    new.bio,
    new.location,
    new.hiking_styles,
    new.is_active,
    new.created_at,
    new.updated_at
  )
  on conflict (user_id) do update
  set
    nickname = excluded.nickname,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio,
    location = excluded.location,
    hiking_styles = excluded.hiking_styles,
    is_active = excluded.is_active,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists sync_public_profile_on_profiles on public.profiles;
create trigger sync_public_profile_on_profiles
after insert or update or delete on public.profiles
for each row
execute function public.sync_public_profile();

insert into public.public_profiles (
  user_id,
  nickname,
  avatar_url,
  bio,
  location,
  hiking_styles,
  is_active,
  created_at,
  updated_at
)
select
  user_id,
  nickname,
  avatar_url,
  bio,
  location,
  hiking_styles,
  is_active,
  created_at,
  updated_at
from public.profiles
on conflict (user_id) do update
set
  nickname = excluded.nickname,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  location = excluded.location,
  hiking_styles = excluded.hiking_styles,
  is_active = excluded.is_active,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

drop policy if exists "Anyone can read public profiles" on public.public_profiles;
drop policy if exists "Anyone can read safe public profiles" on public.public_profiles;
drop policy if exists "Users can read own public profile mirror" on public.public_profiles;
create policy "Anyone can read safe public profiles"
on public.public_profiles
for select
to public
using (true);

drop policy if exists "Anyone can read profiles public info" on public.profiles;
drop policy if exists "Enable users to view their own data only" on public.profiles;
create policy "Users can read own private profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.can_access_plan(_plan_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hiking_plans hp
    where hp.id = _plan_id
      and (
        coalesce(hp.is_public, true) = true
        or hp.creator_id = _user_id
        or (
          hp.group_id is not null
          and exists (
            select 1
            from public.group_members gm
            where gm.group_id = hp.group_id
              and gm.user_id = _user_id
          )
        )
        or exists (
          select 1
          from public.plan_participants pp
          where pp.plan_id = hp.id
            and pp.user_id = _user_id
        )
        or exists (
          select 1
          from public.plan_applications pa
          where pa.plan_id = hp.id
            and pa.user_id = _user_id
            and coalesce(pa.status, 'pending') in ('pending', 'approved')
        )
      )
  );
$$;

drop policy if exists "Anyone can read public plans" on public.hiking_plans;
create policy "Users can read accessible plans"
on public.hiking_plans
for select
to public
using (public.can_access_plan(id, auth.uid()));

drop policy if exists "Users can view plan participants" on public.plan_participants;
create policy "Users can view accessible plan participants"
on public.plan_participants
for select
to authenticated
using (public.can_access_plan(plan_id, auth.uid()));

drop policy if exists "Anyone can read climbs" on public.climbs;
create policy "Users can read own climbs"
on public.climbs
for select
to authenticated
using (auth.uid() = user_id);