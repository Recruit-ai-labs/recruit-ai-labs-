# Approved protected-zone change

On the follow-up request after the outer-shell work, the founder explicitly authorized a narrowly scoped Tech DNA accuracy fix in the previously protected interview evaluation path.

Authorized files:

- `lib/interview-validation.mjs`
- `lib/nim-interview.js`
- `tests/interview-security.test.mjs`

Purpose: prevent transcript-derived false positives, reject unrelated/negated/team-only/learning-only evidence, constrain skill signals to their matching interview questions, and build the HR summary from validated transcript evidence.

No interview orchestration, candidate discovery, speech capture, authentication, billing, database model/migration, provider credentials, or dependency file was changed. The protected baseline hashes were advanced after this authorized change so future drift remains detectable.
