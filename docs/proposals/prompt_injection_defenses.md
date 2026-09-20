# Prompt-injection defense proposal

Documentation only; scoring and prompt code remains protected and unchanged.

## Proposal

Create a reviewed LLM boundary that labels candidate/JD text as untrusted data, uses explicit structured envelopes, minimizes supplied fields, rejects tool/instruction requests from content, validates output against strict schemas and independently verifies evidence quotes against source text. Add adversarial fixtures in multiple languages and fail closed to human review when validation fails.

## Files likely affected

- Protected prompt/provider modules (`lib/nim-*.js`, `lib/adaptive-interview.js`, `lib/assessment-evaluation.js`, `lib/bulk-screening-ai.js`).
- New shared schema/boundary module and adversarial tests; scoring rubrics only after explicit founder approval.

## Risks

Changing scores, false rejection of legitimate resumes, multilingual regressions, prompt leakage, added latency and overconfidence in schema validation. Require frozen comparison fixtures, human review and staged rollout.
