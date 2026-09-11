// Shared, deterministic discovery rules. No social activity or profile popularity scores.
export const ENTITY_TYPES = ['city', 'area', 'state', 'country', 'institution', 'company'];
export const clean = (value, max = 160) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
const array = value => Array.isArray(value) ? value : [];
const normalize = value => clean(value, 2000).normalize('NFKC').toLowerCase();
const unique = values => [...new Map(values.filter(Boolean).map(v => [normalize(v), v])).values()];
export const terms = value => unique((Array.isArray(value) ? value : String(value || '').split(/[,\n]/)).map(v => clean(v, 100))).slice(0, 20);

export function safePublicUrl(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return '';
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') || host.endsWith('.internal') || /^[\d.]+$/.test(host) || host.includes(':')) return '';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return ''; }
}

export function normalizeBrief(input = {}) {
  const title = clean(input.title);
  const required = terms(input.required), preferred = terms(input.preferred).filter(x => !required.some(r => normalize(r) === normalize(x)));
  const minExperience = input.minExperience === '' || input.minExperience == null ? null : Number(input.minExperience);
  if (!title || !required.length) throw new Error('Enter a role title and at least one required skill.');
  if (minExperience !== null && (!Number.isFinite(minExperience) || minExperience < 0 || minExperience > 60)) throw new Error('Minimum experience must be between 0 and 60 years, or left blank.');
  return { title, required, preferred, minExperience };
}

export function normalizeEntity(input) {
  if (!input || !clean(input.name)) return null;
  if (!ENTITY_TYPES.includes(input.type)) throw new Error('Choose whether this is a place, institution or company.');
  return { name: clean(input.name), type: input.type, aliases: terms(input.aliases).slice(0, 8), location: clean(input.location), source: safePublicUrl(input.source) };
}

