# Marketing claims audit

Evidence is limited to what is verifiable in this repository. Code presence does not prove production performance, legal compliance, certification, customer count, or commercial availability.

| Claim | Evidence in code (file/line or NONE) | Action |
|---|---|---|
| “AI recruitment that fills roles with your exact requirements” | Matching and evaluation modules exist, but outcome guarantee: NONE | Softened to “AI-assisted recruitment built around your role requirements.” |
| “Screen, interview and rank candidates while your team sleeps” | Screening/interview modules exist; unattended/outcome implication: NONE | Softened to “in one workflow.” |
| “10K+ resumes screened” / “10,000+ resumes” | NONE | Removed. Founder to provide substantiation before reuse. |
| “24/7 AI interviews” | Interview route exists at `app/interview/[token]/page.jsx`; availability/SLA: NONE | Changed to “On-demand AI interviews.” |
| “JD-based transparent scoring” | `lib/match-evaluation.mjs`, `app/dashboard/jobs/[jobId]/candidates/[candidateId]/evaluation/page.jsx` | Softened to “JD-based scoring breakdowns.” |
| Resume parsing, skill-gap flags and ranking | `lib/resume-text.js`, `lib/resume-review.mjs`, `lib/match-evaluation.mjs` | Retained as product description; no performance promise added. |
| Voice AI interviews with reviewable signals | `app/interview/[token]/VoiceInterview.jsx`, `app/dashboard/interviews/[interviewId]/candidate-response/page.jsx` | Softened to reviewable answers; no recording claim. |
| Candidate discovery across “every source” | NONE; configured discovery routes exist under `app/api/discovery/` | Changed to “configured talent sources.” |
| Funnel, bias and time-to-hire stats | Funnel/analytics code exists; bias-stat implementation: NONE | Removed “bias”; retained funnel/time reporting. |
| Auto-coordinated scheduling with no back-and-forth | Scheduling fields/actions exist; full automation: NONE | Softened to “Tools for coordinating interview rounds.” |
| “SOC-2 grade data isolation” | Certification/audit evidence: NONE | Removed; replaced with workspace-scoped access and data-rights controls. |
| “Enterprise Privacy” | Enterprise privacy assurance: NONE | Renamed “Workspace Privacy.” |
| “Fair at every skill level” | Fairness validation evidence: NONE | Removed from blog cards. |
| “Why 9-day hiring is the new 30-day hiring” | NONE | Replaced with a non-numeric editorial title. |
| “Shortlists delivered in days, not weeks” / “7-day turnaround” | NONE | Removed; timeline is now agreed during scoping. |
| Free plan availability | Internal entitlement named `free` in `lib/entitlements.mjs`; public commercial offer/effective terms: NONE | Removed from public pricing copy pending founder confirmation. |
| “Unlimited AI interviews” | Internal entitlements may use non-finite limits, but public commercial promise: NONE | Removed; capacity is explicitly agreed. |
| “₹8,000 per month” | Public copy only; approved price evidence: NONE | Replaced with `TODO_PRICING` custom-pricing placeholder. |
| “₹200 / role” | Public copy only; approved price evidence: NONE | Removed and replaced with `TODO_PRICING` contact placeholder. |
| “Price of a coffee” | NONE | Removed. |
| “Clear costs, no hidden fees” | Contract/commercial evidence: NONE | Removed; scope and usage are confirmed before purchase. |
| ATS compatibility/export | Export/ATS integration evidence sufficient for the broad FAQ answer: NONE | FAQ answer changed to “Contact us.” |
| Candidate data isolated to workspace | Workspace filtering/authorization appears in `lib/workspace-page.js`, `lib/pocketbase.js`, and dashboard actions | Softened to “records are scoped to a workspace”; security review still required. |
| Access, export and deletion controls | Deletion/data-rights routes exist; general export control: NONE | FAQ mentions only verifiable data-rights/erasure route and asks users to contact for details. |
| Human-led hiring | Human review language exists in `app/privacy/page.jsx` and review UIs | Retained where used; final-decision language is included only in the draft consent module. |
| “Illustrative candidate data” / sample reports | Labels in `app/components/DiscoveryTablet.jsx` and `app/ReportsPreview.jsx` | Retained. Existing sample content stays labeled illustrative. |
