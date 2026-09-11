import test from 'node:test'; import assert from 'node:assert/strict';
import { candidateEvidenceCorpus, fingerprint, normalizeMatchEvaluation, scoreMatch } from '../lib/match-evaluation.mjs';

const job = { experience_min: 3, experience_max: 6, must_have_skills: ['TypeScript', 'PostgreSQL'], nice_to_have_skills: ['React'], knockout_criteria: ['Must have production experience'] };
const corpus = 'Skills: TypeScript, React, PostgreSQL\n5 years experience\nBuilt production recruiting systems';

test('normalizes every job criterion in original order and verifies evidence', () => {
  const raw = { must_have: [{ criterion: 'wrong label', status: 'met', evidence: 'Skills: TypeScript, React, PostgreSQL', rationale: 'Shown' }, { status: 'met', evidence: 'Skills: TypeScript, React, PostgreSQL', rationale: 'Shown' }], nice_to_have: [{ status: 'met', evidence: 'Skills: TypeScript, React, PostgreSQL', rationale: 'Shown' }], experience: { criterion: '3-6 years', status: 'met', evidence: '5 years experience', rationale: 'Within range' }, knockouts: [{ status: 'met', evidence: 'Built production recruiting systems', rationale: 'Explicit' }], strengths: ['Relevant stack'], gaps: [], interview_questions: ['Discuss system scale'], warnings: [], confidence: .9 };
  const result = normalizeMatchEvaluation(raw, { job, evidenceCorpus: corpus });
  assert.deepEqual(result.must_have.map((x) => x.criterion), job.must_have_skills);
  assert.equal(result.overall_score, 100); assert.equal(result.recommendation, 'strong-match');
});

test('downgrades unsupported positive and negative claims to unknown', () => {
  const raw = { must_have: [{ status: 'met', evidence: 'Invented TypeScript proof' }, { status: 'not-met', evidence: null }], nice_to_have: [], experience: { status: 'unknown' }, knockouts: [{ status: 'not-met', evidence: 'Invented contradiction' }], strengths: [], gaps: [], interview_questions: [], warnings: [], confidence: .7 };
  const result = normalizeMatchEvaluation(raw, { job, evidenceCorpus: corpus });
  assert.equal(result.must_have[0].status, 'met'); assert.equal(result.must_have[1].status, 'unknown'); assert.equal(result.knockouts[0].status, 'unknown'); assert.equal(result.recommendation, 'review');
});

test('deterministic scoring caps an evidenced knockout failure', () => {
  const result = scoreMatch({ must_have: [{ status: 'met' }, { status: 'met' }], nice_to_have: [{ status: 'met' }], experience: { status: 'met' }, knockouts: [{ status: 'not-met' }] }, job);
  assert.equal(result.overall_score, 39); assert.equal(result.recommendation, 'not-match');
});

test('candidate corpus uses approved structured evidence and fingerprints changes', () => {
  const a = candidateEvidenceCorpus({ current_title: 'Engineer', location: 'Pune', total_experience: 5, skills: ['React'] }, { structured_data: { candidate: {}, skills: [{ name: 'TypeScript', evidence: 'Skills: TypeScript' }], experience: [] } });
  assert.match(a, /Skills: TypeScript/); assert.notEqual(fingerprint({ a: 1 }), fingerprint({ a: 2 }));
});
