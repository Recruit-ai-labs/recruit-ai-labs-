import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionCandidateStatus, matchesResumeSignature, normalizeCandidateInput, validateCandidate, validateResume } from '../lib/candidate-validation.mjs';

const valid = { first_name: 'Asha', last_name: 'Rao', email: 'ASHA@example.com', source: 'referral', consent_status: 'obtained', data_attested: 'yes', total_experience: '5.5', notice_period_days: '30', linkedin_url: 'https://linkedin.com/in/asha', skills: 'React\nTypeScript\nReact' };

test('normalizes candidate email, numeric fields and unique skills', () => {
  const input = normalizeCandidateInput(valid);
  assert.equal(input.email, 'asha@example.com');
  assert.equal(input.total_experience, 5.5);
  assert.equal(input.notice_period_days, 30);
  assert.deepEqual(input.skills, ['React', 'TypeScript']);
});

test('accepts a valid candidate record', () => {
  assert.equal(validateCandidate(normalizeCandidateInput(valid)).valid, true);
});

test('requires identity, source and lawful-data attestation', () => {
  const result = validateCandidate(normalizeCandidateInput({ first_name: '', email: 'bad', source: '', data_attested: false }));
  assert.ok(result.errors.first_name); assert.ok(result.errors.email); assert.ok(result.errors.source); assert.ok(result.errors.data_attested);
});

test('rejects invalid URLs and experience boundaries', () => {
  const result = validateCandidate(normalizeCandidateInput({ ...valid, linkedin_url: 'not-a-url', total_experience: '90', notice_period_days: '500' }));
  assert.ok(result.errors.linkedin_url); assert.ok(result.errors.total_experience); assert.ok(result.errors.notice_period_days);
});

test('validates resume size, type and binary signatures', () => {
  assert.equal(validateResume({ size: 100, type: 'text/plain' }).valid, false);
  assert.equal(validateResume({ size: 11 * 1024 * 1024, type: 'application/pdf' }).valid, false);
  assert.equal(matchesResumeSignature(new TextEncoder().encode('%PDF-1.4'), 'application/pdf'), true);
  assert.equal(matchesResumeSignature(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), true);
  assert.equal(matchesResumeSignature(new TextEncoder().encode('hello'), 'application/pdf'), false);
});

test('enforces candidate status transitions', () => {
  assert.equal(canTransitionCandidateStatus('active', 'do-not-contact'), true);
  assert.equal(canTransitionCandidateStatus('archived', 'active'), true);
  assert.equal(canTransitionCandidateStatus('archived', 'do-not-contact'), false);
});
