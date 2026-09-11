# PocketBase setup

Recruit AI keeps Clerk as the identity provider. Product records are accessed only by the Next.js server using PocketBase superuser credentials; all application collections are locked from direct public access.

## Local startup

1. Place the PocketBase executable outside version control or install it on the host.
2. Keep `POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL`, and `POCKETBASE_ADMIN_PASSWORD` in `.env.local`.
3. Start PocketBase from this project directory so it discovers `pb_migrations`:

   `.\.pocketbase\pocketbase.exe serve --http=127.0.0.1:8090 --dir=.pocketbase/pb_data --migrationsDir=pb_migrations --hooksDir=pb_hooks`

   The hooks directory is required: interview registration, rate limits, integrity events and atomic submission use the protected custom endpoints. On Windows, restart PocketBase after changing hook files. `scripts/start-pocketbase.ps1` also starts the service with these paths.

4. PocketBase applies unapplied migrations automatically on startup.
5. Start Next.js with `npm run dev`.

Do not expose `POCKETBASE_ADMIN_EMAIL` or `POCKETBASE_ADMIN_PASSWORD` through `NEXT_PUBLIC_*` variables. Back up `pb_data` in production and follow PocketBase's production guidance for TLS, SMTP, rate limits and upgrades.

Resume files are protected by migration `1725601500_secure_interviews.js`. The Next.js server obtains a short-lived file token after workspace authorization. Public interview applicants must sign in with a verified Clerk email matching the application. Existing links receive a seven-day expiry during migration; direct invitations receive questions if missing. Candidate drafts are stored in sessionStorage for up to 24 hours and cleared after submission.

Implementation references: [protected files](https://pocketbase.io/docs/files-handling/#protected-files), [transactions](https://pocketbase.io/docs/js-database/#transaction), [custom routing](https://pocketbase.io/docs/js-routing/).
