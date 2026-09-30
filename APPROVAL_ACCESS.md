# Approval-based access

The recruiter sign-in page verifies email before creating an account. Unapproved visitors receive an opaque, eight-hour HttpOnly session and an `access_requests` entry with a stable application number. They do not receive a Clerk account, membership or workspace from this flow.

`aadilhussainkhan7@gmail.com` opens `/approval-portal` after email verification. This email cannot create a recruiter workspace. Only this server-verified identity may approve applications or retry notifications. Existing verified Clerk sessions are also checked by primary email; client metadata is never an approval source.

Applicants complete `/waiting-list`, which reuses the demo form and design. Approval records the reviewer and time and sends an email linking to `/sign-in`. If sending fails, approval stays saved and the portal offers retry. Successful sends are not repeated; concurrent retries use the same email-provider idempotency key.

On the next approved OTP login, the server creates or reuses the Clerk account, provisions a workspace from the submitted company/name if no membership exists, and issues a one-minute Clerk sign-in ticket. No second onboarding form is required. Existing memberships are preserved. Unprovided company size, role and hiring goal remain blank for later completion in settings.

Dashboard layouts, workspace actions, onboarding, invitation acceptance, workspace switching and the resume API enforce approval server-side. Existing recruiter emails are **not automatically approved**. Candidate interview authentication remains separate and does not grant recruiter access.

## Configuration and release

- Active storage is Turso (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`). Run `node --env-file=.env.local scripts/migrate-access.mjs` against each target environment before deploying.
- Configure `RESEND_API_KEY`, a verified `SMTP_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL` and the existing Clerk keys. `ACCESS_AUTH_SECRET` may be set separately; otherwise OTP hashing uses the server-only Clerk secret with a distinct purpose prefix.
- Never expose the OTP/session/approval tables through a public database API. OTPs are HMAC hashed, session tokens are SHA-256 hashed, verification attempts and rate limits are persisted in SQL, and mutations require a matching Origin.
- Production cookies require HTTPS. Vercel's trusted forwarded-IP header supplies the IP rate limit; other hosts use a conservative shared bucket until a trusted proxy integration is configured.
- Deploy this application build to activate the new routes on the public site. Running the SQL migration alone does not change the deployed login page.

## Verification

- `node --test tests/access-flow.test.mjs tests/access-authorization.test.mjs`: OTP lifecycle, no preapproval workspace, approval/notification retry, account provisioning and route/action authorization.
- `node tests/access-browser.cjs` with `PLAYWRIGHT_MODULE` pointing to a Playwright installation: real Chromium page/form checks at 320, 390, 768 and 1440 pixels. External email, Clerk and database responses are fixtures in this browser suite.
- `npm.cmd run build`: production compilation.
- `node --env-file=.env.local scripts/check-access-services.mjs`: read-only active database and sender-domain verification.

The inspected admin workspace `96gfh2agbpbvffp` and its linked dashboard records were removed from active Turso storage on 2026-09-13. The cleanup removed 16 records and created no backup. The existing Clerk authentication identity was retained; it has no recruiter access. The obsolete configured PocketBase endpoint returned HTTP 500 during integration tests, so its contents could not be inspected or cleaned.
