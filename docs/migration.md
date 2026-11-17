# Data preservation, migration and rollback

**Status: design and read-only inspection only. No production backup or import has
been performed.** The implemented schema is the private-space foundation, not the
complete legacy import model.

## Before touching authoritative data

1. Verify Render service `Anamora`, `srv-dbiuqi8u01pc73e0spqg`, workspace
   `tea-dbis6cutlv9c73bj5qig`, URL `https://anamora.onrender.com`, branch `main`.
2. Read the deployed `DATA_FILE` configuration through an authorized Render
   dashboard/SSH/API path. `/data` is a verified mount, not the verified filename.
3. Obtain a consistent **read-only** snapshot from that actual file without
   restarting or changing the live service. Copy the file, do not move it. Confirm
   consistency with a second read/revision check while the app may be writing.
4. Store the snapshot encrypted outside Git and outside preview deployment source.
   Record UTC time, service/deployment ID, byte length, SHA-256, revision and counts
   in a private manifest. Preserve the original bytes, including unknown fields.
5. Verify a second protected copy and rehearse restoration to an isolated service.
   A checksum without a restoration test is not proof of recoverability.

The public/shared-account `/api/state` and visible-memory exports redact sealed
capsules. They **cannot replace a full disk snapshot**. The inspection tool rejects
an export containing `sealed:true` capsule records to prevent this mistake.

## Original schema to validate against the real snapshot

| Key | Observed application shape / relationships |
| --- | --- |
| revision | Monotonic numeric save revision |
| selected | Last selected numeric activity ID or null |
| spins | activity ID, `who`, `at`; newest first, bounded to 100 |
| notes | activity-ID object → author label → text |
| favorites | Activity IDs shared by the old account |
| ideas | UUID, title, text, label, timestamp |
| journal | UUID, label, type, title, mood, text, timestamp, optional activity ID |
| customActivities | ID >=1000, category, title, description, creator label, timestamp |
| weather | Label → color, emoji, label, note, timestamp, nullable expiry |
| mirrors | Expression + label/time; interpretation, intention, reflection nested answers |
| clarity | Question + label/time; nested replies with UUID/label/time/message |
| assumptions | Observation, interpretation, alternatives, unknowns, question, intensity |
| capsules | UUID, author label, recipient/mode, title/message, inline photo, openAt/at |

Field shape and relationships above come from code, not from actual production
records. Unknown keys, odd date values, duplicates, missing fields and legacy
records require private inspection; never discard or silently “repair” them.

## Implemented safe inspection

Run from `next-generation/`:

```powershell
npm run migration:inspect -- --file 'C:\private-backups\atlas.backup.json'
```

This is always read-only and makes **no database writes**. It validates top-level
collection shapes, fingerprints the exact bytes, counts records, identifies unknown
top-level fields, and marks historical identities as unverified labels. It prints
no journal text, photos or capsule contents. Keep even count reports private.
Identical bytes produce identical reports. Automated tests use synthetic content.

## Planned importer, not yet implemented

- Require explicit target project and space; default to `--dry-run`.
- Use source checksum + collection + stable legacy ID (or deterministic source
  position when no ID exists) as an import key, with a unique database constraint.
- Store the encrypted original snapshot and a full field-level mapping manifest.
- Preserve labels as `legacy_author_label`; link to a verified user only following
  owner review. Never infer that `who: Mia` proves Mia authored a record.
- Preserve original timestamps, timezone meaning, activity references, ordering,
  mirror roles, replies, capsule recipients and exact text.
- Import media into private storage; verify decoded bytes, type and SHA-256.
  Keep unopened capsule content inaccessible during and after the import.
- Never overwrite target records on repeated runs. A conflict must stop for review.
- Compare counts per entity and per author, exact normalized content hashes, all
  source references and media hashes. Re-run idempotence and restore tests.
- Test against sanitized fixtures with unknown keys, missing collections, corrupt
  JSON, duplicate IDs, unrecognized authors, unopened capsules and historic dates.

## Final write window and rollback

Owner approval is required before production migration or changing live behavior.
Before cutover, agree on a short write freeze **or** implement an explicit delta
reconciliation protocol. Capture the final snapshot/revision, import once, verify
counts/hashes, and record any subsequent writes. Do not assume the initial snapshot
remains current while Danny and Mia continue using Render.

Keep the Render app and protected snapshots available until the new version is
accepted. Stage the new production build without changing domains; run approved
acceptance checks; promote only with explicit approval. Never merge to `main`
while Render auto-deploys it without an approved release plan.

Rollback before cutover simply leaves Render in service. After cutover, use the
recorded deployment and database backups, reconcile new writes, and obtain approval
before switching users back. Do not blindly restore an older JSON over newer data.
No destructive database-down migration is provided or run by default.
