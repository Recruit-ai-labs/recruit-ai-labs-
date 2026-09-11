export const CANDIDATE_SOURCES = ['manual', 'referral', 'career-site', 'import', 'sourced'];
export const CANDIDATE_STATUSES = ['active', 'do-not-contact', 'archived'];
export const CONSENT_STATUSES = ['not-recorded', 'obtained', 'withdrawn'];
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;
export const RESUME_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const CANDIDATE_TRANSITIONS = { active: ['do-not-contact', 'archived'], 'do-not-contact': ['active', 'archived'], archived: ['active'] };

export function canTransitionCandidateStatus(from, to) {
  return Boolean(CANDIDATE_TRANSITIONS[from]?.includes(to));
}

const clean = (value) => String(value ?? '').trim();
const numberOrNull = (value) => clean(value) === '' ? null : Number(value);
const list = (value) => [...new Set(clean(value).split(/[\n,]/).map((item) => item.trim()).filter(Boolean))].slice(0, 100);

export function normalizeCandidateInput(source) {
  return {
    first_name: clean(source.first_name), last_name: clean(source.last_name), preferred_name: clean(source.preferred_name),
    email: clean(source.email).toLowerCase(), phone: clean(source.phone), location: clean(source.location),
    current_title: clean(source.current_title), current_company: clean(source.current_company),
    linkedin_url: clean(source.linkedin_url), portfolio_url: clean(source.portfolio_url),
    total_experience: numberOrNull(source.total_experience), notice_period_days: numberOrNull(source.notice_period_days),
    source: clean(source.source), skills: Array.isArray(source.skills) ? source.skills : list(source.skills),
    summary: clean(source.summary), consent_status: clean(source.consent_status) || 'not-recorded',
    data_attested: source.data_attested === true || source.data_attested === 'yes' || source.data_attested === 'on',
    job_id: clean(source.job_id),
  };
}

export function readCandidateForm(formData) {
  return normalizeCandidateInput(Object.fromEntries(formData.entries()));
}

function validUrl(value) {
  if (!value) return true;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; }
}

export function validateCandidate(input) {
  const errors = {};
  if (input.first_name.length < 1 || input.first_name.length > 100) errors.first_name = 'Enter the candidate first name.';
  if (input.last_name.length > 100) errors.last_name = 'Last name is too long.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = 'Enter a valid candidate email.';
  if (!CANDIDATE_SOURCES.includes(input.source)) errors.source = 'Select where this candidate came from.';
  if (!CONSENT_STATUSES.includes(input.consent_status)) errors.consent_status = 'Select a valid consent status.';
  if (!validUrl(input.linkedin_url)) errors.linkedin_url = 'Enter a complete LinkedIn URL.';
  if (!validUrl(input.portfolio_url)) errors.portfolio_url = 'Enter a complete portfolio URL.';
  if (input.total_experience !== null && (!Number.isFinite(input.total_experience) || input.total_experience < 0 || input.total_experience > 60)) errors.total_experience = 'Experience must be between 0 and 60 years.';
  if (input.notice_period_days !== null && (!Number.isInteger(input.notice_period_days) || input.notice_period_days < 0 || input.notice_period_days > 365)) errors.notice_period_days = 'Notice period must be between 0 and 365 days.';
  if (input.summary.length > 3000) errors.summary = 'Summary must be under 3,000 characters.';
  if (!input.data_attested) errors.data_attested = 'Confirm that you are permitted to store this candidate data.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateResume(file) {
  if (!file || file.size === 0) return { valid: true };
  if (file.size > MAX_RESUME_BYTES) return { valid: false, error: 'Resume must be 10 MB or smaller.' };
  if (!RESUME_TYPES.includes(file.type)) return { valid: false, error: 'Upload a PDF or DOCX resume.' };
  return { valid: true };
}

export function matchesResumeSignature(bytes, type) {
  if (type === 'application/pdf') return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return false;
}
