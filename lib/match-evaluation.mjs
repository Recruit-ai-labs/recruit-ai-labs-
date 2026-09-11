import { createHash } from 'node:crypto';

export const MATCH_SCHEMA = { type: 'object', additionalProperties: false, required: ['must_have', 'nice_to_have', 'experience', 'knockouts', 'strengths', 'gaps', 'interview_questions', 'warnings', 'confidence'], properties: {
  must_have: { type: 'array', items: criterionSchema() }, nice_to_have: { type: 'array', items: criterionSchema() },
  experience: criterionSchema(), knockouts: { type: 'array', items: criterionSchema() },
  strengths: { type: 'array', items: { type: 'string' } }, gaps: { type: 'array', items: { type: 'string' } },
  interview_questions: { type: 'array', items: { type: 'string' } }, warnings: { type: 'array', items: { type: 'string' } },
  confidence: { type: 'number', minimum: 0, maximum: 1 },
} };

function criterionSchema() { return { type: 'object', additionalProperties: false, required: ['criterion', 'status', 'evidence', 'rationale'], properties: { criterion: { type: 'string' }, status: { type: 'string', enum: ['met', 'partial', 'not-met', 'unknown'] }, evidence: { type: ['string', 'null'] }, rationale: { type: 'string' } } }; }
const clean = (value, max = 500) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
const list = (value, limit) => Array.isArray(value) ? value.slice(0, limit) : [];
const statuses = new Set(['met', 'partial', 'not-met', 'unknown']);

function normalizeCriterion(item, corpus, warnings, label) {
  const criterion = clean(item?.criterion, 240); const status = statuses.has(item?.status) ? item.status : 'unknown';
  const quote = clean(item?.evidence, 300); const normalizedCorpus = corpus.toLowerCase().replace(/\s+/g, ' '); const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ');
  let verified = quote && normalizedCorpus.includes(normalizedQuote) ? quote : '';
  if (!verified && ['met', 'partial'].includes(status)) {
    const terms = criterion.toLowerCase().split(/[^a-z0-9.+#-]+/).filter((term) => term.length >= 3 && !['must', 'have', 'with', 'years', 'experience'].includes(term));
    verified = corpus.split(/\n+/).map((line) => clean(line, 300)).filter((line) => terms.some((term) => line.toLowerCase().includes(term))).sort((a, b) => a.length - b.length)[0] || '';
  }
  let finalStatus = status;
  if (status !== 'unknown' && !verified) { finalStatus = 'unknown'; warnings.push(`${label}: claim had no verifiable candidate evidence.`); }
  return { criterion, status: finalStatus, evidence: verified || null, rationale: clean(item?.rationale, 500) || 'No rationale supplied.' };
}

export function normalizeMatchEvaluation(raw, { job, evidenceCorpus }) {
  if (!raw || typeof raw !== 'object') throw new Error('The AI response was not a structured object.');
  const warnings = list(raw.warnings, 20).map((x) => clean(x, 240)).filter(Boolean);
  const normalizeGroup = (items, expected, label) => expected.map((criterion, index) => normalizeCriterion({ ...(items?.[index] || {}), criterion }, evidenceCorpus, warnings, `${label} ${criterion}`));
  const data = {
    must_have: normalizeGroup(raw.must_have, job.must_have_skills || [], 'Must-have'),
    nice_to_have: normalizeGroup(raw.nice_to_have, job.nice_to_have_skills || [], 'Nice-to-have'),
    experience: normalizeCriterion(raw.experience || { criterion: `${job.experience_min}-${job.experience_max} years`, status: 'unknown' }, evidenceCorpus, warnings, 'Experience'),
    knockouts: normalizeGroup(raw.knockouts, job.knockout_criteria || [], 'Knockout'),
    strengths: list(raw.strengths, 8).map((x) => clean(x, 300)).filter(Boolean), gaps: list(raw.gaps, 8).map((x) => clean(x, 300)).filter(Boolean),
    interview_questions: list(raw.interview_questions, 8).map((x) => clean(x, 300)).filter(Boolean), warnings: [...new Set(warnings)].slice(0, 20),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
  };
  return { ...data, ...scoreMatch(data, job) };
}

export function scoreMatch(data, job) {
  const value = { met: 1, partial: .5, 'not-met': 0, unknown: 0 };
  const groups = [];
  if (data.must_have.length) groups.push([60, data.must_have]);
  if (data.nice_to_have.length) groups.push([20, data.nice_to_have]);
  if (job.experience_min !== null && job.experience_min !== undefined) groups.push([20, [data.experience]]);
  const activeWeight = groups.reduce((sum, [weight]) => sum + weight, 0) || 1;
  let score = groups.reduce((sum, [weight, items]) => sum + weight * items.reduce((s, item) => s + value[item.status], 0) / items.length, 0) * 100 / activeWeight;
  const knockoutFailed = data.knockouts.some((item) => item.status === 'not-met'); const unknown = [...data.must_have, data.experience, ...data.knockouts].some((item) => item.status === 'unknown');
  if (knockoutFailed) score = Math.min(score, 39); score = Math.round(score);
  const recommendation = knockoutFailed ? 'not-match' : unknown ? 'review' : score < 45 ? 'not-match' : score < 70 ? 'review' : score >= 85 ? 'strong-match' : 'match';
  return { overall_score: score, recommendation };
}

export function fingerprint(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

export function candidateEvidenceCorpus(candidate, extraction) {
  const data = extraction?.structured_data || {}; const facts = data.candidate || {};
  return [candidate.current_title, candidate.current_company, candidate.location, candidate.total_experience !== null ? `${candidate.total_experience} years` : '', candidate.summary,
    ...(candidate.skills || []), facts.current_title, facts.current_company, facts.location, facts.summary,
    ...(data.skills || []).flatMap((x) => [x.name, x.evidence]), ...(data.experience || []).flatMap((x) => [x.company, x.title, x.evidence, ...(x.highlights || [])]),
    ...(data.education || []).flatMap((x) => [x.institution, x.degree, x.field, x.evidence]), ...(data.certifications || []).flatMap((x) => [x.name, x.issuer, x.evidence]),
  ].filter(Boolean).join('\n');
}
