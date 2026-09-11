const MAX = { skills: 80, experience: 30, education: 20, certifications: 30, highlights: 12, warnings: 20 };

const string = (value, max = 500) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
const nullableString = (value, max) => string(value, max) || null;
const confidence = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : 0;
const array = (value, limit) => Array.isArray(value) ? value.slice(0, limit) : [];

export const RESUME_EXTRACTION_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['candidate', 'skills', 'experience', 'education', 'certifications', 'warnings', 'overall_confidence'],
  properties: {
    candidate: {
      type: 'object', additionalProperties: false,
      required: ['full_name', 'email', 'phone', 'location', 'current_title', 'current_company', 'total_experience_years', 'summary'],
      properties: {
        full_name: { type: ['string', 'null'] }, email: { type: ['string', 'null'] }, phone: { type: ['string', 'null'] },
        location: { type: ['string', 'null'] }, current_title: { type: ['string', 'null'] }, current_company: { type: ['string', 'null'] },
        total_experience_years: { type: ['number', 'null'], minimum: 0, maximum: 60 }, summary: { type: ['string', 'null'] },
      },
    },
    skills: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'evidence', 'confidence'], properties: { name: { type: 'string' }, evidence: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 } } } },
    experience: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['company', 'title', 'start_date', 'end_date', 'current', 'location', 'highlights', 'evidence'], properties: { company: { type: ['string', 'null'] }, title: { type: ['string', 'null'] }, start_date: { type: ['string', 'null'] }, end_date: { type: ['string', 'null'] }, current: { type: 'boolean' }, location: { type: ['string', 'null'] }, highlights: { type: 'array', items: { type: 'string' } }, evidence: { type: 'string' } } } },
    education: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['institution', 'degree', 'field', 'start_year', 'end_year', 'evidence'], properties: { institution: { type: ['string', 'null'] }, degree: { type: ['string', 'null'] }, field: { type: ['string', 'null'] }, start_year: { type: ['integer', 'null'] }, end_year: { type: ['integer', 'null'] }, evidence: { type: 'string' } } } },
    certifications: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'issuer', 'year', 'evidence'], properties: { name: { type: 'string' }, issuer: { type: ['string', 'null'] }, year: { type: ['integer', 'null'] }, evidence: { type: 'string' } } } },
    warnings: { type: 'array', items: { type: 'string' } }, overall_confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
};

function evidence(value, sourceText, warnings, label, fallbackTerms = []) {
  const quote = string(value, 280);
  const haystack = sourceText.toLocaleLowerCase().replace(/\s+/g, ' ');
  const needle = quote.toLocaleLowerCase().replace(/\s+/g, ' ');
  if (needle && haystack.includes(needle)) return quote;
  const terms = fallbackTerms.map((term) => string(term, 180).toLocaleLowerCase()).filter((term) => term.length >= 2);
  const lines = sourceText.split(/\n+/).map((line) => string(line, 280)).filter(Boolean);
  const recovered = lines.map((line) => ({ line, score: terms.reduce((total, term) => total + (line.toLocaleLowerCase().includes(term) ? 1 : 0), 0) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.line.length - b.line.length)[0]?.line;
  if (recovered) return recovered;
  warnings.push(`${label} evidence could not be verified against the resume text.`);
  return '';
}

export function normalizeResumeExtraction(raw, sourceText = '') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The AI response was not a structured object.');
  const warnings = array(raw.warnings, MAX.warnings).map((item) => string(item, 240)).filter(Boolean);
  const candidate = raw.candidate && typeof raw.candidate === 'object' ? raw.candidate : {};
  const years = Number(candidate.total_experience_years);
  const structured = {
    candidate: {
      full_name: nullableString(candidate.full_name, 200), email: nullableString(candidate.email, 254)?.toLowerCase() || null,
      phone: nullableString(candidate.phone, 50), location: nullableString(candidate.location, 180),
      current_title: nullableString(candidate.current_title, 180), current_company: nullableString(candidate.current_company, 180),
      total_experience_years: Number.isFinite(years) && years >= 0 && years <= 60 ? Math.round(years * 10) / 10 : null,
      summary: nullableString(candidate.summary, 1600),
    },
    skills: array(raw.skills, MAX.skills).map((item) => ({
      name: string(item?.name, 100), evidence: evidence(item?.evidence, sourceText, warnings, `Skill ${string(item?.name, 60) || 'item'}`, [item?.name]), confidence: confidence(item?.confidence),
    })).filter((item) => item.name),
    experience: array(raw.experience, MAX.experience).map((item, index) => ({
      company: nullableString(item?.company, 180), title: nullableString(item?.title, 180), start_date: nullableString(item?.start_date, 40),
      end_date: nullableString(item?.end_date, 40), current: item?.current === true, location: nullableString(item?.location, 180),
      highlights: array(item?.highlights, MAX.highlights).map((value) => string(value, 400)).filter(Boolean),
      evidence: evidence(item?.evidence, sourceText, warnings, `Experience ${index + 1}`, [item?.company, item?.title]),
    })).filter((item) => item.company || item.title),
    education: array(raw.education, MAX.education).map((item, index) => ({
      institution: nullableString(item?.institution, 200), degree: nullableString(item?.degree, 160), field: nullableString(item?.field, 160),
      start_year: Number.isInteger(Number(item?.start_year)) ? Number(item.start_year) : null, end_year: Number.isInteger(Number(item?.end_year)) ? Number(item.end_year) : null,
      evidence: evidence(item?.evidence, sourceText, warnings, `Education ${index + 1}`, [item?.institution, item?.degree]),
    })).filter((item) => item.institution || item.degree),
    certifications: array(raw.certifications, MAX.certifications).map((item, index) => ({
      name: string(item?.name, 180), issuer: nullableString(item?.issuer, 180), year: Number.isInteger(Number(item?.year)) ? Number(item.year) : null,
      evidence: evidence(item?.evidence, sourceText, warnings, `Certification ${index + 1}`, [item?.name, item?.issuer]),
    })).filter((item) => item.name),
    warnings: [...new Set(warnings)].slice(0, MAX.warnings), overall_confidence: confidence(raw.overall_confidence),
  };
  if (!structured.candidate.full_name && !structured.candidate.email && !structured.skills.length && !structured.experience.length) {
    throw new Error('The AI response did not contain usable candidate facts.');
  }
  return structured;
}

export function parseJsonContent(content) {
  if (typeof content !== 'string') throw new Error('The AI response did not include text content.');
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(trimmed); } catch { /* extract the outer JSON object below */ }
  const start = trimmed.indexOf('{'); const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The AI response did not contain valid JSON.');
  return JSON.parse(trimmed.slice(start, end + 1));
}
