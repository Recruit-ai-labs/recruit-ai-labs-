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
