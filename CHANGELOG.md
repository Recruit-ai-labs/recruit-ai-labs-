# Changelog — outer-shell-hardening

Base commit: `dfa7a46313e6258916f67af592bd7d959bef62ac`.

The repository had substantial pre-existing tracked and untracked work at the start. This changelog covers only the outer-shell-hardening work; `BASELINE.md` records the incoming test state.

## Safety and planning

- `PROTECTED_PATHS.txt` — enumerates protected engine, interview, discovery, scoring, provider, speech, auth, database/migration, billing and dependency paths.
- `scripts/check_protected.sh`, `scripts/protected-base-commit.txt`, `scripts/protected-baseline-diff.hash`, `scripts/protected-baseline-tree.hash` — compare protected tracked diff, file list and contents with the recorded incoming baseline.
- `BASELINE.md` — records 79/85 passing tests, five environment-blocked integration failures, one missing discovery module failure, and the absent lint script.
- `PLAN.md` — records scope, files and protected-zone handling.

## Marketing and pricing

- `app/page.jsx` — text-only claim softening; unique blog summaries; verifiable/contact-us FAQ answers; non-numeric/non-unlimited pricing; contact CTAs; Recruit AI footer; pricing rendered from one config.
- `app/components/AboutReveal.jsx` — removed unsupported founder credential/performance claims and replaced them with verifiable workflow/accountability copy.
- `app/terms/page.jsx` — changed footer from “Recruit AI Inc.” to “Recruit AI” with a legal-entity TODO comment; live terms body was not replaced.
- `config/pricing.js` — single public pricing source with `TODO_PRICING` placeholders and `/contact` CTAs.
- `CLAIMS_AUDIT.md` — claim/evidence/action table, including removed numeric, certification, fairness, autonomy and turnaround claims.

## Consent (disabled and unintegrated)

- `.env.example` — documents `CONSENT_GATE_ENABLED=false`.
- `config/interview-consent.js` — default-off server flag and draft legal copy/version placeholders.
- `app/components/InterviewConsentGate.jsx` — standalone explicit-checkbox, 18+ draft consent UI.
- `proposed_migrations/20260920_create_interview_consents.sql` — unexecuted, reversible proposal for a new consent table only.
- `docs/proposed_patches/consent_gate.patch` — manual-review integration sketch; no protected interview file was changed by this task.

## Security headers

- `next.config.mjs` — adds one-year HSTS without subdomain/preload scope, `X-Content-Type-Options: nosniff`, and non-enforcing `Content-Security-Policy-Report-Only`.

## Reviews and proposals

- `docs/SECURITY_REVIEW_CHECKLIST.md` — observed OK/RISK/UNKNOWN controls with file references.
- `docs/privacy_notice_DRAFT.md`, `docs/DPA_TEMPLATE_DRAFT.md` — legal-review drafts; live pages unchanged.
- `docs/fairness_test_plan.md` — manual accent, Hindi-English and speaking-style protocol/results table.
- `docs/proposals/retention_deletion_job.md` — retention/deletion design and risks; no purge code.
- `docs/proposals/llm_rate_limiting_retry_queue.md` — bounded provider/queue proposal; no protected implementation.
- `docs/proposals/prompt_injection_defenses.md` — schema/envelope/adversarial-test proposal; no scoring/prompt changes.
- `docs/proposals/outcome_tracking.md` — purpose-limited outcome design and fairness risks.
- `FOUNDER_TODO.md` — legal, pricing, provider, claim, IP, trademark and protected-risk follow-up.

## Verification

- Protected-zone checker passes after every commit.
- Production build passes with Next.js 16.3.4.
- Before the Tech DNA follow-up, the result remained at the incoming baseline: 85 total, 79 pass, 6 fail for the same documented causes.
- No lint command exists in `package.json`; no lint dependency or script was added.
- No dependency, lockfile, active migration, database, provider, deployment, push, merge or PR operation was performed.

## Follow-up: Tech DNA accuracy

- `lib/interview-validation.mjs` — added deterministic evidence grounding, matching-question enforcement, exact skill naming, personal-action checks, negation/uncertainty handling, conservative recommendation calculation and an evidence-derived HR summary.
- `lib/nim-interview.js` — tightened the provider prompt so transcript content stays untrusted and every output must use semantically relevant exact evidence.
- `tests/interview-security.test.mjs` — added adversarial coverage for unrelated quotes, fabricated summaries, negation, learning-only mentions, wrong-question evidence, team-only exposure and keyword repetition.
- `docs/APPROVED_PROTECTED_CHANGE.md` — records the founder's explicit scope override and protected-baseline advancement.
- Expanded suite result: 89 total, 83 pass, 6 pre-existing failures for the same documented causes. Production build passes.

## Hiring desk and evidence safeguards

- Added `/dashboard/today`, `/dashboard/decision-room`, and `/dashboard/follow-ups` using workspace-scoped applications, interviews and activity history.
- Added human-owned notes, reminder events, practical-exercise evidence, printable side-by-side review, and unsent follow-up drafts.
- Reworked transcript display to extract candidate statements without fabricating competence, confidence or recommendations; added multilingual/negation adversarial tests.
- Removed invented discovery fallback skills/experience and generated briefs from unverified public excerpts without additional LLM calls.
- Fixed adaptive interview navigation to use the live question list and pause controls while follow-ups load.
- `tests/hiring-desk.test.mjs`: 11 new offline tests; targeted evidence/discovery suite: 19/19 passing. Protected-zone checker passes.
# Interview experience and evidence depth

- `app/interview/apply/[token]/page.jsx`: changed the verified-email chooser to an editable email input; the existing server check still rejects emails not verified on the signed-in account.
- `app/interview/[token]/voice.css`, `app/theme.css`: applied the supplied Ava background with a readability overlay.
- `lib/interview-validation.mjs`, `lib/interview-runtime.js`: expanded new interview plans to cover role experience, up to five required skills, problem solving, judgement, and motivation.
- `lib/adaptive-interview.js`: replaced per-answer provider calls with deterministic ownership, decision, and outcome probes to avoid extra AI-credit usage.
- `lib/transcript-evidence.mjs`, `tests/interview-security.test.mjs`: kept evidence extraction compatible with the expanded skill questions and added coverage checks.
# Candidate report repair

- Added `lib/interview-report.mjs`: source-validated provisional ratings, attributed summary points, persistence-safe revalidation and registration URL validation.
- Updated `lib/nim-interview.js`: request and preserve structured summary/assessment in the existing single evaluation call.
- Updated candidate and interview-response pages; added CandidateTabs, CandidateReport, ReportButton and report.css for working panels, separate summary/ratings/transcript, saved human scorecards and responsive layout.
- Updated candidate-response actions to reuse already generated reports for sequential Generate requests and refresh the candidate page after saving.
- Updated public application form/actions and interview runtime to collect and save optional LinkedIn/portfolio links.
- Added interview-report tests and a fixture-based browser report/tab test. Usage and limitations: `docs/CANDIDATE_REPORT.md`.
