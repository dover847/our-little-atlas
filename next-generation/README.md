# Atlas next generation — milestones 1–2

An isolated Next.js application built beside the original Atlas. This is an
exploration and private-writing preview, **not feature parity or a production release**.

## Local development (PowerShell)

Requires Node 22+ (Node 24 is used in CI) and npm.

```powershell
cd next-generation
npm ci
npx vercel@65.11.0 link --project atlas-next-generation --scope my-little-atlas
npx vercel@65.11.0 project inspect --non-interactive
npx vercel@65.11.0 env pull .env.local --environment development --yes
npm run dev
```

Verify project owner/name before pulling environment files or deploying. Root
`.vercel/` belongs to the separate old Vercel copy; this directory has its own link.
Never commit `.env.local`, `.vercel`, password files or production snapshots.

Visit `http://127.0.0.1:3000`. The public exploration surface has only original
activities and educational copy. Favorites and theme remain browser-local. Spins
are not persisted or shared. Sign-in uses individual Supabase accounts. Account
activation, invitations and writing are documented in `../docs/milestone-2.md`.

## Checks

```powershell
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Database foundation and permission checks require the actual preview Development
environment and refuse a different project reference:

```powershell
npx tsx scripts/setup-preview-db.ts
npx tsx scripts/verify-preview-rls.ts
npx tsx scripts/verify-writing-permissions.ts
```

For real authenticated browser tests, using only isolated preview credentials:

```powershell
$env:ATLAS_PREVIEW_AUTH_E2E='1'
npm run test:e2e
```

This opt-in creates and cleans up uniquely identified test accounts in the new
preview project. It sends no invitation emails and never imports real memories.
Never enable it in a secret-bearing untrusted PR job.

The setup runner is transactional and checksum-idempotent. RLS tests create
synthetic users/spaces in a transaction and **always roll it back**. They do not
send emails, read user memories, or delete existing data. Application code uses
only a public Supabase key and user-scoped JWTs; privileged keys stay out of it.

The checked-in CA certificate is public, obtained over HTTPS from Supabase's
certificate distribution endpoint:
`https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`.
It is used only for local database tools, with certificate and hostname validation.
Fingerprint: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.

## Preview deployment

Deploy **from this directory**, to `my-little-atlas/atlas-next-generation` only:

```powershell
npx vercel@65.11.0 project inspect --non-interactive
npx vercel@65.11.0 deploy --environment preview --scope my-little-atlas
```

Do not use `--prod` or `promote`. Git-triggered deployments for the new project
are disabled in the source config. The separate legacy Vercel and Render services
are untouched by these commands. Vercel authentication protects previews; use
`vercel curl` for automated checks rather than disabling deployment protection.

See [`../docs/status.md`](../docs/status.md) for implemented/planned boundaries,
and [`../docs/migration.md`](../docs/migration.md) before any data work.
