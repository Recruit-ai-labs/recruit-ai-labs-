# Hiring outcome tracking proposal

Documentation only; no candidate, scoring or database behavior was changed.

## Proposal

Define a minimal, purpose-limited outcome taxonomy (for example, advanced, interviewed, offered, hired, declined) with event source, timestamp and human actor. Separate operational outcomes from protected traits. If demographic fairness analysis is legally approved, collect it through a voluntary, access-separated workflow with minimum cohort thresholds and no individual scoring use.

## Files likely affected

- New outcome service, access policy, migration and audit events.
- Recruiter outcome-entry UI and aggregate analytics tests.
- Privacy notice, retention schedule and customer documentation.

## Risks

Feedback loops, label bias, proxy discrimination, re-identification in small cohorts, purpose creep, missing/incorrect labels and cross-tenant exposure. Require legal basis, role separation, aggregation thresholds and documented metric limitations.
