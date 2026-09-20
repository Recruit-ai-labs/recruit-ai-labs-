# Security review checklist

Status: code-reading review only, 20 September 2026. No production configuration, provider console, database policy, or penetration test was inspected. `UNKNOWN` means evidence is insufficient—not that the control is absent.

| Review item | Status | Read-only observation |
|---|---|---|
| Treat candidate text as untrusted in scoring prompts | OK | System prompts explicitly call candidate content untrusted in `lib/adaptive-interview.js`, `lib/assessment-evaluation.js`, and `lib/talent-semantic-search.js`. |
| Delimit candidate content from instructions | RISK | Several protected LLM calls serialize data as JSON, but no consistent, independently validated delimiter/envelope policy is visible; examples include `lib/nim-match.js` and `lib/nim-interview.js`. Do not fix without protected-zone review. |
| Validate model output against a strict schema | RISK | JSON parsing, type normalization, ranges, evidence checks and filtering exist in `lib/assessment-evaluation.js`, `lib/match-evaluation.mjs`, and `lib/bulk-screening-ai.js`; a shared strict schema validator is not present. |
| Keep API keys server-side | OK | Provider keys are read from non-public environment names in server modules such as `lib/nim-resume.js`, `lib/nim-match.js`, and `lib/talent-semantic-search.js`. No `NEXT_PUBLIC_` provider secret reference was observed. Deployment settings remain UNKNOWN. |
| IDOR and cross-tenant authorization | RISK | Workspace filters and membership checks are common (`lib/workspace-page.js`, `lib/recruit-data.js`, `app/api/candidates/[candidateId]/resume/route.js`). This review did not prove every dynamic route and mutation is scoped, so a route-by-route test is still needed. |
| Signed URLs and encryption for stored resumes/audio | UNKNOWN | Resumes are uploaded as private blobs in `lib/blob-storage.js` and proxied through an authorized route in `app/api/candidates/[candidateId]/resume/route.js`. Provider-side encryption, signed URL expiry, audio storage, and key management are not established in code. |
| Output escaping / XSS | OK | React rendering provides default text escaping throughout reviewed JSX. No `dangerouslySetInnerHTML` use was found in the reviewed app code. URL allow-listing and content-disposition behavior still deserve focused testing. |
| Form rate limiting | RISK | Access flows include attempt/rate-limit logic in `lib/access-core.mjs`; equivalent, consistent controls were not established for all public forms such as demo/contact/waiting-list routes. Per instruction, no rate limiter was added. |
| Breach response process | UNKNOWN | No approved incident/breach response runbook, escalation contacts, notification decision tree, or exercise record was found. |
| Human review of hiring decisions | OK | Human accountability is stated in `app/privacy/page.jsx`, and recruiter review surfaces exist in interview/evaluation pages. This does not by itself prove operational compliance. |
| Consent evidence and retention | RISK | Candidate consent fields exist in protected candidate code, but the requested interview-specific policy/text versions and retention details are not currently integrated. See `docs/proposed_patches/consent_gate.patch`. |

## Required follow-up

- Threat-model each public and authenticated route, then add negative cross-workspace tests without altering authorization behavior during this review.
- Have security counsel review prompt-injection handling and model-output validation before any scoring changes.
- Confirm blob-provider encryption, URL semantics, geographic storage and deletion behavior in vendor documentation/contracts.
- Define owners, severity levels, evidence preservation, notification analysis and tabletop cadence for breach response.
