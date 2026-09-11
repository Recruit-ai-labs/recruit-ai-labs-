const allowedFields = new Set(['current_title', 'current_company', 'total_experience', 'summary', 'skills', 'location', 'phone']);

export function buildResumeProfilePatch(candidate, structuredData, requestedFields) {
  const selected = [...new Set(Array.isArray(requestedFields) ? requestedFields : [])].filter((field) => allowedFields.has(field));
  const facts = structuredData?.candidate || {}; const patch = {};
  if (selected.includes('current_title') && facts.current_title) patch.current_title = facts.current_title;
  if (selected.includes('current_company') && facts.current_company) patch.current_company = facts.current_company;
  if (selected.includes('total_experience') && facts.total_experience_years !== null && Number.isFinite(Number(facts.total_experience_years))) patch.total_experience = Number(facts.total_experience_years);
  if (selected.includes('summary') && facts.summary) patch.summary = facts.summary;
  if (selected.includes('location') && facts.location) patch.location = facts.location;
  if (selected.includes('phone') && facts.phone) patch.phone = facts.phone;
  if (selected.includes('skills')) {
    const verifiedSkills = (structuredData?.skills || []).filter((item) => item?.name && item?.evidence).map((item) => item.name);
    patch.skills = [...new Set([...(candidate?.skills || []), ...verifiedSkills])].slice(0, 100);
  }
  return { selected, patch };
}
