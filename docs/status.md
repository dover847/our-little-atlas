# Milestone 1 status — November 3, 2026

## Preview

https://atlas-next-generation-1qu29gg50-my-little-atlas.vercel.app

Separate Vercel project: `my-little-atlas/atlas-next-generation`.
Deployment `dpl_83KmF1AR3yPv2S3uubaNnkVz2nZy`, Preview environment, Ready.
Protected by Vercel Authentication; the owner may need to sign into Vercel.
The deployment contains no personal memories. No custom production domain was
assigned, and no existing production site was changed after the master handoff.

## Implemented

- Dedicated rebuild branch, root project guidance and full feature parity audit.
- Reliability branch protections preserved locally on the rebuild branch.
- Next.js/TypeScript/Tailwind application alongside the original implementation.
- Bespoke responsive atlas shell, orbital artwork and day/evening themes.
- All 72 original prompts, with a parity test against the original catalog.
- Activity search, category filtering, local favorites and accessible detail dialogs.
- Server-confirmed exploration wheel with correct segment landing, reduced motion,
  request validation, error recovery and no accidental shared-history writes.
- Three original reflective lessons; no clinical claims or fabricated founder texts.
- Separate free Supabase project, Preview/Development environment linkage.
- Verified-user auth boundary, individual account sign-in form, protected spaces
  API/page and cookie refresh. No selectable-name identity in the new app.
- Database spaces/memberships with read-only membership RLS; no client self-joining.
- Preview-only transactional schema runner with checksum/idempotence protections.
- Read-only legacy snapshot inspector; no importer or destructive commands.
- Secret-free PR checks, unit tests, browser tests and database permission tests.

## Verification

- Legacy: **21 tests pass**, including real corrupt-file startup protection and
  preservation of the prior snapshot after a save.
- Rebuild: **5 unit tests pass**, including every wheel segment and deterministic,
  private dry-run inspection with rejection of redacted capsule backups.
- Browser: **8 tests pass** across desktop and mobile Chromium, covering search,
  favorite persistence, modal focus/Escape, spin/error recovery, learning dialogs,
  forged activity IDs, absent legacy write routes and anonymous private-route denial.
- TypeScript and optimized Next production build pass locally.
- Real preview Postgres: two synthetic users see only their own spaces; no anonymous
  reads or client self-enrollment. All fixture rows are rolled back.
- Deployed preview: home 200, server-selected prompt returned correctly, private API
  returns application 401 with `private, no-store` after Vercel protection is passed.
- New dependencies: npm audit reported zero known vulnerabilities at setup time.
- Desktop/tablet/mobile visual inspection performed. This is not a formal WCAG
  audit, cross-browser certification, or performance sign-off.

CI is configured but its remote result is recorded separately in the PR. Real
authenticated UI login/session refresh has not been exercised with Danny/Mia
accounts. No such accounts were created and no invitation emails were sent.

## Not yet implemented / gates

- Real account invitations, private/shared writing CRUD, custom decks and shared
  history. The sign-in form is for provisioned individual preview accounts only.
- Weather, understanding workflows, capsules, gallery, media uploads and exports.
- Private object storage bucket/policies. Supabase Storage is the selected provider,
  but no user uploads or personal media have been provisioned or migrated.
- Actual production `DATA_FILE` verification, encrypted backup and restoration test.
- Full relational feature schema, idempotent importer, rehearsal and content hashes.
- Production release, `main` merge, paid infrastructure and final cutover.

Next milestone: verified invitations and private/shared writing, with row-policy
and server validation tests. Migration must wait for the authoritative backup and
owner-approved author mapping. See [migration.md](migration.md).
