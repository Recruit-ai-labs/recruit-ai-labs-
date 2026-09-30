# Founder decisions and follow-up

## Required before enabling or publishing

- Confirm the exact legal entity name for footers, contracts and notices. Public footers now say “Recruit AI” pending confirmation.
- Provide approved AI and speech provider legal names, subprocessors, processing locations and contract links.
- Approve what interview audio/transcript data is stored, the retention period for every record class, backup expiry and deletion exceptions.
- Supply approved pricing numbers, currencies, taxes, usage limits and plan descriptions for every `TODO_PRICING` item in `config/pricing.js`.
- Obtain legal review of `docs/privacy_notice_DRAFT.md`, `docs/DPA_TEMPLATE_DRAFT.md`, consent copy, age restriction, lawful basis, withdrawal flow and human-decision wording.
- Manually review `docs/proposed_patches/consent_gate.patch`; do not enable `CONSENT_GATE_ENABLED` until server-side recording and the proposed migration are approved and tested.
- Confirm evidence for any desired customer/volume/performance/security claim listed in `CLAIMS_AUDIT.md`; do not restore 10K+, SOC 2, 24/7, bias, fairness or turnaround claims without substantiation.
- Review employment agreements and invention/IP assignment obligations for founders and contributors.
- Run a trademark/name clearance check for “Recruit AI,” logos and product marks in intended markets.

## Protected-zone bugs and risks observed (not fixed)

- Baseline test suite is 79/85: five PocketBase integration tests attempt external access and fail with `EACCES` in this environment.
- `tests/discovery.test.mjs` imports missing `lib/discovery-core.mjs`; both that file and related discovery files were already deleted in the incoming worktree. Candidate discovery was not touched.
- LLM output validation is hand-written across several protected modules rather than consistently enforced by a shared strict schema; see `docs/SECURITY_REVIEW_CHECKLIST.md`.
- Prompt/content separation is inconsistent across protected LLM boundaries; candidate text is usually labelled untrusted, but adversarial multilingual coverage is not established.
- A route-by-route IDOR/cross-tenant authorization audit remains required even though workspace filters and membership checks are present.
- Private resume blob storage is visible, but encryption guarantees, signed URL expiry semantics and verified blob deletion are not established from code alone.
- Public-form rate limiting is not consistently established. No rate limiting or auth change was made.
- No approved breach-response runbook was found.
- Consent-specific policy/text version storage is not integrated; only a disabled standalone draft and unexecuted proposed migration were added.
- Retention/deletion automation, provider retry queues and outcome tracking require separate reviewed projects; proposals are under `docs/proposals/`.

## Newly implemented hiring-desk review items

- Decide whether public LinkedIn excerpt searches and any existing verified enrichment are acceptable for each workspace; no public excerpt is a verified candidate skill.
- Review the extractive transcript wording and practical-exercise workflow with hiring/legal stakeholders before treating any result as a hiring signal.
- Confirm the reminder timezone/ownership policy and whether the existing activities collection is the desired long-term audit store.
# Candidate report follow-up

- New report ratings and summary are provisional AI interpretations with exact transcript references. They require human-labelled accuracy evaluation before promising superiority to competitors or verified candidate ability.
- Existing interviews need one explicit Generate AI assessment action to populate the new structured report; page reads do not invoke AI. No paid provider or shared database was contacted during this change.
- Assessment generation reuses valid saved reports for sequential requests. Concurrent duplicate requests still need a transactional lock design; no schema or worker change was made.
- Historical LinkedIn/portfolio values cannot be recovered from an application form that did not ask for them. Edit profile supports adding them; new applications collect them.
- Protected hashes have not been advanced for this report change; the old guard baseline cannot certify the newly authorized interview changes as unchanged. The worktree already contains unrelated auth, lockfile and discovery changes that were preserved.