function entityMatchesQuery(name, query, corpus) {
  const n = normalize(name), q = normalize(query);
  if (!q) return true;
  if (n.includes(q) || (n.length >= 3 && q.includes(n))) return true;
  const initials = n.split(/[^\p{L}\p{N}]+/u).filter(w => w && !['of', 'and', 'the', 'for', 'in'].includes(w)).map(w => w[0]).join('');
  if (initials === q.replace(/[^\p{L}\p{N}]/gu, '')) return true;
  // Alternate names must be explicitly linked in the source, not merely co-mentioned with a host city.
  const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped(n)}.{0,25}(?:known as|formerly|aka|\\().{0,8}${escaped(q)}|${escaped(q)}.{0,25}(?:known as|formerly|aka|\\().{0,8}${escaped(n)}`, 'u').test(normalize(corpus));
}

export function validateEntitySuggestions(raw, sources, query = '') {
  const byId = new Map(sources.map(s => [s.id, s]));
  return array(raw?.entities).slice(0, 5).flatMap(item => {
    const source = byId.get(item?.sourceId), name = clean(item?.name), quote = clean(item?.quote, 600);
    const corpus = source ? `${source.title} ${source.snippet}` : '';
    if (!source || !name || !ENTITY_TYPES.includes(item.type) || quote.length < 8 || !normalize(corpus).includes(normalize(quote)) || !normalize(corpus).includes(normalize(name)) || !entityMatchesQuery(name, query, corpus)) return [];
    return [{ name, type: item.type, aliases: terms(item.aliases).filter(a => normalize(corpus).includes(normalize(a))).slice(0, 8), location: normalize(corpus).includes(normalize(item.location)) ? clean(item.location) : '', source: source.url, quote }];
  }).filter((e, i, all) => all.findIndex(x => normalize(x.name) === normalize(e.name) && x.type === e.type && normalize(x.location) === normalize(e.location)) === i);
}

const skillGroups = [
  ['JavaScript', 'JS', 'ECMAScript'], ['TypeScript', 'TS'], ['React', 'React.js', 'ReactJS'],
  ['Node.js', 'NodeJS', 'Node JS'], ['PostgreSQL', 'Postgres'], ['C#', 'C Sharp'], ['C++', 'CPP'],
  ['.NET', 'Dotnet'], ['Amazon Web Services', 'AWS'], ['Microsoft Azure', 'Azure'],
  ['Google Cloud Platform', 'GCP'], ['Kubernetes', 'K8s'], ['Next.js', 'NextJS'],
];
function skillKey(value) {
  const norm = normalize(value);
  return normalize(skillGroups.find(group => group.some(alias => normalize(alias) === norm))?.[0] || value);
}

// Structured skill names only: a summary mentioning "no Python experience" is not positive evidence.
function skillEvidence(candidate, extraction, skill) {
  const key = skillKey(skill);
  const profile = array(candidate.skills).find(s => typeof s === 'string' && skillKey(s) === key);
  const extracted = array(extraction?.structured_data?.skills).find(s => skillKey(s?.name) === key && clean(s?.evidence, 600));
  if (extracted) return { skill, status: 'documented', source: 'Reviewed resume', quote: clean(extracted.evidence, 600), at: extraction.reviewed_at || extraction.updated || '' };
  if (profile) return { skill, status: 'documented', source: 'Candidate profile', quote: profile, at: candidate.updated || '' };
  return { skill, status: 'unknown', source: '', quote: '', at: '' };
}

function containsTerm(text, term) {
  const t = normalize(text), q = normalize(term);
  if (!q) return false;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'u').test(t);
}

export function matchScope(candidate, extraction, entity) {
  if (!entity) return { status: 'not-requested', evidence: '' };
  const data = extraction?.structured_data || {};
  const values = entity.type === 'institution' ? array(data.education).map(x => x.institution)
    : entity.type === 'company' ? [candidate.current_company, ...array(data.experience).map(x => x.company)]
    : [candidate.location, data.candidate?.location];
  const available = values.filter(v => clean(v));
  const geographic = !['institution', 'company'].includes(entity.type);
  const found = available.find(value => [entity.name, ...entity.aliases].some(term => containsTerm(value, term)) && (!geographic || !entity.location || entity.location.split(',').every(part => containsTerm(value, part.trim()))));
  // Non-matching text can be incomplete (e.g. Koramangala vs Bengaluru). It is unconfirmed, not disproved.
  return { status: found ? 'documented' : 'unknown', evidence: found || '', checkedField: entity.type === 'institution' ? 'Education institution' : entity.type === 'company' ? 'Employment company' : 'Candidate location' };
}

export function discoverCandidates({ candidates, extractions = [], brief, entity = null }) {
  const latest = new Map();
  for (const extraction of [...extractions].sort((a, b) => String(b.created).localeCompare(String(a.created)))) {
    if (extraction.status === 'approved' && !latest.has(extraction.candidate)) latest.set(extraction.candidate, extraction);
  }
  return candidates.filter(c => c.status === 'active' && c.consent_status !== 'withdrawn').map(candidate => {
    const approved = latest.get(candidate.id);
    const currentResume = Array.isArray(candidate.resume) ? candidate.resume[0] : candidate.resume;
    const extraction = approved?.source_filename && currentResume && approved.source_filename !== currentResume ? null : approved;
    const required = brief.required.map(s => skillEvidence(candidate, extraction, s));
    const preferred = brief.preferred.map(s => skillEvidence(candidate, extraction, s));
    const documented = required.filter(s => s.status === 'documented').length;
    const scope = matchScope(candidate, extraction, entity);
    // PocketBase returns 0 for an unset numeric field. Do not treat that default as proof of zero experience.
    const recordedExperience = extraction?.structured_data?.candidate?.total_experience_years;
    const exp = recordedExperience != null ? recordedExperience : Number(candidate.total_experience) > 0 ? candidate.total_experience : null;
    const experience = brief.minExperience === null ? 'not-requested' : exp === '' || exp == null || !Number.isFinite(Number(exp)) ? 'unknown' : Number(exp) >= brief.minExperience ? 'documented' : 'below-requested';
    const lane = experience === 'below-requested' ? 'criteria-review' : documented === required.length && scope.status !== 'unknown' && experience !== 'unknown' ? 'documented' : 'needs-evidence';
    const nextSteps = required.filter(s => s.status === 'unknown').map(s => `Collect a work sample or structured answer for ${s.skill}.`);
    if (scope.status === 'unknown') nextSteps.push(`Confirm ${scope.checkedField.toLowerCase()} for ${entity.name}.`);
    if (experience === 'unknown') nextSteps.push('Confirm relevant experience; missing information is not zero experience.');
    if (experience === 'below-requested') nextSteps.push('Review the stated experience requirement and candidate context.');
    if (!nextSteps.length) nextSteps.push('Validate documented skills with a consistent, role-relevant assessment.');
    return { id: candidate.id, name: [candidate.first_name, candidate.last_name].filter(Boolean).join(' '), title: candidate.current_title || '', location: candidate.location || '', source: candidate.source || 'Not recorded', required, preferred, documented, coverage: Math.round(documented * 100 / required.length), scope, experience, lane, nextSteps, portfolio: safePublicUrl(candidate.portfolio_url), linkedin: safePublicUrl(candidate.linkedin_url), resume: Boolean(candidate.resume) };
  });
}

export function buildSearchQueries(brief, entity) {
  const quote = value => `"${clean(value).replace(/["\\]/g, ' ')}"`;
  const scope = entity ? `(${unique([entity.name, ...entity.aliases]).slice(0, 3).map(quote).join(' OR ')})` : '';
  const skill = brief.required.slice(0, 3).map(quote).join(' OR ');
  return [
    { channel: 'Professional profiles', query: `${scope} (${skill}) site:linkedin.com/in/` },
    { channel: 'Code profiles', query: `${scope} (${skill}) site:github.com -site:github.com/topics -site:github.com/collections` },
    { channel: 'Portfolios across the web', query: `${scope} (${skill}) (portfolio OR "my projects") -site:linkedin.com -site:github.com` },
    { channel: 'Broader discovery', query: `${scope} ${quote(brief.title)} (developer OR designer OR resume OR portfolio)` },
  ];
}

