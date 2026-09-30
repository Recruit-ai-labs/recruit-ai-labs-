# Sireen interview pipeline

Entry: **Jobs → select an open job → Create interview → Generate interview link**.
Candidate review: **Candidates → select the candidate → Tech DNA**.

## Implemented

- Published jobs receive a cached AI role blueprint. If analysis is unavailable, the job still saves and interview creation retries it. Edited job requirements invalidate the cache when the next invitation is created.
- Each invitation freezes the role rubric, lasts 14 days, supports up to 100 registrations and can be revoked. Only workspace job managers can create/revoke invitations.
- Candidate details → uploaded PDF/DOCX or pasted resume → Sireen introduction → instructions → local camera/microphone check → fullscreen interview.
- Q1 uses the resume and JD. Q2–Q5 use all submitted answers plus the frozen rubric. Questions are generated server-side. Every answer saves before another AI call; generation failures are retryable.
- Optional browser speech synthesis reads questions; optional browser dictation produces editable text. Typed answers also work. No audio or video is stored. Original resume files are not stored; extracted text is available to recruiters.
- Exiting fullscreen, hiding the tab, losing window focus or losing a device pauses the session. Overlapping browser events within 2.5 seconds count as one incident. Three distinct recorded incidents end the session. The profile shows a red **Needs human review** notice and event timeline, never an automatic cheating verdict or skill-score penalty.
- Registration atomically creates a candidate, job application and private interview session. An HTTP-only capability cookie protects that candidate’s session. Shared invitations never expose other candidates’ data. Duplicate registration for the same invitation/email is refused; use the original browser to resume.
- The final answer persists completion, then triggers Tech DNA analysis. Provider errors leave the transcript intact; the candidate page and HR can retry analysis. HR retries are workspace/role guarded.
- Candidate deletion removes its interview resume text, answers, DNA and session events.

## Tech DNA v1

JD criteria carry weights of 1–5, fixed before the interview. Ratings also range from 1–5: misconception, partial explanation, applied understanding, reasoned trade-offs, and deep reasoning with verification and limits. A rating requires a verbatim quote matching the referenced answer. Invalid/missing evidence remains **Not assessed**, never zero.

Alignment is the weighted mean of **assessed** criterion ratings, scaled to 100. Coverage is assessed criterion weight divided by total criterion weight. Both appear together. Six additional evidence dimensions cover role knowledge, problem solving, execution/ownership, trade-offs, verification and explanation clarity. An HR brief, evidence quotations, next probes, full transcript, model/version and calculation details are retained.

This is a transparent interview rubric, not a psychometric instrument or a validated performance predictor. It does not infer personality, protected characteristics, honesty, mental health or innate talent. Five answers cannot establish a person’s full capability. Model interpretations still need human review even when their quotations match.

## Runtime requirements

- Existing migrated Recruit AI **Turso** database with `candidates`, `applications` and `jobs` tables; `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- `OPENROUTER_API_KEY`; optional `OPENROUTER_MODEL`. A reliable structured-output model is preferable to a rate-limited free pool.
- The new `sireen_*` tables/indexes are created idempotently on first use; the database credential needs schema-write permission. This new interview flow does not support a PocketBase-only deployment.
- HTTPS (or localhost), a desktop browser with fullscreen, camera and microphone support. Dictation depends on browser support and separate consent; it may use the browser vendor’s remote speech service.
- API route maximum duration is 120 seconds; each model call times out after 55 seconds. Configure equivalent server-action duration for role analysis and recruiter retries on the deployment host.

Browser events are client-observed signals, not tamper-proof proctoring. No face matching, gaze analysis, screen recording, background recording or verified identity is claimed. Candidate names and emails are self-reported; invitations should be distributed by the hiring team. Clearing browser cookies requires recruiter assistance / a new invitation. For unsupported devices or accessibility needs, arrange an alternative interview.

No new external messages are sent. Deployment/provider credentials, production retention schedules and empirical scoring validation are not established by the local test suite.

## Verification

`node --test tests/tech-dna.test.mjs tests/job-validation.test.mjs tests/ui-actions.test.mjs`

`node tests/sireen-browser.cjs` (uses `PLAYWRIGHT_MODULE` or the existing local Playwright installation).

`npm.cmd run build`

The route lifecycle test uses the actual route code and local in-memory SQLite with a deterministic AI fixture. Browser tests use real Chromium, fake media devices and mocked transport. They do not contact a live model or mutate production candidate data.
