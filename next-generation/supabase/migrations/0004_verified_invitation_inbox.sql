-- Email verification is itself proof of control of the named recipient address.
-- This lets emailed account invitations lead to an explicit in-app acceptance,
-- without storing raw space invitation tokens in Auth metadata or email logs.
create function public.my_pending_invitations()
returns table(id uuid,space_name text,expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select i.id,s.name,i.expires_at from public.space_invitations i
 join public.spaces s on s.id=i.space_id
 join auth.users u on u.id=auth.uid() and u.email_confirmed_at is not null
 where i.recipient_email=lower(u.email) and i.accepted_at is null and i.revoked_at is null and i.expires_at>now()
 order by i.created_at desc;
$$;
create function public.accept_email_invitation(invitation_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation public.space_invitations; person uuid := auth.uid(); person_email text;
begin
 select lower(email) into person_email from auth.users where id=person and email_confirmed_at is not null;
 select * into invitation from public.space_invitations where id=invitation_id for update;
 if person_email is null or invitation.id is null or invitation.recipient_email<>person_email
   or invitation.accepted_at is not null or invitation.revoked_at is not null or invitation.expires_at<=now()
   then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 insert into public.space_memberships(space_id,user_id,role) values(invitation.space_id,person,'member') on conflict do nothing;
 update public.space_invitations set accepted_at=now(),accepted_by=person where id=invitation.id;
 return invitation.space_id;
end;
$$;
revoke all on function public.my_pending_invitations(),public.accept_email_invitation(uuid) from public,anon;
grant execute on function public.my_pending_invitations(),public.accept_email_invitation(uuid) to authenticated;