export function buildCandidateFunnelQueries(brief, entity) {
  if (!entity) return buildSearchQueries(brief, entity);
  const quote = value => `"${clean(value).replace(/["\\]/g, ' ')}"`;
  const scope = unique([entity.name, ...entity.aliases]).slice(0, 4).map(quote).join(' OR ');
  const skills = brief.required.slice(0, 8).map(quote).join(' OR ');
  return [
    { channel: 'Scope universe', stage: 'universe', query: `(${scope}) site:linkedin.com/in/`, num: 50 },
    { channel: 'JD-matched profiles', stage: 'jd-match', query: `(${scope}) (${skills}) site:linkedin.com/in/`, num: 30 },
    { channel: 'Technical evidence', stage: 'tech-evidence', query: `(${scope}) (${skills}) site:github.com -site:github.com/topics -site:github.com/collections`, num: 10 },
    { channel: 'Project evidence', stage: 'tech-evidence', query: `(${scope}) (${skills}) (portfolio OR "my projects") -site:linkedin.com`, num: 10 },
  ];
}

export function normalizeSearchSources(payload) {
  const sources = array(payload?.organic).slice(0, 100).flatMap((item, i) => {
    const url = safePublicUrl(item?.link), title = clean(item?.title, 250);
    return url && title ? [{ id: i + 1, url, title, snippet: clean(item.snippet, 1000), displayLink: clean(item.displayLink, 250), date: clean(item.date, 80), position: Number.isInteger(item.position) ? item.position : i + 1 }] : [];
  });
  const graph = payload?.knowledgeGraph;
  const url = safePublicUrl(graph?.descriptionLink) || safePublicUrl(graph?.website);
  if (url && clean(graph?.title) && clean(graph?.type)) sources.unshift({ id: 0, url, title: clean(graph.title, 250), snippet: clean(`${graph.title} — ${graph.type}. ${graph.description || ''}`, 1000), entityType: clean(graph.type), entityName: clean(graph.title), knowledgeGraph: true });
  return sources;
}

