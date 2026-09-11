# UI and security review — 2026-09-07

## Fix status (updated after implementation)

The findings below are the original audit history. The requested fixes have now been implemented:

- Resume protection migration applied to the local database. Anonymous fixture download returns 404; an authorized short-lived file token returns the PDF.
- Public registration and interview access require a verified Clerk email matching the candidate. Protected PocketBase routes are accessible only to the Next.js superuser client.
- Registration and completion use database transactions. Completion rechecks candidate consent, application status, campaign status and expiry; it preserves later pipeline stages and supports repeated/concurrent submissions safely.
- Persistent account/campaign rate limits and bounded browser integrity events added. Closing a campaign invalidates its candidate sessions. Legacy token sessions receive seven-day expiry and missing questions are populated.
- Direct invitations generate questions, convert local times into UTC in the browser, expose the meeting URL, and show clear eligibility requirements.
- Active interviewers and hiring managers can submit scorecards. Disabled members cannot.
- Invitation failure preserves entered values. Owners/admins can change allowed roles or disable team access. Owners/self-access are protected; expired invitation links are no longer offered for copying. Multiple memberships and workspace switching are supported.
- Interview drafts recover across refresh within the tab for up to 24 hours and clear on successful submission.
- Jobs, candidates, interviews and campaign lists have pagination. Analytics reads every page; existing campaign links can be copied again and links can only be created for open jobs.
- Interview AI nested output is validated and quotations are checked against candidate answers. Unsupported findings are dropped/downgraded; previously stored evaluations are validated before display.

Validation: 44 automated tests passed, including live PocketBase protected-file and transactional interview checks; 11 Chromium component interactions passed. Browser server actions are mocked; the database/security integration tests use synthetic records and real local endpoints. Production build passed. A database backup was requested before migration, and PocketBase was restarted with the required hooks and migrations directories. Startup instructions are in POCKETBASE_SETUP.md.

Still outside this verification: deployed signed-in end-to-end Clerk onboarding, real email delivery, live AI quality, mobile layout, deployment headers/external exposure, dependency advisories and backup restore. This is not a claim that all possible security vulnerabilities have been eliminated.

## Original audit history

This is an inspection report, not a security certification. Application code was not changed during this review. Synthetic database fixtures were cleaned up by the integration test. No real emails were sent.

## Checks run

- Existing eight Chromium component interaction checks passed again. These use mocked server actions.
- Existing eight action regression tests passed again.
- Additional isolated execution of real action code reproduced public interview token disclosure, missing direct-invite questions, unconditional application stage updates, and interviewer scorecard denial.
- Live configured PocketBase test with a synthetic PDF: anonymous file request returned HTTP 200; candidates.resume protected flag was false. The same test confirmed that public candidate collection listing is blocked.
- Additional Chromium check reproduced invitation form data loss on an action error.

## Highest priority security findings

1. **Public interview impersonation — critical.** `app/interview/apply/[token]/actions.js:21` finds an existing candidate by submitted email and redirects to their scheduled interview token without verifying email ownership. Reproduced with isolated records; no actual candidate was accessed. Verify identity before reusing or issuing a private interview session.
2. **Anonymous resume download — high.** `pb_migrations/1725600000_recruit_ai_foundation.js:81` does not mark the resume file protected. A known direct PocketBase file URL returned the synthetic PDF without authorization. The authenticated Next.js resume route does not protect that alternate route. Internet exposure of the database endpoint was not assessed. Protect file storage and verify both direct and authenticated download paths.
3. **Submission bypasses current candidate/application state — high.** `app/interview/[token]/actions.js:7` checks only interview token/status; it does not recheck consent, candidate status or current application stage. Submission unconditionally writes screening after saving completed answers. Reproduced with isolated actions. A pending interview can move a later-stage application backward; a failure between the writes leaves inconsistent state. Add explicit eligibility/transition checks and atomic/idempotent completion.
4. **Abuse and expiry controls — code-review gap.** No application-level public-application rate limiting, interview-token expiry or persisted fullscreen/tab-switch integrity events were found. Infrastructure protections were not verified. Closing a campaign stops registration but does not invalidate already issued interview sessions.
5. **Interview AI output validation — code-review gap.** `lib/nim-interview.js:10` accepts nested strengths/risks/skill signals without checking their types or verifying quoted evidence against answers. Unsupported claims can be shown; malformed nested objects can break rendering. No live model attack was performed.

## Remaining UI/workflow gaps

1. **Direct candidate invite is a dead end.** `app/dashboard/jobs/[jobId]/candidates/[candidateId]/interview/actions.js:4` creates a token but no candidate_questions. `app/interview/[token]/page.jsx:13` consequently displays “Your interview is being prepared.” No background question-generation path was found. The page also does not show the meeting URL promised by the recruiter UI. The separate direct-invite scheduler still converts timezone-less dates on the server, unlike the fixed general scheduler.
2. **Interviewer role cannot submit scorecards.** Settings now permits inviting interviewers, but `submitScorecardAction` in `app/dashboard/interviews/actions.js` uses canManageCandidates, which excludes them. The scorecard form is displayed anyway and does not explain the forbidden notice. Denial reproduced through the real action with mocked dependencies.
3. **Invitation failure clears form inputs.** The new InviteForm uses uncontrolled name/email fields; returning an action error resets them. Reproduced in Chromium with a simulated action failure. Preserve form values on failed submissions.
4. **Team access management is incomplete.** Settings can revoke pending invitations, but there is no UI to disable/remove an active member or change their role. Expired invites still look pending and expose a copy button. Joining a second workspace is explicitly blocked.
5. **Interview drafts disappear on refresh.** VoiceInterview stores answers in component state only; no draft persistence/recovery is implemented. This is a code finding, not a browser recovery test in this review.
6. **Lists and analytics remain capped.** Jobs/candidates fetch 50 records without pagination, interviews default to 30, and analytics calculates breakdowns from the first 500 while using full totals. Search now supports pagination, but the original lists and analytics are still incomplete for larger workspaces.
7. **Public link management is incomplete.** The existing campaign list has no copy/open control for an older active link. The copy UI depends on the just-created invite query parameter. The create action also allows non-open jobs, while application registration requires an open job, so a generated link can immediately be unusable.

## Limits

This review did not verify a deployed signed-in end-to-end journey, live email delivery, live AI output, mobile layout, deployment headers, external network exposure, dependency advisories, backup recovery or concurrent requests. Passing the component tests does not establish that every feature works end to end.
