# Unfinished business at /cards

The deck preserves the supplied app's design and behavior. Questions and kept status are shared; drawing a card is local to each phone. No email or password is requested.

## Hosting

The existing Vite build now has two HTML entry points, `index.html` and `cards/index.html`. Vercel rewrites only `/cards` and `/cards/` to the deck entry point. The homepage source, `/blyg` redirect/proxy and public resume/assets are unchanged. No domain or DNS changes are required.

The pinned Supabase client is bundled into the site. `src/cards/config.ts` contains only the project URL and publishable browser key. No service-role or management credentials belong in this repository or the browser.

## Supabase

Project: unfinished-business (`rrfrefhnfmtcamvvpeci`), Singapore, rpasetes-org.

**Authentication → Sign In / Providers → Allow anonymous sign-ins** is enabled in the Supabase dashboard. The migrations create the schema, explicit grants, RLS policies, invite functions and the `supabase_realtime` publication entry for `cards_questions`.

- A browser gets an anonymous Supabase identity. The user chooses a display name, which is not a verified identity.
- A new deck gets a cryptographically random 256-bit invitation. The database stores only its SHA-256 digest in a non-exposed schema.
- The complete sharing link uses `/cards#room=…`. The fragment is not included in normal HTTP page requests; the deck also sends no referrer.
- Redeeming the invitation establishes membership. Knowing a room UUID alone is insufficient. Members can read/add questions and change only the saved flag. Invitation hashes and other users' memberships are not readable through the client API.
- Private privileged functions validate the authenticated caller and invitation, have a fixed search path, and are not directly exposed through the API. Public RPC wrappers run with invoker privileges.
- Nobody can edit question text, forge creation identity/time, move or delete cards through the browser API. No client delete permission is granted.
- Limits: 500 questions per room, 30 additions per user per room per minute, 20 created rooms per browser identity. Supabase Auth additionally enforces signup limits.
- Realtime Postgres Changes uses the same RLS read policy. The client refetches after subscribing, on reconnect and on returning to the tab to avoid missing changes during disconnection.
- Retrying a question after a lost response reuses its ID. A failed write leaves the input intact.

Anyone holding the complete invite link can become a member and share it again. There is no invitation revocation or member-removal interface in this version. Clearing browser storage loses the anonymous identity; reopen the full shared link to join with a new identity. Save the invitation if you need to return on a different device. The database administrator can access stored questions; this is not end-to-end encrypted.

For wider public distribution, enable CAPTCHA for anonymous sign-in (and pass its token from the client), review quotas, and add room deletion/member controls. Do not enable a CAPTCHA requirement without wiring the client token flow first.

## Validation

- `bunx tsc --noEmit`
- `bun run build`
- Run `tests/cards-access.sql` and `tests/cards-limits.sql` through an administrative SQL connection. They create isolated test fixtures and roll back everything.
- Run `bun tests/cards-live.ts` to test actual anonymous Auth, REST and Realtime after guest sign-in is enabled. It prints only test IDs for administrator cleanup, never tokens.
- Open one room link in separate browser sessions. Add from both sessions, keep/unkeep, draw independently and refresh. Confirm another session without the invite cannot access the data.
- Before publishing, verify the Supabase security advisor and preserve the existing homepage, blog and resume routes.

## Rollback

Revert the deck integration commit to remove `/cards` and its build entry point without changing `/blyg` or the homepage source. The separate Supabase data remains intact. Do not drop deck tables to roll back frontend code.

## Advisor review

After guest access is enabled, the advisor flags policies applying to anonymous identities. This is intentional: these policies restrict them to their own memberships and invited rooms, and the private room policy denies direct access. The advisor also reports leaked-password protection disabled; this app does not use password sign-in. See https://supabase.com/docs/guides/database/advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
