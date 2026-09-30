# Candidate interview report

The candidate page opens on Interview report. Profile, Applications and Activity are separate keyboard-accessible panels. Completed interviews show their saved responses immediately; assessment is an explicit recruiter action.

## Using existing interviews

1. Open the candidate and select Interview report.
2. Select Generate AI assessment once. This invokes the existing configured provider and saves the result in the existing interview_ai_evaluations collection. It may incur provider usage.
3. Review the separate summary, provisional skill ratings and linked full answers. Return using Candidate report after generation.
4. Use Open reviewer scorecard for human marks. Use Open full review for the existing Advance / Hold / Reject actions.
5. Reopening the report reads the saved assessment. Update AI assessment intentionally makes another provider call. Sequential Generate requests reuse an existing valid report; concurrent requests are not transactionally deduplicated.

## Meaning of the ratings

Ratings are provisional model judgements of interview content on a 1–5 rubric, with technical reasoning and application as criteria. They are not verified career facts, personality measurements, calibrated probabilities, or a validated predictor of job performance. Unassessed skills are excluded from the average, and rated/total coverage is always visible.

The server checks skill scope, question identity, exact quote presence, rating bounds and duplicate criteria. Full source answers remain visible. Quote validation establishes provenance; it cannot establish semantic correctness. Human-labelled evaluation of realistic transcripts, including Hindi-English answers, negation and contradictions, is still needed before making accuracy claims or comparing against competitors.

LinkedIn and portfolio URLs are now optional registration fields, validated server-side and stored on the existing candidate record. Previously submitted profiles can be updated through Edit profile; old URLs are not inferred.

## Verification and remaining limits

No production/shared database or paid provider was used for verification. Browser checks use the actual report and tabs with clearly labelled fixture data at 390px and 1440px. The authenticated localhost candidate record was not inspected. The current workspace includes pre-existing unrelated changes; protected baseline drift must not be represented as an untouched protected zone.
