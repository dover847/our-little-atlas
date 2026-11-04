-- Preview foundation only. No legacy import and no data deletion.
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.space_memberships (
  space_id uuid not null references public.spaces(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index space_memberships_user_idx on public.space_memberships(user_id);
alter table public.spaces enable row level security;
alter table public.space_memberships enable row level security;

-- Avoid recursive policies on membership lookup. Fixed search_path and auth.uid()
-- prevent caller-supplied identity or objects from altering the permission check.
create function public.is_space_member(target_space uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.space_memberships
    where space_id = target_space and user_id = (select auth.uid()));
$$;
revoke all on function public.is_space_member(uuid) from public, anon;
grant execute on function public.is_space_member(uuid) to authenticated;
create policy member_reads_space on public.spaces for select to authenticated
  using (public.is_space_member(id));
create policy member_reads_memberships on public.space_memberships for select to authenticated
  using (public.is_space_member(space_id));

-- Invite acceptance/provisioning is not shipped in milestone one. No client can
-- insert itself into a space or change roles, even with a valid account.
revoke all on public.spaces, public.space_memberships from anon, authenticated;
grant select on public.spaces, public.space_memberships to authenticated;
