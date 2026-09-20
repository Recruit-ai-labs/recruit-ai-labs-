# LLM rate limiting and retry queue proposal

Documentation only; no provider, interview, scoring, auth or queue code was changed.

## Proposal

Introduce server-side per-workspace and global concurrency budgets, bounded request sizes, timeouts, provider-aware retry classification, exponential backoff with jitter and a dead-letter review path. Only idempotent operations should retry automatically. Preserve the model/version and input fingerprint for audit without logging unnecessary candidate content.

## Files likely affected

- Protected provider clients such as `lib/nim-interview.js`, `lib/nim-match.js`, `lib/nim-resume.js` and `lib/assessment-evaluation.js`.
- A new queue/worker module, durable job schema/migration, observability and isolated mock-provider tests.

## Risks

Duplicate evaluations, stale results, cross-tenant quota leakage, cost spikes, sensitive prompt logging, retry storms and changed interview timing. Roll out behind a separate flag with provider calls mocked in tests.