export function buildCandidateFunnel(searches, brief, entity) {
  const linkedin = /linkedin\.com\/in\//i;
  const scopedTerms = entity ? [entity.name, ...entity.aliases].map(normalize).filter(Boolean) : [];
  const skillTerms = [...brief.required, ...brief.preferred].map(skill => ({ skill, key: skillKey(skill) }));
  const byUrl = new Map();
  for (const search of searches.filter(s => s.stage === 'universe' || s.stage === 'jd-match')) {
    for (const source of search.sources || []) {
      if (!linkedin.test(source.url)) continue;
      const key = source.url.replace(/\/$/, '');
      const corpus = normalize(`${source.title} ${source.snippet}`);
      const scopeEvidence = scopedTerms.filter(term => corpus.includes(term));
      if (entity && !scopeEvidence.length && search.stage !== 'universe') continue;
      const matchedSkills = skillTerms.filter(item => containsTerm(corpus, item.skill) || corpus.includes(item.key)).map(item => item.skill);
      const current = byUrl.get(key) || { ...source, url: key, scopeEvidence: [], matchedSkills: [], stages: [], verification: 'Public search evidence; identity not verified' };
      current.scopeEvidence = unique([...current.scopeEvidence, ...scopeEvidence]);
      current.matchedSkills = unique([...current.matchedSkills, ...matchedSkills]);
      if (!current.stages.includes(search.stage)) current.stages.push(search.stage);
      byUrl.set(key, current);
    }
  }
  const universe = [...byUrl.values()];
  // Appearing for a Google skill query is not itself evidence of that skill.
  const requiredCount = lead => brief.required.filter(skill => lead.matchedSkills.some(found => skillKey(found) === skillKey(skill))).length;
  const jdMatched = universe.filter(lead => requiredCount(lead) > 0);
  return {
    universe,
    jdMatched,
    topQualifiers: jdMatched.filter(lead => requiredCount(lead) >= Math.min(2, brief.required.length)).sort((a, b) => requiredCount(b) - requiredCount(a)),
    evidenceSources: mergeSearchLeads(searches.filter(s => s.stage === 'tech-evidence')),
  };
}

export function knowledgeGraphEntities(sources, query = '') {
  return sources.filter(s => s.knowledgeGraph).flatMap(source => {
    const t = normalize(source.entityType);
    const type = /\b(university|college|educational|institute|school)\b/.test(t) ? 'institution'
      : /\b(company|corporation|business|organisation|organization)\b/.test(t) ? 'company'
      : /\b(city|town|municipality)\b/.test(t) ? 'city'
      : /\b(neighbourhood|neighborhood|suburb|district|locality)\b/.test(t) ? 'area'
      : /\b(state|province|region)\b/.test(t) ? 'state'
      : /\b(country)\b/.test(t) ? 'country' : '';
    return type && entityMatchesQuery(source.entityName, query, source.snippet) ? [{ name: source.entityName, type, aliases: [], location: '', source: source.url, quote: source.snippet, method: 'Search knowledge graph' }] : [];
  });
}

