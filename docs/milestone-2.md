# Milestone 2 — invitations and private/shared writing

Implemented November 4, 2026 on `codex/atlas-next-generation`. No production
cutover, main merge, legacy data import or paid service was performed.

Preview: https://atlas-next-generation-etvow1q98-my-little-atlas.vercel.app

## Account setup

- Supabase accepted the two explicitly requested account invitation emails for
  delivery. Inbox receipt and activation are not yet confirmed.
- An empty preview world was prepared for the owner. The invited member has a
  pending invitation, not automatic membership. Joining is a voluntary step.
- Provider email verification was checked before sending and is enabled.
- `/activate` accepts the account-email link, including a paste-the-confirmation-
  link fallback when provider redirect allowlists are not configured. The paste
  flow is tested with real Auth; direct mail-client redirects are not yet verified.
  `/auth/callback` handles PKCE signup callbacks.
- After activation, the invited member sees a pending invitation at `/space` and
  chooses **Accept & join this space**. Only the verified intended email can join.
- Vercel Authentication still protects the preview. A deployment-scoped guest
  grant was requested for the explicitly invited member email. It has not been
  tested as that person. It is not team membership or project admin access.
  Vercel sign-in may be needed before the Atlas account sign-in.
- Actual addresses and setup reports stay in ignored local state and the preview
  provider, not in source control. No service-role client is used by app routes.

## Writing and permissions

- Server-verified individual identity; HttpOnly, SameSite=Lax session cookies,
  with Secure cookies on HTTPS deployments.
- Private writing by default. Sharing requires an explicit choice. A space owner
  cannot read another member's private page. Only authors can edit their pages.
- Server validation and database RLS independently check identity and membership.
  Ownership columns cannot be written by authenticated clients.
- Stale edits cannot overwrite a newer version. Controlled form state retains
  unsaved words after errors; refreshed props do not replace an active draft or
  advance its edit version. Retried creates use unique per-author request IDs.
- A database trigger preserves earlier versions. These remain author-only even
  after the current page becomes shared. Authors can browse up to five recent
  revisions per page; older revisions remain stored. The current view loads up to
  200 revisions across its pages.
- The studio displays the latest 100 visible pages. Pagination is a later step.
- There are no destructive page-delete controls or data-deleting migrations.
- This is author-owned writing, not simultaneous collaborative editing.

## Invitations

- Owners generate recipient-bound links and revoke pending invitations. Creating
  a link does not send email. Secrets are shown once, stored as SHA-256, and carried
  in a URL fragment removed after loading.
- Secret links and a verified-email invitation inbox are supported. Postgres
  enforces email binding, expiry, revocation, member-only role and single use.
- Acceptance locks the invitation row. Members cannot mint invitations or promote
  themselves. Raw space secrets are not stored in Auth metadata.
- Account confirmation can be requested from a live invitation for its intended
  email. Supabase handles verification and auth rate limits. Registering an Auth
  account alone does not grant access to any space.

## Verification

- 8 unit tests: catalog/wheel, snapshot inspection, writing/email validation and
  private-by-default behavior.
- 10 local desktop/mobile Chromium tests with real preview Auth enabled, including
  activation, sign-in, owner setup, wrong-recipient denial, both invitation flows,
  private/shared writing, author protection, cross-space denial and stale-edit
  rejection with unsaved text retained.
- Real database tests cover owner allowlisting and verification, recipient binding,
  expiry, revocation, replay, inbox isolation, anonymous denial, self-enrollment
  denial, private drafts/revisions, ownership, duplicate creates, stale versions,
  membership loss and denied deletes. SQL fixtures always roll back.
- Auth browser tests use uniquely named `example.invalid` accounts, remove exactly
  those fixtures, and send no invitation emails. They require explicit opt-in and
  are skipped in secret-free CI.
- TypeScript and optimized Next build pass. The original app's 21 legacy tests
  remain unchanged. The deployed activation page returns 200; Preview is Ready.

## Remaining work

Custom decks and shared spin history; weather/understanding tools; private media,
capsules and gallery; pagination; formal accessibility/performance review;
production backup/restore; migration rehearsal and release approval. Original
Render memories remain authoritative and untouched.
