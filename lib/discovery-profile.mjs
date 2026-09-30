// Shared boundary for API responses, profile links, and copied discovery summaries.
export function linkedinProfileUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    if (url.hostname !== 'linkedin.com' && !url.hostname.endsWith('.linkedin.com')) return null;
    const match = url.pathname.match(/^\/in\/([^/]+)\/?$/i);
    if (!match) return null;
    return `https://www.linkedin.com/in/${match[1]}/`;
  } catch { return null; }
}
export function withoutContactDetails(value) {
  return typeof value === 'string' ? value.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[contact removed]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, match => match.replace(/\D/g, '').length >= 10 ? '[contact removed]' : match) : '';
}
function verifiedProspeoContact(contact) {
  const workEmail = String(contact?.workEmail || '').trim().toLowerCase();
  const phone = String(contact?.phone || '').trim();
  if (contact?.source !== 'Prospeo' || contact?.status !== 'verified' || (workEmail && (workEmail.length > 254 || !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(workEmail))) || (!workEmail && !phone)) return undefined;
  return { ...(workEmail ? { workEmail } : {}), ...(phone ? { phone } : {}), status: 'verified', source: 'Prospeo' };
}
export function publicDiscoveryResults(results) {
  const seen = new Set();
  return (Array.isArray(results) ? results : []).flatMap(item => {
    const candidate = item?.candidate || {}, url = linkedinProfileUrl(candidate.url);
    if (!url || seen.has(url.toLowerCase())) return [];
    seen.add(url.toLowerCase());
    const contact = verifiedProspeoContact(candidate.contact);
    return [{ candidate: {
      name: withoutContactDetails(candidate.name), title: withoutContactDetails(candidate.title),
      company: withoutContactDetails(candidate.company), location: withoutContactDetails(candidate.location),
      snippet: withoutContactDetails(candidate.snippet), url, source: 'LinkedIn',
      ...(contact ? { contact } : {}),
    }, techDna: withoutContactDetails(item.techDna) }];
  });
}
