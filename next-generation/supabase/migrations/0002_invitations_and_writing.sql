-- Additive preview migration. All historical application data stays on Render.
create schema atlas_private;
revoke all on schema atlas_private from public, anon, authenticated;
create table atlas_private.first_owners (
  email text primary key check (email = lower(email)),
  provisioned_at timestamptz not null default now()
);

create function public.create_first_space(space_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare person uuid := auth.uid(); person_email text; result uuid;
begin
  select lower(email) into person_email from auth.users
    where id = person and email_confirmed_at is not null;
  if person_email is null or not exists (select 1 from atlas_private.first_owners where email = person_email)
    then raise exception 'Verified first-owner access required' using errcode = '42501'; end if;
  if char_length(trim(space_name)) not between 1 and 120 then raise exception 'Invalid space name'; end if;
  -- Serialize setup by identity: refresh/retry never creates duplicate worlds.
  perform pg_advisory_xact_lock(hashtext(person::text));
  select id into result from public.spaces where owner_id = person order by created_at limit 1;
  if result is not null then return result; end if;
  insert into public.spaces(name, owner_id) values (trim(space_name), person) returning id into result;
  insert into public.space_memberships(space_id,user_id,role) values(result,person,'owner');
  return result;
end;
$$;
revoke all on function public.create_first_space(text) from public, anon;
grant execute on function public.create_first_space(text) to authenticated;

create table public.space_invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id),
  recipient_email text not null check (char_length(recipient_email) between 3 and 254 and recipient_email = lower(recipient_email)),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  revoked_at timestamptz
);
create index space_invitations_space_idx on public.space_invitations(space_id,created_at);
alter table public.space_invitations enable row level security;
create policy owner_reads_invitations on public.space_invitations for select to authenticated using (
  exists(select 1 from public.spaces where id=space_id and owner_id=(select auth.uid()))
);
revoke all on public.space_invitations from anon, authenticated;
grant select(id,space_id,recipient_email,created_at,expires_at,accepted_at,revoked_at) on public.space_invitations to authenticated;

create function public.create_space_invitation(target_space uuid, recipient text, secret_hash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; person uuid := auth.uid();
begin
  perform 1 from public.spaces where id=target_space and owner_id=person for update;
  if not found then raise exception 'Space owner required' using errcode='42501'; end if;
  if recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(recipient)>254
    or secret_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation'; end if;
  if (select count(*) from public.space_invitations where space_id=target_space and created_at>now()-interval '1 day')>=20
    then raise exception 'Invitation limit reached'; end if;
  insert into public.space_invitations(space_id,recipient_email,token_hash,created_by)
    values(target_space,lower(trim(recipient)),secret_hash,person) returning id into result;
  return result;
end;
$$;

create function public.accept_space_invitation(invitation_secret text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation public.space_invitations; person uuid := auth.uid(); person_email text;
begin
  if invitation_secret !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'Invitation unavailable'; end if;
  select lower(email) into person_email from auth.users where id=person and email_confirmed_at is not null;
  select * into invitation from public.space_invitations
    where token_hash=encode(extensions.digest(invitation_secret,'sha256'),'hex') for update;
  if person_email is null or invitation.id is null or invitation.recipient_email<>person_email
    or invitation.accepted_at is not null or invitation.revoked_at is not null or invitation.expires_at<=now()
    then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  insert into public.space_memberships(space_id,user_id,role) values(invitation.space_id,person,'member')
    on conflict do nothing;
  update public.space_invitations set accepted_at=now(),accepted_by=person where id=invitation.id;
  return invitation.space_id;
end;
$$;

create function public.revoke_space_invitation(invitation_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.space_invitations set revoked_at=now() where id=invitation_id and accepted_at is null
    and exists(select 1 from public.spaces where id=space_id and owner_id=auth.uid());
  if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
end;
$$;
revoke all on function public.create_space_invitation(uuid,text,text), public.accept_space_invitation(text), public.revoke_space_invitation(uuid) from public,anon;
grant execute on function public.create_space_invitation(uuid,text,text), public.accept_space_invitation(text), public.revoke_space_invitation(uuid) to authenticated;

-- Registration can send verification only for the email bound to a live secret.
-- This grants no membership and reveals no invitation metadata.
create function public.can_register_for_invitation(invitation_secret text, recipient text) returns boolean
language sql stable security definer set search_path = '' as $$
  select invitation_secret ~ '^[A-Za-z0-9_-]{43}$' and exists(
    select 1 from public.space_invitations where token_hash=encode(extensions.digest(invitation_secret,'sha256'),'hex')
      and recipient_email=lower(trim(recipient)) and accepted_at is null and revoked_at is null and expires_at>now()
  );
$$;
revoke all on function public.can_register_for_invitation(text,text) from public;
grant execute on function public.can_register_for_invitation(text,text) to anon,authenticated;

create table public.writing_entries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id),
  author_id uuid not null default auth.uid() references auth.users(id),
  title text not null default '' check(char_length(title)<=120),
  body text not null check(char_length(body) between 1 and 10000 and char_length(trim(body))>0),
  kind text not null default 'Reflection' check(kind in ('Memory','Letter','Reflection','Poem','Question','Gratitude','Interpretation')),
  visibility text not null default 'private' check(visibility in ('private','shared')),
  version integer not null default 1 check(version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index writing_entries_space_idx on public.writing_entries(space_id,created_at desc);
create index writing_entries_author_idx on public.writing_entries(author_id);
alter table public.writing_entries enable row level security;
create policy writing_read on public.writing_entries for select to authenticated using (
  public.is_space_member(space_id) and (author_id=(select auth.uid()) or visibility='shared')
);
create policy writing_create on public.writing_entries for insert to authenticated with check (
  public.is_space_member(space_id) and author_id=(select auth.uid()) and version=1
);
create policy writing_edit on public.writing_entries for update to authenticated using (
  public.is_space_member(space_id) and author_id=(select auth.uid())
) with check (public.is_space_member(space_id) and author_id=(select auth.uid()));
revoke all on public.writing_entries from anon,authenticated;
grant select on public.writing_entries to authenticated;
grant insert(space_id,title,body,kind,visibility) on public.writing_entries to authenticated;
grant update(title,body,kind,visibility) on public.writing_entries to authenticated;

create table public.writing_revisions (
  entry_id uuid not null references public.writing_entries(id),
  version integer not null,
  author_id uuid not null references auth.users(id),
  title text not null, body text not null, kind text not null, visibility text not null,
  recorded_at timestamptz not null default now(),
  primary key(entry_id,version)
);
alter table public.writing_revisions enable row level security;
-- Earlier private drafts never become visible when the current entry is shared.
create policy revisions_author_only on public.writing_revisions for select to authenticated using (
  author_id=(select auth.uid()) and exists(select 1 from public.writing_entries e
    where e.id=entry_id and public.is_space_member(e.space_id))
);
revoke all on public.writing_revisions from anon,authenticated;
grant select on public.writing_revisions to authenticated;

create function atlas_private.keep_writing_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.author_id<>old.author_id or new.space_id<>old.space_id or new.created_at<>old.created_at
    then raise exception 'Writing ownership is immutable'; end if;
  insert into public.writing_revisions(entry_id,version,author_id,title,body,kind,visibility)
    values(old.id,old.version,old.author_id,old.title,old.body,old.kind,old.visibility);
  new.version:=old.version+1;
  new.updated_at:=now();
  return new;
end;
$$;
revoke all on function atlas_private.keep_writing_revision() from public,anon,authenticated;
create trigger writing_revision before update on public.writing_entries
  for each row execute function atlas_private.keep_writing_revision();
