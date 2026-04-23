create or replace function public.can_access_journal(_journal_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hiking_journals hj
    where hj.id = _journal_id
      and (
        hj.visibility = 'public'
        or (_user_id is not null and hj.user_id = _user_id)
        or (
          _user_id is not null
          and hj.visibility = 'friends'
          and exists (
            select 1
            from public.friendships f
            where f.status = 'accepted'
              and (
                (f.requester_id = _user_id and f.addressee_id = hj.user_id)
                or (f.addressee_id = _user_id and f.requester_id = hj.user_id)
              )
          )
        )
      )
  );
$$;

create or replace function public.can_access_group(_group_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hiking_group hg
    where hg.id = _group_id
      and (
        coalesce(hg.is_public, true) = true
        or (_user_id is not null and hg.creator_id = _user_id)
        or (
          _user_id is not null
          and exists (
            select 1
            from public.group_members gm
            where gm.group_id = hg.id
              and gm.user_id = _user_id
          )
        )
      )
  );
$$;

drop policy if exists "Anyone can read summit_claims" on public.summit_claims;
create policy "Users can read own summit claims"
on public.summit_claims
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Anyone can read user_achievements" on public.user_achievements;
drop policy if exists "Anyone can read achievements" on public.achievements;

drop policy if exists "Anyone can read plan messages" on public.plan_messages;
create policy "Users can read accessible plan messages"
on public.plan_messages
for select
to authenticated
using (public.can_access_plan(plan_id, auth.uid()));

drop policy if exists "Anyone can read edit history" on public.plan_edit_history;
create policy "Users can read accessible plan history"
on public.plan_edit_history
for select
to authenticated
using (public.can_access_plan(plan_id, auth.uid()));

drop policy if exists "Anyone can read comments" on public.journal_comments;
create policy "Users can read comments for visible journals"
on public.journal_comments
for select
to public
using (public.can_access_journal(journal_id, auth.uid()));

drop policy if exists "Anyone can read likes" on public.journal_likes;
create policy "Users can read likes for visible journals"
on public.journal_likes
for select
to public
using (public.can_access_journal(journal_id, auth.uid()));

drop policy if exists "Users can view participants" on public.shared_completion_participants;
create policy "Users can view related completion participants"
on public.shared_completion_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.shared_completion sc
    where sc.id = shared_completion_participants.shared_completion_id
      and (
        sc.created_by = auth.uid()
        or exists (
          select 1
          from public.shared_completion_participants scp
          where scp.shared_completion_id = sc.id
            and scp.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Users can view members" on public.group_members;
create policy "Users can view accessible group members"
on public.group_members
for select
to public
using (public.can_access_group(group_id, auth.uid()));

drop policy if exists "Anyone can read message reactions" on public.message_reactions;
create policy "Users can read reactions for accessible club chats"
on public.message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.club_messages cm
    where cm.id = message_reactions.message_id
      and (
        public.has_role(auth.uid(), 'admin')
        or exists (
          select 1
          from public.group_members gm
          where gm.group_id = cm.club_id
            and gm.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.hiking_group hg
          where hg.id = cm.club_id
            and hg.creator_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Service role can insert profiles" on public.profiles;
create policy "Service role can insert profiles"
on public.profiles
for insert
to authenticated
with check (auth.role() = 'service_role');

update storage.buckets
set public = true
where id = 'club-logos';

drop policy if exists "Public read club-logos" on storage.objects;
create policy "Public read club-logos"
on storage.objects
for select
to public
using (bucket_id = 'club-logos');

create policy "Users update own club-logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'club-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'club-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users delete own club-logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'club-logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Public read summit-photos" on storage.objects;
create policy "Users read own summit-photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'summit-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users delete own summit-photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'summit-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Public read journal-photos" on storage.objects;
create policy "Users read own journal-photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'journal-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);