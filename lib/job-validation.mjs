export const JOB_STATUSES = ['draft', 'open', 'paused', 'closed', 'archived'];
export const WORKPLACE_TYPES = ['remote', 'hybrid', 'onsite'];
export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'internship', 'temporary'];
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
export const JOB_TRANSITIONS = {
  draft: ['open', 'archived'], open: ['paused', 'closed', 'archived'],
  paused: ['open', 'closed', 'archived'], closed: ['open', 'archived'], archived: ['draft'],
};

export function canTransitionJobStatus(from, to) {
  return Boolean(JOB_TRANSITIONS[from]?.includes(to));
}

const clean = (value) => String(value ?? '').trim();
const numberOrNull = (value) => clean(value) === '' ? null : Number(value);
const list = (value) => [...new Set(clean(value).split(/[\n,]/).map((item) => item.trim()).filter(Boolean))].slice(0, 50);

export function readJobForm(formData) {
  return normalizeJobInput(Object.fromEntries(formData.entries()));
}

export function normalizeJobInput(source) {
  return {
    title: clean(source.title), department: clean(source.department), location: clean(source.location),
    workplace_type: clean(source.workplace_type), employment_type: clean(source.employment_type),
    openings: numberOrNull(source.openings), experience_min: numberOrNull(source.experience_min), experience_max: numberOrNull(source.experience_max),
    hiring_manager_name: clean(source.hiring_manager_name), hiring_manager_email: clean(source.hiring_manager_email).toLowerCase(),
    target_hire_date: clean(source.target_hire_date), priority: clean(source.priority) || 'normal',
    salary_min: numberOrNull(source.salary_min), salary_max: numberOrNull(source.salary_max), currency: clean(source.currency).toUpperCase() || 'INR',
    must_have_skills: Array.isArray(source.must_have_skills) ? source.must_have_skills : list(source.must_have_skills),
    nice_to_have_skills: Array.isArray(source.nice_to_have_skills) ? source.nice_to_have_skills : list(source.nice_to_have_skills),
    knockout_criteria: Array.isArray(source.knockout_criteria) ? source.knockout_criteria : list(source.knockout_criteria),
    responsibilities: clean(source.responsibilities), description: clean(source.description),
  };
}

export function validateJob(input, { draft = false } = {}) {
  const errors = {};
  if (input.title.length < 2 || input.title.length > 160) errors.title = 'Enter a job title between 2 and 160 characters.';
  if (draft) return { valid: Object.keys(errors).length === 0, errors };
  if (!input.department || input.department.length > 100) errors.department = 'Enter a department.';
  if (!input.location || input.location.length > 160) errors.location = 'Enter a hiring location.';
  if (!WORKPLACE_TYPES.includes(input.workplace_type)) errors.workplace_type = 'Select a workplace type.';
  if (!EMPLOYMENT_TYPES.includes(input.employment_type)) errors.employment_type = 'Select an employment type.';
  if (!Number.isInteger(input.openings) || input.openings < 1 || input.openings > 500) errors.openings = 'Openings must be between 1 and 500.';
  if (!Number.isFinite(input.experience_min) || input.experience_min < 0 || input.experience_min > 60) errors.experience_min = 'Enter valid minimum experience.';
  if (!Number.isFinite(input.experience_max) || input.experience_max < input.experience_min || input.experience_max > 60) errors.experience_max = 'Maximum experience must be greater than or equal to minimum.';
  if (!PRIORITIES.includes(input.priority)) errors.priority = 'Select a hiring priority.';
  if (input.hiring_manager_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.hiring_manager_email)) errors.hiring_manager_email = 'Enter a valid hiring manager email.';
  if (input.salary_min !== null && (!Number.isFinite(input.salary_min) || input.salary_min < 0)) errors.salary_min = 'Enter a valid minimum salary.';
  if (input.salary_max !== null && (!Number.isFinite(input.salary_max) || input.salary_max < 0 || (input.salary_min !== null && input.salary_max < input.salary_min))) errors.salary_max = 'Maximum salary must be greater than or equal to minimum.';
  if ((input.salary_min === null) !== (input.salary_max === null)) errors.salary_max = 'Provide both minimum and maximum salary, or leave both empty.';
  if (input.currency.length !== 3) errors.currency = 'Use a three-letter currency code.';
  if (input.must_have_skills.length === 0) errors.must_have_skills = 'Add at least one must-have skill.';
  if (input.responsibilities.length < 40) errors.responsibilities = 'Add responsibilities with at least 40 characters.';
  if (input.description.length < 80) errors.description = 'Add a job description with at least 80 characters.';
  return { valid: Object.keys(errors).length === 0, errors };
}
