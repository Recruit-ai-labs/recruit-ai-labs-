# Recruit AI — MVP Legal Pack (Draft for Counsel Review)

> Draft operational language only. Replace every `[FILL]` value and have Indian counsel review before publishing or signing.

## 1. Customer / Beta Order Form

**Provider:** `[FILL: registered legal entity]`, `[FILL: registered address]` (“Recruit AI”).  
**Customer:** `[FILL: customer legal name and address]`.  
**Effective date:** `[FILL]` · **Pilot term:** `[FILL]`.

Recruit AI provides recruitment workflow and AI-assisted evidence tools. The customer remains responsible for lawful candidate collection, notices, hiring decisions, employment-law compliance and human review. The service is beta software; availability, support contact and service limits are `[FILL]`.

Fees, taxes, billing cycle, renewal, cancellation and refunds: `[FILL]`. Either party may terminate for material breach after `[FILL]` days’ notice; on termination Recruit AI will return/delete customer data according to the retention schedule and any legal hold.

Each party keeps the other’s confidential information secret. Customer owns its candidate and job data. Recruit AI owns its platform, models, prompts and aggregated de-identified service analytics. Neither party grants more rights than necessary to perform this agreement.

The customer must not use the service to discriminate, make a solely automated adverse hiring decision, upload unlawful data, or attempt unauthorised access. Liability cap, indemnities, warranties, governing law and dispute venue: `[FILL after counsel review]`.

## 2. Data Processing Addendum

For customer-provided candidate and hiring data, the customer is the party deciding hiring purposes and Recruit AI acts only on documented instructions, except where law requires otherwise. For account, billing, security and support data, the parties must confirm the applicable roles in the order form.

Recruit AI will: (a) process data only for the documented service; (b) limit access to authorised personnel; (c) bind personnel to confidentiality; (d) maintain reasonable technical and organisational safeguards; (e) notify the customer of a confirmed personal-data incident without undue delay; (f) assist with access, correction, erasure and investigations reasonably; and (g) delete or return customer data at termination subject to legal/security retention.

Approved subprocessors, purposes, regions and contract status must be maintained in `docs/legal/SUBPROCESSOR_REGISTER.md`. New subprocessors require notice and a customer objection route `[FILL]`. Cross-border processing and transfer safeguards: `[FILL]`.

## 3. Candidate Notice & Consent

Before submission, the candidate must receive the current privacy notice and be told: (1) what data is collected; (2) why it is used; (3) the hiring organisation and Recruit AI’s roles; (4) any resume extraction, AI matching, voice recording, transcription or third-party processing; (5) retention period; (6) how to withdraw consent, request correction/erasure or raise a grievance; and (7) that a human remains responsible for the final hiring decision.

The product must store notice version, consent text/version, timestamp, source, purpose, identity/workspace and withdrawal status. Optional voice recording, reference checks and background checks require separate affirmative consent where applicable. Refusal or withdrawal must not be represented as agreement.

## 4. Retention Schedule

| Record | Proposed default | Owner / deletion evidence |
|---|---:|---|
| Demo/contact leads | `[FILL]` months | Growth / deletion log |
| Workspace/account data | Term + `[FILL]` days | Support / export + deletion log |
| Resumes and candidate profiles | Hiring process + `[FILL]` days | Customer admin |
| Interview audio/transcripts | `[FILL]` days after review | Hiring admin |
| Vetting evidence | `[FILL]` days after decision | Hiring admin |
| Billing/tax records | `[FILL]` years | Finance |
| Security/audit logs | `[FILL]` days/months | Security |
| Backups | `[FILL]` days | Infrastructure |

Legal holds, active disputes and security investigations must be recorded as exceptions with an owner and expiry review date.

## 5. Security & Incident Response

Maintain MFA for privileged access, least-privilege workspace isolation, secret rotation, encrypted transport/storage where supported, backups and restore tests, dependency patching, vendor contacts, access logging and quarterly access review. Record incident time, systems/data affected, containment, evidence, notifications, corrective action and closure owner. Security contact: `[FILL]`; incident point of contact: `[FILL]`.

## 6. Required sign-off before pilot

- [ ] Entity, address, tax and official contacts verified
- [ ] Counsel approved Terms, Privacy Notice, DPA and Candidate Notice
- [ ] Customer signed order form/DPA
- [ ] All vendors recorded and contractual status checked
- [ ] Retention periods and deletion jobs tested
- [ ] Consent versioning and withdrawal tested
- [ ] Tenant isolation, access logs, export and deletion tested
- [ ] Incident owner and escalation contacts tested

