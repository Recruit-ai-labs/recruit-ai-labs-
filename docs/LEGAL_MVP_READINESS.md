# Recruit AI — Legal MVP Readiness Register

**Purpose:** internal launch-readiness checklist for an MVP pilot. This is an operational checklist, not legal advice. Have an Indian CS/CA/privacy lawyer confirm the final documents before collecting live candidate data or signing customers.

**Current assessment (26 September 2026):** the product has privacy, data-rights and terms pages, but the contracting entity, registered address, business contacts, retention schedule, vendor contracts and customer data-processing terms are not yet confirmed. The public Gmail address currently used for data rights should be replaced with a controlled company mailbox before launch.

## P0 — must be filled before a live pilot

| Item | What must be decided or written | Current status / owner input |
|---|---|---|
| Contracting identity | Legal name, entity type, incorporation/registration number, registered office, jurisdiction, authorised signatory | **Missing — founder/CS** |
| Tax and billing | PAN, GST registration/threshold position, invoice details, payment-account owner, refund/cancellation policy | **Missing — CA/founder** |
| Official contacts | `legal@`, privacy/data-rights mailbox, security incident mailbox, support address and escalation owner | **Missing — founder**; current page uses a personal Gmail address |
| Customer agreement | Order form/beta agreement covering scope, fees, taxes, renewal, suspension, termination, SLA/support, liability cap, indemnity, confidentiality and dispute notice | **Missing — legal** |
| Data Processing Addendum | Customer/employer and Recruit AI roles, documented instructions, confidentiality, security, subprocessors, breach notice, deletion/return, rights assistance and audit cooperation | **Missing — legal/privacy** |
| Privacy notice | Entity/controller identity, data categories, purposes, notice/consent route, recipients, transfers, retention periods, security summary, rights route and grievance escalation | **Partially present — needs facts and counsel review** |
| Candidate notice and consent | Separate candidate-facing notice for resume ingestion, AI extraction/scoring, interview recording/transcription, reference/background checks (if used), withdrawal and human-review route | **Partially implemented in product; document missing** |
| Retention/deletion schedule | Per-record-class periods: leads, accounts, resumes, interview audio/transcripts, vetting evidence, billing, security logs and backups; deletion owner and proof | **Missing — product/privacy** |
| Security and incident plan | Access control, MFA/admin review, secrets, encryption, backups, vendor contacts, incident severity, evidence preservation, notification and CERT-In escalation owner | **Missing — security** |
| Vendor/subprocessor register | Vendor, purpose, data fields, processing region, retention, DPA/terms, transfer mechanism and offboarding status | **Missing — ops/privacy** |

## P1 — required before broader public launch

- Incorporate/confirm the operating entity and execute founder, employee and contractor confidentiality/IP-assignment agreements.
- Maintain an asset and data map for Clerk, PocketBase/Turso, Vercel Blob, AI providers (OpenRouter/NVIDIA), email providers, Dodo Payments and search/enrichment providers.
- Decide whether Recruit AI is a Data Fiduciary for each flow or only a processor acting on the employer's instructions. Do not describe the role generically where the contract needs a flow-specific answer.
- Add a cookie/analytics notice and consent record for any non-essential analytics or marketing technology; document the actual vendors used.
- Publish an AI use and human-review policy: intended use, prohibited discriminatory criteria, quality limits, appeal/review route, model/provider changes and customer responsibility for final decisions.
- Add child-data and sensitive-data handling rules, or explicitly prohibit those use cases in onboarding and acceptable-use terms.
- Maintain a data-rights request log with identity-verification, response, deletion/exception and escalation fields.
- Run a DPIA/threat model for resume, voice and vetting flows; test tenant isolation, IDOR, deletion, export and access logging.
- Keep security logs and an incident contact process aligned with applicable CERT-In directions; confirm the responsible point of contact and retention implementation.

## Documents to create

1. Customer Terms / Beta Order Form
2. Data Processing Addendum and Subprocessor Schedule
3. Privacy Notice (service users and candidates, with role-specific wording)
4. Candidate Notice & Consent record specification
5. Data Retention and Deletion Schedule
6. Security Measures and Incident Response Policy
7. AI Use, Human Review and Fair Hiring Policy
8. Cookie/Analytics Notice
9. Vendor due-diligence and offboarding register
10. Founder/employee/contractor IP and confidentiality agreements

## Product changes that should follow the documents

- Replace the personal data-rights email with the controlled mailbox and name the grievance owner.
- Store consent version, timestamp, notice version, purpose, source and withdrawal status for every candidate flow.
- Add workspace-level export, deletion and retention controls; record exceptions rather than silently retaining data.
- Add an admin-visible audit trail for candidate access, downloads, AI runs, score changes and deletion requests.
- Make subprocessors configurable/visible in the customer agreement and keep provider secrets out of client-side code.
- Add a clear beta label, support channel and incident-report link until SLA and production support commitments are approved.

## Founder decisions still needed

```text
Registered legal name:
Entity type and registration number:
Registered office / notice address:
Official legal/privacy/security email:
Contract signatory and title:
GST/PAN/invoicing position:
Pilot customers and countries:
Approved retention periods:
Approved AI providers and data regions:
Approved pricing, renewal and refund terms:
```

## Source baseline

- Digital Personal Data Protection Act, 2023: https://www.indiacode.nic.in/indiacode/handle/123456789/22037
- Digital Personal Data Protection Rules, 2025 (notified Gazette): https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
- CERT-In Directions under section 70B: https://www.cert-in.org.in/Directions70B.jsp

