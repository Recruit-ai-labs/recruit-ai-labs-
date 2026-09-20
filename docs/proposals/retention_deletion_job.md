# Retention and deletion job proposal

Documentation only; no purge job or migration was implemented.

## Proposal

After legal approval, define per-record retention periods, legal holds and customer overrides. A dry-run worker should enumerate eligible record IDs, produce an auditable report, require an authorized approval, then delete in bounded batches with retries and idempotency. Blob deletion must be verified separately from database deletion. Backups need a documented expiry rather than ad-hoc mutation.

## Files likely affected

- A new worker/queue module and tests (do not place logic in request handlers).
- New migration for retention state/legal holds; existing migrations remain unchanged.
- `lib/blob-storage.js`, candidate/interview data services, admin audit UI and privacy documentation.

## Risks

Wrong-tenant or premature deletion, broken referential integrity, undeleted blobs/backups, legal-hold violations, retry duplication, excessive database load and misleading completion notices. Require dry-run evidence, tenant scoping, two-person approval for broad runs and recovery testing.
