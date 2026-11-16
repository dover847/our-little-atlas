-- Shared Atlas profile pictures belong to individual authenticated members.
-- Images themselves stay in the existing private atlas-shared-media bucket.
create table if not exists public.atlas_profile_photos (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_path text not null,
  updated_at timestamptz not null default now(),
  primary key (space_id,user_id),
  constraint atlas_profile_photos_owned_path check (
    photo_path ~ ('^spaces/' || space_id::text || '/profiles/' || user_id::text || '/[a-zA-Z0-9_-]+\.(jpg|png|webp)$')
  )
);
alter table public.atlas_profile_photos enable row level security;
revoke all on public.atlas_profile_photos from anon;
grant select,insert,update,delete on public.atlas_profile_photos to authenticated;
create policy "Members can see profile photo references" on public.atlas_profile_photos for select to authenticated using
(exists(select 1 from public.space_memberships m where m.space_id=atlas_profile_photos.space_id and m.user_id=(select auth.uid())));
create policy "Members can set only their own profile photo" on public.atlas_profile_photos for insert to authenticated
with check (user_id=(select auth.uid()) and exists(select 1 from public.space_memberships m where m.space_id=atlas_profile_photos.space_id and m.user_id=(select auth.uid())));
create policy "Members can update only their own profile photo" on public.atlas_profile_photos for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.space_memberships m where m.space_id=atlas_profile_photos.space_id and m.user_id=(select auth.uid())));
create policy "Members can delete only their own profile photo" on public.atlas_profile_photos for delete to authenticated
using(user_id=(select auth.uid()));
