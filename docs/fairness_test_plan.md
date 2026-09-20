# Manual fairness test plan

This protocol tests product behavior; it does not certify that the system is unbiased or legally compliant. Use fictitious candidates and non-production workspaces only. Do not send real personal data to providers.

## Method

1. Create job-relevant answer scripts with equivalent evidence and meaning.
2. Record controlled variants: multiple Indian and international English accents; Hindi-English code-switching; slower/faster pace; pauses, stutter, monotone and expressive delivery; typed accessibility fallback.
3. Keep microphone, room, device, question order and substantive answer content as constant as practical.
4. Run at least 10 repetitions per variant. Have two human reviewers independently compare transcript fidelity, completion, follow-ups and resulting evidence—not personality.
5. Record provider/model/version, browser/device, date and feature flags. Never “tune to pass” a protected group; investigate the underlying failure mode.
6. Escalate material disparities for product, legal and accessibility review before release. Do not change protected scoring/interview code under this maintenance task.

## Measures

- Word error rate and job-relevant fact omissions/additions.
- Microphone/start/stop failures and interview completion rate.
- Whether equivalent evidence receives equivalent treatment.
- Follow-up frequency and relevance.
- Human-reviewer disagreement and accessibility fallback success.

## Results table

| Test ID | Accent / language mix | Speaking style | Device/browser | Provider/model version | Transcript fidelity | Completion | Follow-ups | Evidence outcome | Reviewer notes | Pass/Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| FT-001 | [TODO] | [TODO] | [TODO] | [TODO] | [TODO] | [TODO] | [TODO] | [TODO] | [TODO] | [TODO] |

## Exit criteria

Define thresholds with legal/accessibility input before testing: [TODO_THRESHOLDS]. Any systematic job-relevant omission, materially different follow-up burden, or completion barrier is a release risk requiring documented review.
