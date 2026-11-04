# Our Little Atlas

## Release and data boundaries
- Authoritative production is `https://anamora.onrender.com`, branch `main`.
- Never merge to `main`, change production infrastructure, promote a deployment,
  migrate real memories, or incur paid costs without the owner's explicit approval.
- Work on `codex/atlas-next-generation`. Keep `our-little-atlas/` operational.
- The Vercel `our-little-atlas` project is a separate legacy copy, not the memory source.
- Rebuild previews belong only to Vercel `my-little-atlas/atlas-next-generation`.
- Never import real data into a preview. Never reset, overwrite, or delete memories.
- Secrets, data exports, backup manifests and personal writing must stay out of Git.
- Preserve unknown legacy JSON fields and historical labels during migration.

## Structure and verification
- `our-little-atlas/`: dependency-free legacy Node app and its regression tests.
- `next-generation/`: isolated Next.js App Router + TypeScript rebuild.
- `docs/`: audit, architecture, milestone status, migration and rollback procedures.
- Read `next-generation/node_modules/next/dist/docs/` for version-matched Next APIs.
- Run legacy regressions when changing legacy code. Run `npm run check`,
  `npm test`, `npm run test:e2e`, and `npm run build` for rebuild milestones.
- Add behavior tests for authorization, storage failures and data migration.
  Source-text matching tests are insufficient for data protection.
- No CI job may deploy production or receive production secrets on an untrusted PR.
- Report implemented behavior separately from planned and unverified behavior.

## Product principles
- Curiosity, voluntary participation and emotional autonomy guide interaction design.
- No relationship scores, pressure to reply, or manipulative engagement mechanics.
- Framework concepts are original educational material, not clinical claims.
- Individual users must be verified by the server; never trust a selectable name.
- Private writing defaults to private. Capsule content and media remain inaccessible
  until server-side time and recipient permissions permit access.
- Preserve the original 72 activities and every existing feature in the parity plan.
