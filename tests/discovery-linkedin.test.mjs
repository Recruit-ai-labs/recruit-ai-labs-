import test from 'node:test';
import assert from 'node:assert/strict';
import { linkedinProfileUrl, publicDiscoveryResults } from '../lib/discovery-profile.mjs';
import { discoverCandidates, searchCandidatesSerper } from '../lib/discovery-simple.mjs';

test('only genuine LinkedIn individual profiles pass the link boundary', () => {
  assert.equal(linkedinProfileUrl('https://in.linkedin.com/in/alex/?trk=123'), 'https://www.linkedin.com/in/alex/');
  for (const url of ['javascript:alert(1)', 'https://linkedin.com.evil.test/in/alex', 'https://evil.test/?linkedin.com/in/alex', 'https://linkedin.com/company/example', 'https://github.com/alex', 'https://evil@linkedin.com/in/alex']) assert.equal(linkedinProfileUrl(url), null);
});
test('discovery responses remove contact fields, redact contact text and deduplicate profiles', () => {
  const candidate = { name: 'Alex', url: 'https://linkedin.com/in/alex', email: 'private@example.com', phone: '+91 98765 43210', snippet: 'Built React services in 2022-2026. Email private@example.com or +91 98765 43210', apolloEnriched: true };
  const rows = publicDiscoveryResults([{ candidate, techDna: 'Contact private@example.com' }, { candidate }, { candidate: { url: 'https://github.com/alex' } }]);
  assert.equal(rows.length, 1); assert.equal(rows[0].candidate.source, 'LinkedIn');
  assert(!JSON.stringify(rows).includes('private@example.com')); assert(!JSON.stringify(rows).includes('98765')); assert(!('email' in rows[0].candidate)); assert(!('phone' in rows[0].candidate));
  assert(rows[0].candidate.snippet.includes('2022-2026'));
});
test('only verified Prospeo work email crosses the discovery boundary', () => {
  const [verified] = publicDiscoveryResults([{ candidate: { name: 'Alex', url: 'https://linkedin.com/in/alex', contact: { workEmail: 'Recruiter@Example.com', status: 'verified', source: 'Prospeo' } } }]);
  assert.deepEqual(verified.candidate.contact, { workEmail: 'recruiter@example.com', status: 'verified', source: 'Prospeo' });
  const [spoofed] = publicDiscoveryResults([{ candidate: { name: 'Sam', url: 'https://linkedin.com/in/sam', contact: { workEmail: 'sam@example.com', status: 'unverified', source: 'Other' } } }]);
  assert(!('contact' in spoofed.candidate));
});
test('search fallbacks remain on LinkedIn and discovery never calls Apollo', async () => {
  const previous = global.fetch, previousKey = process.env.SERPER_API_KEY;
  process.env.SERPER_API_KEY = 'fixture'; const queries = []; let attempts = 0;
  global.fetch = async (url, options) => {
    assert(!String(url).includes('apollo'));
    if (String(url).includes('serper')) {
      queries.push(JSON.parse(options.body).q); attempts++;
      return Response.json({ organic: attempts % 3 ? [] : [{ title: 'Alex - Engineer', link: 'https://www.linkedin.com/in/alex/', snippet: 'React engineer. alex@example.com' }, { title: 'Other', link: 'https://github.com/other' }] });
    }
    return Response.json({ choices: [{ message: { content: 'Fit: React project evidence. Screen: Validate technical ownership.' } }] });
  };
  try {
    const result = await discoverCandidates('Engineer'); assert.equal(result.length, 1); assert(!JSON.stringify(result).includes('alex@example.com'));
    assert.equal(queries.length, 3); assert(queries.every(query => query.includes('site:linkedin.com/in')));
    assert.equal((await searchCandidatesSerper({ jobTitle: 'Engineer' }))[0].source, 'LinkedIn');
  } finally { global.fetch = previous; if (previousKey === undefined) delete process.env.SERPER_API_KEY; else process.env.SERPER_API_KEY = previousKey; }
});
