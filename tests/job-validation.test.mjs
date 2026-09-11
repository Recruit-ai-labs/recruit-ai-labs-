import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionJobStatus, normalizeJobInput, validateJob } from '../lib/job-validation.mjs';

const validSource = {
  title: 'Senior Backend Engineer', department: 'Engineering', location: 'Bengaluru, India',
  workplace_type: 'hybrid', employment_type: 'full-time', openings: '2', experience_min: '4', experience_max: '8',
  hiring_manager_name: 'Hiring Manager', hiring_manager_email: 'manager@example.com', priority: 'high',
  salary_min: '1800000', salary_max: '2800000', currency: 'inr',
  must_have_skills: 'Node.js\nPostgreSQL\nNode.js', nice_to_have_skills: 'AWS, Kafka',
  knockout_criteria: 'Can work required overlap hours',
  responsibilities: 'Own backend services, reliability, architecture decisions and engineering delivery.',
  description: 'Join the engineering team to build reliable recruitment infrastructure used by growing hiring teams across multiple workflows.',
};

test('normalizes numeric, currency and list fields', () => {
  const input = normalizeJobInput(validSource);
  assert.equal(input.openings, 2);
  assert.equal(input.currency, 'INR');
  assert.deepEqual(input.must_have_skills, ['Node.js', 'PostgreSQL']);
  assert.deepEqual(input.nice_to_have_skills, ['AWS', 'Kafka']);
});

test('accepts a complete publishable job', () => {
  const result = validateJob(normalizeJobInput(validSource));
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('rejects invalid experience and salary ranges', () => {
  const result = validateJob(normalizeJobInput({ ...validSource, experience_min: '9', experience_max: '4', salary_min: '30', salary_max: '20' }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.experience_max);
  assert.ok(result.errors.salary_max);
});

test('requires meaningful criteria and role context before publish', () => {
  const result = validateJob(normalizeJobInput({ ...validSource, must_have_skills: '', responsibilities: 'Short', description: 'Too short' }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.must_have_skills);
  assert.ok(result.errors.responsibilities);
  assert.ok(result.errors.description);
});

test('allows an incomplete draft only when title is valid', () => {
  assert.equal(validateJob(normalizeJobInput({ title: 'Draft role' }), { draft: true }).valid, true);
  assert.equal(validateJob(normalizeJobInput({ title: '' }), { draft: true }).valid, false);
});

test('rejects malformed manager email and unsupported selections', () => {
  const result = validateJob(normalizeJobInput({ ...validSource, hiring_manager_email: 'wrong', workplace_type: 'somewhere', employment_type: 'forever' }));
  assert.ok(result.errors.hiring_manager_email);
  assert.ok(result.errors.workplace_type);
  assert.ok(result.errors.employment_type);
});

test('enforces the job status lifecycle', () => {
  assert.equal(canTransitionJobStatus('draft', 'open'), true);
  assert.equal(canTransitionJobStatus('open', 'paused'), true);
  assert.equal(canTransitionJobStatus('archived', 'open'), false);
  assert.equal(canTransitionJobStatus('draft', 'hired'), false);
});
