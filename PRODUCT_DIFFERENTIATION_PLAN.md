# Recruit AI: a product recruiters return to

Prepared 20 September 2026. This is a proposed roadmap, not a list of shipped features. The current implementation changes are LinkedIn-only discovery and responsive UI improvements.

## 1. Positioning: choose a specific customer first

Recommended starting segment: Indian technical recruitment agencies managing several client roles. Their recurring pain is not simply finding another profile: it is agreeing on requirements, defending a shortlist, collecting client feedback, and keeping every role moving. Validate this with five agency interviews before expanding the roadmap.

Positioning: **“Turn a JD and a resume stack into a client-ready shortlist—with evidence behind every recommendation.”**

Do not compete on the longest feature list. Ashby already offers AI assistance, talent rediscovery and analytics; hireEZ offers sourcing, CRM and rediscovery; Greenhouse supports structured scorecards. Those are established product categories, not defensible uniqueness by themselves.

Sources reviewed: [Ashby AI](https://www.ashbyhq.com/ai), [Ashby analytics](https://www.ashbyhq.com/analytics), [hireEZ platform](https://www.hireez.com/platform/), [Greenhouse scorecards](https://support.greenhouse.io/hc/en-us/articles/4414777492891-Scorecard-overview). These are the vendors' own descriptions, not an independent quality comparison. The user's unnamed competitor has not been evaluated.

## 2. Remove friction before adding more modules

| Current friction | Proposed change | Why it matters |
| --- | --- | --- |
| Many similar navigation areas: intelligence, analytics, performance, vetting, assessments | Default navigation: Today, Jobs, Candidates, Screening, Discovery. Put reports and advanced tools behind their parent workflow. | Recruiters learn one hiring flow instead of a collection of menus. |
| Landing page leads with broad AI language and technology logos | Lead with the actual output: a reviewable shortlist and its evidence. Move stack/founder detail below the product proof. | Buyers immediately understand what they get. |
| Claims such as 10K+ screened, SOC-2-grade isolation, unlimited features, and turnaround promises | Publish only independently supportable claims that match actual entitlement and operational limits. Use real customer evidence with permission. | Trust survives the demo and procurement review. |
| Static blog tiles without working articles | Publish real useful guides or replace the section with a working product walkthrough. | Every CTA should deliver what its label promises. |
| An access request is required before a visitor can experience value | Add a no-sign-in sample workspace with fictional resumes. Keep real customer data and production access behind existing approval. | Buyers can understand the product immediately without changing the account-approval policy. |
| Bulk results live only in the current tab | Persist screening runs, rubric versions, decisions and notes in workspace-scoped records. | A recruiter can leave, return and collaborate without losing work. |

Discovery contact enrichment has been removed in this implementation. Real candidate contact data elsewhere in the ATS is outside this change and must not be deleted as part of this cleanup.

## 3. The first three product investments

### P0 — Saved screening runs and a client decision room

Connect bulk screening to a real job. Save the rubric, original evidence references, parsing warnings, candidate review status and recruiter decisions. Support resume deduplication per workspace, failed-file retry, refresh recovery and deletion controls. A run must show exactly which JD/rubric version produced the results.

Create an expiring, revocable client-review link scoped to one shortlist, with optional invited-viewer access. The client sees three to five candidates, evidence for each requirement, gaps to verify, and the recruiter's note. Actions: “Interview”, “Need clarification”, and “Not for this role”, with job-related reasons. Keep resume-download access separate from shortlist access. Record who changed what.

Acceptance: refreshing or returning on another device restores the run; a revoked link stops working; another workspace cannot access it; manager feedback appears against the correct candidate and rubric. Notify only the intended invited reviewers.

Why first: this closes today's largest gap between screening output and an actual hiring decision. It makes the product useful to the paying client as well as the recruiter.

### P1 — Explicit role calibration

Before screening a large batch, show three sample candidates and ask the recruiter which requirements are being misunderstood. Convert their feedback into proposed criterion edits: e.g. “production backend ownership is required; specific cloud provider is preferred.” Show the proposed changes and obtain the recruiter's approval before rescoring.

Store calibration by role/client. Explain ranking changes; keep old versions available. Do not silently learn that an employer's prestige, graduation year, name or personal characteristic predicts quality. A rejected candidate is not automatically a negative training label.

Acceptance: the same rubric produces comparable results across a batch; recruiter-approved changes have a visible before/after explanation; uncertainty and missing evidence remain visible.

Why it can differentiate: the workflow remembers the client's explicit requirements and decisions. This is a proposed advantage to validate, not a claim that competitors lack calibration.

### P1 — A useful “Today” inbox

Show a short actionable queue: completed batches awaiting review, client feedback received, interviews awaiting scorecards, and candidates waiting for a response. Each item has an owner, a due date when relevant, and a direct action. Order by actual blocked work, not invented urgency.

Offer a configurable digest with quiet hours and per-role controls. Do not send one notification for every candidate. When there is no hiring work, show a calm empty state.

Acceptance: recruiters can act without hunting across modules; completed items disappear; notifications deduplicate; owner changes and permissions are respected.

## 4. Add after the core loop works

| Priority | Capability | Concrete experience |
| --- | --- | --- |
| P2 | Candidate rediscovery | A new JD finds relevant candidates already in the permitted talent pool; show previous application context, evidence date and contact restrictions. Recruiter confirms before outreach. |
| P2 | Interview preparation from gaps | Generate a short role-specific question pack for the uncertain requirements; connect interviewer feedback to those requirements. |
| P2 | Reusable client/role templates | Save approved rubrics and interview plans, with ownership and version history. |
| P2 | Import/export and existing ATS handoff | Start with reliable CSV import/export and a shareable decision pack; add the first ATS integration only after identifying the provider used by pilot customers. |
| P3 | Outcome reporting | Track shortlist acceptance, review turnaround and time spent in each stage; distinguish recruiter decisions, AI suggestions and observed outcomes. |

The retention loop is: **new role → reviewable shortlist → client decision → approved role knowledge → faster next role**. Useful accumulated work makes returning attractive; access to a customer's own data should not depend on staying subscribed indefinitely.

## 5. Landing page that demonstrates the promise

Recommended content order:

1. **Hero:** “Your next shortlist. Every recommendation explained.” Supporting copy: “Screen resumes against your JD, review the evidence, and move the right conversations forward.” Primary CTA: “Try a sample shortlist.” Secondary: “Book a walkthrough.” Add the primary CTA only when its sample flow exists.
2. **A working sample:** three fictional candidates for one JD. Clicking a requirement reveals its evidence and the unresolved question. Clearly label sample data. No fabricated “live” counts or customer logos.
3. **A concrete comparison:** skills merely listed versus applied in a project, and why the level of evidence differs. Avoid claiming a score predicts hiring success.
4. **The actual workflow:** JD → review criteria → upload → inspect evidence → select shortlist → export. Until sharing is shipped, show export rather than a fake client portal.
5. **Customer proof:** one real, permissioned case study. Record starting batch size, review time, client acceptance and the measurement period. Publish a measured result only after a real pilot.
6. **Simple packaging:** one clearly bounded pilot offer and one team plan, with actual resume/interview limits, support scope and access requirements. Price against demonstrated value and provider costs; do not change billing until the unit economics are reviewed.
7. **Trust and FAQ:** supported file types, what leaves the browser, who can access data, how to delete/export it, parsing limitations and the recruiter's decision role. Link working documentation.

Shorten the mobile page. Product proof and the CTA should appear before a long founder story, infrastructure section, blog previews or decorative animation. Respect reduced-motion preferences; avoid rotating headlines that shift the layout.

## 6. Delivery sequence and validation

These are indicative stages, not guaranteed delivery dates; estimate after reviewing the database model and interviewing pilot customers.

| Stage | Scope | Exit condition |
| --- | --- | --- |
| Week 1 | Interview five agencies; simplify positioning; instrument the first-use funnel; ship a fictional sample walkthrough | A target recruiter understands the output and completes the sample without coaching. |
| Weeks 2–3 | Saved screening runs, role association, version history and client decision room | End-to-end pilot with restored runs, revocable links, isolated access and real feedback. |
| Weeks 4–5 | Approved role calibration and Today inbox | Repeat-role workflow uses saved criteria; recruiters act on feedback without manual reconciliation. |
| Week 6 onward | Rediscovery and the most-requested ATS integration | Pilot retention and shortlist acceptance justify expanding integration work. |

A proposed activation target is the first reviewed shortlist within ten minutes on a small, text-based sample batch. This is a target to measure—not a current performance claim or promise for 50 resumes.

Measure:

- Sample started → evidence opened → demo/access requested → approved workspace activation.
- Time to first reviewed shortlist, including parsing/provider failures.
- Hiring-manager acceptance of the proposed shortlist, with batch size and role context.
- Active-role teams returning to complete useful work during weeks 1 and 4; do not penalize teams with no open roles for lower daily usage.
- Review turnaround, unresolved feedback and candidate waiting time.
- Quality audits on a random sample of both shortlisted and unshortlisted candidates. Track false negatives and parser failures rather than optimizing acceptance alone.
- Cost per completed batch, including retries and model usage.

Choose the next investment based on these observations. AI feature count and minutes spent in the app are poor substitutes for a good hiring outcome.
