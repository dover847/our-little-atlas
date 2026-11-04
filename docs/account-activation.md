# Account activation recovery

Recovery preview: https://atlas-next-generation-ip1ra4r2r-my-little-atlas.vercel.app/activate

An Auth invitation can verify its email before redirecting the browser. If that
redirect points to an unreachable local address, the original email token may
already be consumed. Reusing only that original token is not a reliable recovery.

The activation page now supports:

1. An unopened Supabase email confirmation link, verified server-side.
2. The entire unreachable browser address containing access/refresh fragments.
   These are parsed locally, not navigated to or fetched. Supabase verifies the
   recovered session before allowing the account owner to choose a password.
3. A user-initiated fresh-access email for used/expired links. Supabase recovery
   email links are accepted by the same activation page. Responses do not reveal
   whether an address has an account.

Never paste invitation URLs or session fragments into chat, GitHub, logs or bug
reports. The hostname alone is enough for initial diagnosis.

Verified with real preview Auth and synthetic users: desktop uses an unopened
invitation; mobile consumes it first, then recovers a simulated unreachable local
redirect. Both finish activation, invitations, writing and conflict checks.

The provider's redirect allowlist/site URL still requires configuration through
the Supabase management connection. The recovery UI does not claim that direct
email redirects have been fixed. Existing production remains unchanged.
