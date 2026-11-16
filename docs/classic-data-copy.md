# Original Atlas feature and data copy — 2026-11-16

## Authoritative data and provenance

Source: original Render service **Anamora**, backed by the persistent disk at
`/data/atlas-data.json`. A read-only copy was written on that persistent disk
as `atlas-data.json.pre-iphone-copy-20261116` before the export response.
The original Node application and data remain on Render. Temporary owner-keyed
export code was removed again after the copy and its credentials disabled.

Source copy SHA-256:
`3253685f43ed8ac769911bc33e9c26a16b9fb50068cc208c12fe2f9060820f74`

Supabase destination: `atlas-next-preview`, one row in
`public.atlas_legacy_state`, linked to the existing `Our little world`
space and both users' verified accounts. Imported at 2026-11-16 17:47 UTC.
Original archive revision: 27.

| Collection | Copied |
|---|---:|
| Spins | 15 |
| Activity-note records | 2 |
| Favorites | 2 |
| Journal entries | 3 |
| Custom activities | 1 |
| Ideas, weather, capsules, mirrors, clarity, assumptions | 0 at snapshot |

The newer `writing_entries` table already had 2 user-created entries and
was **not overwritten or folded into the original journal**.

## Feature route

`/full-atlas` hosts the original page's complete interface:
wheel, atlas, journal, emotional weather, time capsules, memory gallery,
understanding (interpretation mirror, clarity bridge and assumptions),
custom activities and ideas.

The original app's 72 activities, HTML, CSS and JS were copied from branch
`main` to `next-generation/public/classic/`. Its API is served by
`/api/legacy/[action]` using signed-in per-person accounts rather than the
original shared password / selectable names.

The canonical installable preview domain is
`https://atlas-next-generation.vercel.app`, whose manifest starts at
`/full-atlas`. Shared writing, history, member-aware activity and notification
settings remain accessible at `/space`.

## Important security boundaries

- Archive storage is server-read-only; `authenticated` and `anon` may not
  SELECT raw archive JSON. The server presents sealed capsules without title,
  message or photo until their opening date.
- Writes run through a member-checked optimistic-revision RPC and record
  shared-activity metadata. User attribution uses Supabase Auth identity,
  never arbitrary client-selected names.
- Signed-in users can see shared data, including original journal entries.
  No private content is placed in lock-screen push notifications.
- The temporary migration endpoint in the Next app was removed after
  checksum and collection counts were verified.

## Limitations and operational guidance

- The original Render app and copied Next/Supabase app are **not bidirectionally
  synced**. Edits made on Render after the copied snapshot won't propagate
  to the new app. Use the new app as the primary space going forward.
- Personal browser-only settings from the **old** host (background photo,
  favorite weather emojis, local theme) were not on Render's server disk and
  cannot be recovered server-side. Each user can select those again on their
  own device.
- The modern Next writing studio uses its own separate writing entries.
  The original journal appears in the full Classic Atlas page.
- Existing Render disk and original website are retained as backup.


## Shared atmosphere, storage and startup performance (2026-11-16 update)

- The full Atlas shell is statically prerendered at `/full-atlas`. The
  classic HTML/CSS/JS is served as cached same-origin static assets, rather
  than blocking page display on Supabase Auth and a membership query.
- Authenticated data remains protected at `/api/legacy/state`. The server
  checks identity and membership before sending the archive, and never reveals
  unopened capsule text or image paths.
- The original UI's data polling interval is 12 seconds instead of 4 seconds.
  Background synchronization checks every 9 seconds while the page is visible
  and on focus. Alerts are dispatched after the save response when supported.
- The previous five browser-local color themes are now a **shared theme**,
  with sunrise and twilight added, plus a shared accent color. Either member
  can change it; both receive the same shared setting and selected photo.
- Background photos are resized on-device and uploaded to Supabase Storage in
  the private `atlas-shared-media` bucket (max 1.2 MB/image). They are served
  only via signed URLs issued to authenticated space members. The shared
  setting and its last editor are stored in `public.atlas_atmospheres`.
- Newly created photo time capsules also store their photo bytes privately in
  the same bucket instead of bloating the shared JSON document. Signed URLs
  are minted only after each capsule's opening date.
- The shared storage meter shows stored media files/bytes, original archive
  size, and new writing-page count. PostgreSQL database size includes platform
  overhead and is not the same as user media storage.
- The prior journal's multiple writing types now have quick tabs, and
  individual journal entries accept attributed replies. The activity wheel
  shows recent spins and avoids recently selected activities when possible.
  Emotional Weather includes explicit bothered, angry and comfort presets.
- The `public.atlas_archive_versions` table retains an inaccessible-to-client
  snapshot of the previous document on each change, providing an owner-side
  recovery route without exposing private history to browsers.
- New background and shared-writing changes enter the shared activity feed
  and optional opt-in Web Push, without including journal contents in
  lock-screen previews.

Important: real push delivery and two-device visual synchronization still
require both users to have an authenticated running client. The implementation
is live but production monitoring and hands-on device tests are distinct
from deployment/build and access-control checks.
