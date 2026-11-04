# Architecture and delivery plan

## Technology decisions

- **Next.js 16.4.5 App Router, React 19.3.1, TypeScript, Tailwind 4**: typed
  request boundaries, server rendering, and an isolated application directory.
  Exact Next and React versions resolved from npm at implementation time. Read
  the version-matched docs bundled with Next before changing framework code.
- **Radix Dialog + Lucide**: accessible modal primitives and a coherent small icon
  set, with a bespoke editorial visual system. Native buttons/inputs retain labels,
  visible focus and keyboard behavior. Reduced motion is respected.
- **Supabase Postgres/Auth/Storage**: one provider for relational data, verified
  individual accounts, row security and private objects. Matches the owner's
  preferred stack without introducing separate auth/database/media vendors.
- **User-scoped Supabase SSR client**: verified `getUser()` on private server
  boundaries, cookie refresh in Next proxy. No service-role client in app code.
- **Node test runner + Playwright + real Postgres permission checks**: fast pure
  behavior tests, desktop/mobile flows, and database-enforced access tests.
- **Vercel preview deployments + GitHub PR checks**: separate project and database;
  no production release job. The existing Render app remains operational.

Sources: [Next installation](https://nextjs.org/docs/app/getting-started/installation),
[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Boundaries

The public exploration surface contains only original activity prompts and original
educational copy. It has no personal records and makes no memory writes. Its
favorites/theme use versioned browser-local keys, independently of the original
app's preferences. Wheel choices are validated and selected with `crypto.randomInt`.

Private routes revalidate the user with Supabase Auth and then use that account's
JWT for database queries. RLS independently checks membership. Requests cannot
choose an author by sending `who`. Personalized responses use `private, no-store`.
No public sign-up or membership mutation is exposed in milestone one. The sign-in
form works with individually provisioned preview accounts; account invitations
and actual Danny/Mia membership have not been set up or emails sent.

The private-space migration creates only `spaces` and `space_memberships`, with
read-only authenticated grants and no anonymous grants. Controlled invitation
acceptance must precede any client write grants. The preview-only migration runner
verifies project identity, runs in a transaction, records a checksum, refuses
changed applied migrations, and cannot target Render.

## Proposed complete model (not all implemented)

| Entity | Ownership and relationships |
| --- | --- |
| profiles, preferences | User UUID; preferences per user, optional explicit shared theme |
| spaces, memberships | Space UUID, verified membership and owner/member role |
| invitations | Space, intended recipient, single-use hashed token, expiry, consumed timestamp |
| activity_decks, activities | Public seed catalog or a member-owned space deck; stable legacy source ID |
| spins, favorites, activity_notes | Space, verified user, activity/deck; append-only spin history |
| writing_entries, revisions, collaborators | Author, space, default-private visibility; explicit collaborative editing grants |
| weather_entries | User, space, expiry; history preserved without inferring causes |
| mirrors, mirror_responses | Space, expression author, distinct response roles, controlled transitions |
| clarity_threads, clarity_replies | Space, verified authors, timestamps |
| assumption_reflections | Author, explicit visibility, structured reflective fields |
| capsules | Space, creator, recipient, mode, immutable published opening time, safe metadata |
| capsule_payloads | Separate table with content RLS checking membership, recipient and database time |
| media_assets | Private bucket key, owner, space, parent record, MIME, size, checksum |
| legacy_imports, import_records | Source checksum, stable source key, mapping, counts, integrity status |

Do not put unopened content in capsule metadata, client state or public views.
Do not issue unrestricted signed URLs. Storage read policies must apply the same
capsule recipient/time rules; expiry should not outlive permission. Opening is a
server-enforced policy, not cryptographic secrecy. Deletion defaults to recoverable
archival where appropriate and requires a separate owner-approved policy.

## Phased milestones and gates

1. **Foundation and exploration (this change):** audit, branch boundaries,
   reliability protections, original catalog, wheel/search/favorites, introductory
   library, visual identity, Supabase preview, read-only private-space schema,
   auth boundary, CI, dry-run inspection, initial desktop/mobile tests.
2. **Verified private world:** invitation redemption, two real user accounts,
   memberships, secure CRUD and database tests for private/shared writing,
   favorites and custom decks. No legacy data yet. Explicit account setup with owner.
3. **Expression and understanding:** full weather studio, emoji tools, mirror,
   clarity and assumption workflows with role-aware writes and conflict handling.
4. **Memories and private media:** journal revisions, gallery/timeline, private
   object validation, recipient-aware capsules, exports, timezone and early-read tests.
5. **Migration rehearsal:** approved production disk backup, full source inventory,
   sanitized fixtures, idempotent importer/dry-run, unknown field archive, count and
   content verification, media checksum reconciliation, restore rehearsal.
6. **Release readiness:** parity sign-off, permission/adversarial tests, accessibility,
   mobile/performance review, backup schedule, cost review, concurrent-write plan.
   Explicit owner approval before any production migration, `main` merge or cutover.
7. **Later evolution:** original learning library expansion, EN/zh-Hans/ja,
   reusable worlds, optional subscriptions. No payments or public onboarding in
   the initial release; separate safety/privacy review before experiences for minors.

## Visual direction

An airy, warm paper atlas with sage, clay and cream; editorial serif headings,
quiet navigation, orbital illustrations and a sense of unfinished discovery.
Evening mode is an individual browser preference. No relationship metrics,
unread-pressure badges, mandatory streaks or promises of reading another mind.
