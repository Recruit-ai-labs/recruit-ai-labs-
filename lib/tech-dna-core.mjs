export const DNA_VERSION = 'evidence-dna/1.0';
export const QUESTION_LIMIT = 5;
export const EVENT_LIMIT = 3;
export const DIMENSIONS = [
  ['role_knowledge', 'Role knowledge'], ['problem_solving', 'Problem solving'],
  ['execution', 'Execution & ownership'], ['tradeoffs', 'Trade-off reasoning'],
  ['verification', 'Testing & verification'], ['communication', 'Explanation clarity'],
];
export function cleanText(value, limit = 2000) { return String(value ?? '').trim().slice(0, limit); }
export function validateBlueprint(raw, job) {
  const skills = Array.isArray(job.must_have_skills) ? job.must_have_skills : [];
  const criteria = (Array.isArray(raw.criteria) ? raw.criteria : []).slice(0, 8).map((c, i) => ({
    id: `c${i + 1}`, name: cleanText(c.name, 100), expectation: cleanText(c.expectation, 500),
    weight: Math.max(1, Math.min(5, Number(c.weight) || 1)),
  })).filter(c => c.name && c.expectation);
  if (criteria.length < 3) throw new Error('The role rubric was incomplete. Please retry.');
  return { version: DNA_VERSION, role: cleanText(raw.role || job.title, 160), mission: cleanText(raw.mission, 800), criteria, skills };
}
export function validateQuestion(raw, index, blueprint, previous = []) {
  const prompt = cleanText(raw.prompt, 1400);
  if (prompt.length < 20 || previous.some(q => q.prompt === prompt)) throw new Error('Sireen could not prepare a new question. Please retry.');
  const criterion = blueprint.criteria.find(c => c.id === raw.criterion_id) || blueprint.criteria[index % blueprint.criteria.length];
  return { id: `q${index + 1}`, prompt, criterion_id: criterion.id, purpose: cleanText(raw.purpose, 350) };
}
// Model-generated quotations are accepted only when they occur verbatim in the referenced answer.
export function validateDNA(raw, transcript, blueprint) {
  const normalize = (id, label, entries) => {
    const entry = (Array.isArray(entries) ? entries : []).find(x => x.id === id);
    const evidence = (Array.isArray(entry?.evidence) ? entry.evidence : []).slice(0, 5).flatMap(e => {
      const answer = transcript.find(t => t.id === e.question_id)?.answer || '';
      const quote = cleanText(e.quote, 700);
      return quote.length >= 12 && answer.includes(quote) ? [{ question_id: e.question_id, quote }] : [];
    });
    const rating = Number(entry?.rating);
    const valid = evidence.length > 0 && Number.isInteger(rating) && rating >= 1 && rating <= 5;
    return { id, label, rating: valid ? rating : null, evidence, finding: valid ? cleanText(entry.finding, 650) : 'Not enough verified answer evidence to assess this area.', probe: cleanText(entry?.probe, 350) };
  };
  const criteria = blueprint.criteria.map(c => ({ ...normalize(c.id, c.name, raw.criteria), weight: c.weight, expectation: c.expectation }));
  const dimensions = DIMENSIONS.map(([id, label]) => normalize(id, label, raw.dimensions));
  const assessed = criteria.filter(c => c.rating !== null);
  const totalWeight = criteria.reduce((n, c) => n + c.weight, 0);
  const coveredWeight = assessed.reduce((n, c) => n + c.weight, 0);
  const coverage = Math.round(100 * coveredWeight / totalWeight);
  const score = coveredWeight ? Math.round(assessed.reduce((n, c) => n + c.weight * c.rating / 5, 0) / coveredWeight * 100) : null;
  const strengths = assessed.filter(c => c.rating >= 4).map(c => c.label);
  const gaps = criteria.filter(c => c.rating === null).map(c => c.label);
  const developing = assessed.filter(c => c.rating <= 2).map(c => c.label);
  const summary = `${transcript.length} answers reviewed against ${blueprint.role}. ${assessed.length} of ${criteria.length} role criteria have quoted evidence. ${strengths.length ? `Stronger evidence: ${strengths.join(', ')}. ` : ''}${developing.length ? `Needs deeper review: ${developing.join(', ')}. ` : ''}${gaps.length ? `Not assessed: ${gaps.join(', ')}. ` : ''}Validate these interview signals with a work sample and human review.`;
  return { version: DNA_VERSION, criteria, dimensions, coverage, score, summary, confidence: transcript.length === 5 && coverage >= 75 ? 'Moderate evidence' : 'Limited evidence', generated_at: new Date().toISOString() };
}
