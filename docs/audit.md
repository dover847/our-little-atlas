# Repository and infrastructure audit

Audited November 3, 2026, from stable main `0f8ae81356b301ac554893c7d6fd8712d6cad354`.

## Where we are

| Resource | Verified state | Authority |
| --- | --- | --- |
| Render Anamora | `main`, automatic deployments, root `our-little-atlas/`, Singapore, 1 GB disk at `/data` | Source of real memories |
| Render preview | `feature/atlas-v3-foundations`, automatic deploy off, free instance, no disk listed | Temporary development copy |
| Vercel `our-little-atlas` | Legacy copy, root `our-little-atlas`, Node 26 | Separate copy, not authoritative |
| Vercel `atlas-next-generation` | Newly created, separate project, CLI preview deployments only | Rebuild previews |
| Supabase `atlas-next-preview` | New free-plan project, Frankfurt, connected only to rebuild Preview and Development | Isolated preview database |

Before this handoff, the Vercel legacy copy returned 500 because `ATLAS_PASSWORD`
was unset. A generated password and separate session secret were configured and
the copy was redeployed. Login and its 72-activity API were verified. No personal
data was imported. It still uses file persistence and is not suitable for memories.

The user later supplied the master handoff: Render is authoritative; no further
production changes or cutover without explicit approval. That rule governs all
rebuild work. The Prisma marketplace terms were accepted during earlier setup;
the installation lists no connected projects. No Prisma database was provisioned
by this work, and nothing was removed. Supabase replaces that proposed route.

Render's connected tools confirm the disk mount but do not expose a read of
`DATA_FILE`, a file export, or an SSH session. The exact filename and verified
backup are **unresolved**, not inferred from `render.yaml`.

## Legacy implementation

- Node `http`, `fs`, `path`, and `crypto`; no third-party runtime dependencies.
- 72 prompt records with numeric IDs, title, description, category.
- Vanilla HTML/CSS/JavaScript. Shared state is polled every four seconds.
- A process-global state object is synchronously serialized to a JSON file.
- Shared password, deterministic HMAC cookie, 30-day cookie expiration.
- `who` is a client-provided label, not authenticated identity.
- Browser-local preferences include themes, background photos and emoji favorites.
- `make_data.py` is content-generation tooling, not runtime code.

## Feature parity inventory

Each row is a preservation requirement. “Planned” does not mean removed from the
legacy app, which remains available throughout development.

| Legacy function | Existing behavior/data | Rebuild status after milestone 1 |
| --- | --- | --- |
| Wheel | Category filter; server-random selection; shared latest choice and last 100 spins | Original prompts, server-random exploration wheel, correct landing; shared history planned |
| Activity atlas | Category/search, favorites, detail dialog | Browse/search/filter/detail and browser-local preview favorites implemented |
| Per-activity notes | Separate Danny/Mia fields, both writable by shared account | Planned with verified authorship and explicit sharing |
| Custom topics/decks | User-created activities with IDs >=1000 | Planned; original custom records must migrate intact |
| Ideas | Title, text, who, timestamp | Planned |
| Journal | Memory, Letter, Reflection, Poem, Question, Gratitude, Interpretation; title/mood/text/activity | Planned with private drafts, sharing, revisions |
| Emotional Weather | Color, Unicode emoji, label, note, expiry; one current value per label | Planned; historical model proposed |
| Emoji tools | Search, Chinese labels, favorites, presets that preserve notes | Planned; browser preferences retained in original app |
| Interpretation Mirror | Expression → other person's interpretation → intention → reflection | Planned with actual member roles |
| Clarity Bridge | Gentle question and threaded replies | Planned |
| Assumption Detector | Observation, interpretation, alternatives, unknowns, intensity, question | Planned, never a connection score |
| Time Capsules | Together/surprise; future date; title/message; optional inline photos | Planned with protected metadata/payload separation |
| Countdown/redaction | Unopened payload omitted from API; countdown shown | Must preserve; new API and media policies need adversarial tests |
| Memory Gallery | Opened capsule photos and journal memories, filters | Planned |
| Personal themes | Original, rose, forest, ocean, violet; browser-local photo | Day/evening preview themes implemented; other controls planned |
| Export | Visible journal + opened capsules only; sealed content excluded | Read-only source inspection implemented; exports/imports planned |
| Original conceptual framework | Embedded language and exercises | Three introductory reflections implemented; library expansion planned |

## Risks and gaps

1. Missing/unreadable/corrupt JSON is swallowed on main; a later save can replace
   meaningful data with defaults. Reliability commits `1432490` and `b99a52b`
   have been cherry-picked **only onto the rebuild branch** as `9f84daf` and
   `d4c84b4`. They distinguish missing files from corruption and preserve a prior
   snapshot. Added behavior tests exercise actual startup and saved bytes.
2. File persistence cannot provide durable Vercel storage, coordinated multi-instance
   writes, or database-level transactions. The new app does not call the old API.
3. Shared-password identity permits impersonation and editing the other label's
   notes. A new account cannot inherit verified authorship from a historical label.
4. Capsule redaction hides payloads from normal API reads, but shared credentials
   cannot enforce individual recipients. Private object storage must not expose
   permanent URLs or permit reads before the opening date.
5. The mainline secret can fall back to the password. No login rate limiter exists
   in legacy app code. A name selector is not an access control.
6. JSON shape validation is shallow. Save mutates memory before writing; disk
   failures can leave an unpersisted in-memory state. The reliability snapshot is
   a safeguard, not a complete transactional solution or retention policy.
7. Legacy tests mostly assert source strings. Original integration test covers
   persisted state and understanding tools but not full browser interaction or
   multi-user authorization. New tests cover actual RLS and browser behavior.
8. Existing GitHub Actions push trigger names only an older feature branch and
   uses Node 20. New PR checks use Node 24 and do not deploy production.
9. Production backup, real counts, disk filename, refresh/write races, mobile
   accessibility and restore procedures still require validation before cutover.
10. Browser-local backgrounds/preferences are not in the server JSON and cannot
    be recovered by a server-only migration.
