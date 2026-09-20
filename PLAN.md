# Outer-shell hardening plan

The core engine, interview flow, candidate discovery, scoring/prompts, LLM and speech providers, auth, database models/existing migrations, workers, billing, and dependency files remain read-only.

## Planned changes

1. **Safety baseline:** add `PROTECTED_PATHS.txt`, `scripts/check_protected.sh`, protected baseline metadata, and `BASELINE.md`.
2. **Marketing copy and audit:** update text only in `app/page.jsx`; add `CLAIMS_AUDIT.md`. Pricing content will be read from one new outer-shell config module. No feature implementation changes.
3. **Consent module, disabled:** add a standalone consent UI and draft copy config, plus a new unexecuted reversible migration file. Do not integrate with protected interview code; instead add `docs/proposed_patches/consent_gate.patch` for manual review.
4. **Security headers:** make the narrow `next.config.mjs` header addition documented by the installed Next.js 16 guide: HSTS, `X-Content-Type-Options`, and report-only CSP only.
5. **Documentation:** add the requested security checklist, draft privacy/DPA documents, fairness test plan, proposals, and `FOUNDER_TODO.md`.
6. **Handoff:** add `CHANGELOG.md`, rerun the protected checker and the same test command after each small commit, and report final diff statistics.

## Existing files planned for modification

- `app/page.jsx` (marketing text and pricing rendering only)
- `next.config.mjs` (response headers only)

## New files planned

- `config/pricing.js`
- `config/interview-consent.js`
- `app/components/InterviewConsentGate.jsx`
- one new, unexecuted reversible migration file (kept separate from existing migrations)
- requested root/docs audit, proposal, legal-draft, changelog, and TODO Markdown files
- `docs/proposed_patches/consent_gate.patch` (proposal only; protected integration is not applied)

If inspection shows a requested change requires touching a protected path, it will be documented rather than implemented.
