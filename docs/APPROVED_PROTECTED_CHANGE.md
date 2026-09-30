# Approved protected-zone change

On the follow-up request after the outer-shell work, the founder explicitly authorized a narrowly scoped Tech DNA accuracy fix in the previously protected interview evaluation path.

Authorized files:

- `lib/interview-validation.mjs`
- `lib/nim-interview.js`
- `tests/interview-security.test.mjs`

Purpose: prevent transcript-derived false positives, reject unrelated/negated/team-only/learning-only evidence, constrain skill signals to their matching interview questions, and build the HR summary from validated transcript evidence.

No authentication, billing, database model/migration, provider credentials, or dependency file was changed. The founder then explicitly expanded the follow-up scope to accuracy gaps in interview transcript summaries and candidate discovery. The additional protected changes are limited to extractive evidence display, removal of invented discovery fallbacks, and adaptive-question navigation. The protected baseline hashes were advanced after these authorized changes so future drift remains detectable.

On 21 September 2026, the founder explicitly requested a stronger interview flow. The approved change adds structured role/skill/scenario questions, deterministic evidence-gap follow-ups with no additional model call, an editable verified-email field, and the founder-supplied Ava background. It does not alter authentication rules, candidate identity matching, billing, or database schemas.