// Conservative extractive fallback for explicit "X is a city/institute/company" statements.
// It does not classify a place from arbitrary keywords elsewhere on a page.
export function explicitSourceEntities(sources, query) {
  const q = clean(query);
  if (q.length < 2) return [];
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const statement = new RegExp(`(?:^|[.!?]\\s+)(${escaped})(?:\\s*,[^.!?]{0,160})?\\s+(?:is|was)\\s+([^.!?]{1,250})`, 'i');
  const patterns = { city: /\b(city|town|municipality|metropolis)\b/i, institution: /\b(institute|university|college|school)\b/i, company: /\b(company|corporation|organisation|organization)\b/i, area: /\b(neighbourhood|neighborhood|suburb|district|locality)\b/i, state: /\b(state|province|region)\b/i, country: /\bcountry\b/i };
  const results = [];
  for (const source of sources) {
    // Result titles often expose an expanded organisation name and acronym
    // without using a sentence like "SSIPMT is an institute".
    const title = clean(source.title, 250);
    if (containsTerm(title, q)) {
      const titleTypes = Object.entries(patterns).filter(([, pattern]) => pattern.test(title)).map(([type]) => type);
      if (titleTypes.length === 1 && ['institution', 'company'].includes(titleTypes[0])) {
        const name = clean(title.split(/\s+(?:[-–—|:]|\bin\b)\s+/i)[0], 160);
        const expanded = name.length > q.length && containsTerm(name, q) ? name : '';
        const result = { name: q, type: titleTypes[0], aliases: expanded && normalize(expanded) !== normalize(q) ? [expanded] : [], location: '', source: source.url, quote: title, method: 'Search title classification' };
        if (!results.some(r => normalize(r.name) === normalize(result.name) && r.type === result.type)) results.push(result);
        continue;
      }
    }
    const match = source.snippet.match(statement);
    if (!match) continue;
    const predicate = match[2].split(/\b(?:of|in|located|known|ranked|home|with|providing|offering|serving|headquartered)\b/i)[0];
    const types = Object.entries(patterns).filter(([, pattern]) => pattern.test(predicate)).map(([type]) => type);
    if (types.length !== 1 || /\bnot\b|\bno longer\b/i.test(predicate) || /city council|university town/i.test(predicate)) continue;
    const type = types[0];
    const location = ['city', 'area'].includes(type) ? clean(match[2].match(/\b(?:city|town|neighbourhood|neighborhood|suburb|district) in ([^,.;]{2,70})/i)?.[1]) : '';
    const alias = match[0].match(/also known as ([^(),]{2,60})/i)?.[1];
    const result = { name: match[1], type, aliases: alias ? [alias.trim()] : [], location, source: source.url, quote: match[0].trim().replace(/^[.!?]\s*/, ''), method: 'Explicit source statement' };
    if (!results.some(r => normalize(r.name) === normalize(result.name) && r.type === type && r.location === location)) results.push(result);
  }
  return results.slice(0, 5);
}

export function mergeSearchLeads(searches) {
  const leads = new Map();
  for (const search of searches) for (const source of search.sources || []) {
    if (source.knowledgeGraph) continue;
    const text = normalize(`${source.title || ''} ${source.snippet || ''}`);
    const listing = /\b(job|jobs|vacanc|course|training|institute|school|salary|hiring candidates|apply now|recruitment agency)\b/.test(text);
    if (listing && !/linkedin\.com\/in\//i.test(source.url) && !/github\.com\/[A-Za-z0-9][A-Za-z0-9_-]*\/?(?:\?|$)/i.test(source.url) && !/portfolio|developer|software engineer|designer/i.test(text)) continue;
    // Deduplicate URLs only. Names and employer mentions are not identity proof.
    const key = source.url.replace(/\/$/, '');
    if (!leads.has(key)) leads.set(key, { ...source, channels: [], verification: 'Unverified search result' });
    const item = leads.get(key);
    if (!item.channels.includes(search.channel)) item.channels.push(search.channel);
  }
  return [...leads.values()];
}

export function enrichWebLead(lead, brief) {
  const corpus = `${lead.title || ''} ${lead.snippet || ''}`;
  const matched = brief.required.filter(skill => containsTerm(corpus, skill) || corpus.toLowerCase().includes(skillKey(skill)));
  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/g;
  const emails = unique(corpus.match(emailPattern) || []).slice(0, 5);
  const phones = unique((corpus.match(phonePattern) || []).map(value => clean(value, 40)).filter(value => value.replace(/\D/g, '').length >= 8)).slice(0, 5);
  return { ...lead, contacts: { emails, phones }, match: { skills: matched, percentage: Math.round(matched.length * 100 / brief.required.length) } };
}
