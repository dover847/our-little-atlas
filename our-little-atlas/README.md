# Our Little Atlas

A private, two-person website with all 72 activities, a spinning wheel, shared notes, favorites, a journal, and custom ideas.

## Start locally

Requires Node.js 20 or newer. No npm packages are needed.

```bash
ATLAS_PASSWORD='a-long-secret-password' ATLAS_SECRET='a-different-long-random-secret' npm start
```

Visit http://localhost:3000 and enter your shared password.

## Put it online for both people

Deploy this folder to a Node.js hosting provider (such as Render, Railway, or a VPS). Set:

- Start command: `npm start`
- Environment variable `ATLAS_PASSWORD`: your private password (12+ characters)
- Environment variable `ATLAS_SECRET`: a separate, long random value for signed session cookies
- Environment variable `NODE_ENV`: `production`
- Environment variable `DATA_FILE`: a path on a **persistent mounted disk**, e.g. `/data/atlas-data.json`

**Persistent storage is essential.** If your host uses an ephemeral filesystem, notes and activity history can disappear after redeployment or restart. Attach a persistent disk and point `DATA_FILE` to it, or run the app on a VPS with persistent storage. Use HTTPS. Share the deployed URL and password only with Mia.

## How sharing works

The website refreshes its shared state every four seconds. When either person spins, saves a note, favorites an activity, or adds a journal entry, the other person's page will update automatically. This is near-real-time polling, not a simultaneous collaborative editor. If both people edit the same person's note at once, the last saved version wins; use your own note field to avoid collisions.

## Security notes

The shared password grants both people access to everything. It is a private shared space, not separate user accounts. The name selector is for attribution only, not identity verification. The password and cookie signing secret must be stored as environment variables, never in frontend code. The host should provide HTTPS, access control and persistent backups. Avoid storing sensitive information unless you trust your hosting provider and its security. For public exposure, consider adding rate limiting to the login endpoint and hosting-level protections.

## Files

- `activities.json`: all 72 original activity prompts
- `server.js`: HTTP API and persistent storage
- `public/`: the mobile-friendly website
- `atlas-data.json`: created automatically after first saved change; back it up periodically

## Simplified deployment

See **START_HERE.md** for the shortest setup route. `render.yaml` provides a Render Blueprint with a persistent disk and automatic session secret.
