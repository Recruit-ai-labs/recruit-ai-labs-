// Rebuilt Streamlined Candidate Discovery Pipeline
// LinkedIn public profile search -> OpenRouter evidence briefs. No contact enrichment.
import { publicDiscoveryResults } from './discovery-profile.mjs';
import { openRouterCompletion } from './openrouter.js';

/** Step 1 -> 2: Auto-extract job criteria using OpenRouter. */
export async function extractJdDetails(jdText) {
  if (!jdText || typeof jdText !== 'string') {
    return { jobTitle: '', skills: [], experience: '', summary: '' };
  }

  const prompt = `You are an expert recruitment assistant.
Analyze the following Job Description (JD) and extract the key requirements into JSON format.

Job Description:
"""
${jdText.slice(0, 4000)}
"""

Provide your output ONLY as a valid JSON object matching this schema:
{
  "jobTitle": "Target job title (e.g. Senior Full Stack Engineer)",
  "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
  "experience": "e.g. 3-5 years or 5+ years",
  "summary": "1-2 sentence core requirement summary"
}`;

  try {
    const data = await openRouterCompletion({ timeout: 20000, max_tokens: 500, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'You extract job criteria into strict JSON.' }, { role: 'user', content: prompt }] });
    let content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON block if wrapped in markdown code fence
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    const parsed = JSON.parse(content);
    return {
      jobTitle: typeof parsed.jobTitle === 'string' ? parsed.jobTitle.slice(0, 150) : '',
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter(s => typeof s === 'string' && s.trim() && jdText.toLowerCase().includes(s.toLowerCase())).slice(0, 8) : [],
      experience: typeof parsed.experience === 'string' && jdText.toLowerCase().includes(parsed.experience.toLowerCase()) ? parsed.experience : '',
      summary: 'Review the extracted criteria against the original job description before searching.'
    };
  } catch (err) {
    console.error('OpenRouter JD extraction failed, using fallback:', err.message);
    return fallbackExtraction(jdText);
  }
}

function fallbackExtraction(jdText) {
  const firstLine = jdText.split('\n')[0].replace(/^(job description|role|title):?/i, '').trim();
  const jobTitle = firstLine.length > 3 && firstLine.length < 50 ? firstLine : '';
  return {
    jobTitle,
    skills: [],
    experience: '',
    summary: 'Automatic extraction unavailable. Enter and review the actual role requirements.'
  };
}

/**
 * Step 3: Search candidates via Serper Google Search
 */
export async function searchCandidatesSerper({ jobTitle, skills = [], location = '', count = 6 }) {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    throw new Error('SERPER_API_KEY is not configured.');
  }

  // All search attempts stay restricted to public LinkedIn profiles.
  const skillsQuery = Array.isArray(skills) && skills.length > 0 
    ? skills.slice(0, 3).map(s => `"${s.trim()}"`).join(' ')
    : '';
  
  const locQuery = location ? `"${location.trim()}"` : '';
  const request = async (query) => {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST', headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: Math.min(Math.max(count, 3), 10) }), signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`Serper API returned status ${res.status}`);
    return res.json();
  };
  const baseQuery = `"${jobTitle}" ${skillsQuery} ${locQuery}`.replace(/\s+/g, ' ').trim();
  let data = await request(`${baseQuery} site:linkedin.com/in`);
  let organic = data.organic || [];
  if (!organic.length) {
    data = await request(`"${jobTitle}" ${locQuery} site:linkedin.com/in`);
    organic = data.organic || [];
  }
  if (!organic.length) {
    data = await request(`"${jobTitle}" site:linkedin.com/in`);
    organic = data.organic || [];
  }

  return publicDiscoveryResults(organic.map(item => {
    const titleParts = (item.title || '').split(/[-–|]/).map(p => p.trim()).filter(Boolean);
    const rawName = titleParts[0] || 'Candidate Profile';
    const cleanName = rawName.replace(/\s*\([^)]*\)/g, '').replace(/\|\s*LinkedIn/i, '').trim();

    let extractedRole = titleParts[1] || '';
    let extractedCompany = titleParts[2] || '';

    return { candidate: {
      name: cleanName,
      title: extractedRole,
      company: extractedCompany,
      url: item.link,
      snippet: item.snippet || '',
      source: 'LinkedIn',
      location: '',
    } };
  })).map(item => item.candidate);
}


/** Turn public search evidence into a short, recruiter-readable brief. */
export async function generateTechDna({ candidate, jdText = '', jobTitle = '' }) {
  const snippet = typeof candidate?.snippet === 'string' ? candidate.snippet.trim() : '';
  if (!snippet) return 'No public evidence was available. Verify the candidate’s current role, skills and project ownership directly.';
  try {
    const response = await openRouterCompletion({ timeout: 30000, max_tokens: 500, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'Write a short recruiter-facing public evidence brief. Use only the supplied profile title, company and search excerpt. Never invent projects, skills, employers, dates or outcomes. If a detail is missing, omit it. Return JSON {summary:string, evidence:string[], verification:string}. summary must be 2-3 concise sentences: who the person appears to be, where they work, what skills they show and what projects/work are mentioned. evidence must contain at most 4 short factual bullets. verification must be one short sentence reminding the recruiter that public evidence is unverified and personal contribution needs confirmation.' },
      { role: 'user', content: JSON.stringify({ role: jobTitle, candidate: { name: candidate?.name, title: candidate?.title, company: candidate?.company, location: candidate?.location, public_excerpt: snippet }, job_description: jdText.slice(0, 5000) }) },
    ] });
    const data = JSON.parse(response?.choices?.[0]?.message?.content || '{}');
    const summary = String(data.summary || '').trim().slice(0, 700);
    const evidence = (Array.isArray(data.evidence) ? data.evidence : []).map(item => String(item).trim()).filter(Boolean).slice(0, 4);
    const verification = String(data.verification || 'Verify the current role, personal contribution and required skills before contacting.').trim().slice(0, 240);
    if (!summary) throw new Error('Empty discovery brief');
    return [summary, ...evidence.map(item => `• ${item}`), `Verify: ${verification}`].join('\n');
  } catch {
    return `Appears to be ${candidate?.title || 'a professional'}${candidate?.company ? ` at ${candidate.company}` : ''}. Public profile evidence mentions relevant work, but details are limited.\nVerify: Confirm current role, personal contribution and required skills directly.`;
  }
}

/**
 * Discover Candidates Runner
 */
export async function discoverCandidates(jobTitle, jdText = '', options = {}) {
  const { skills = [], location = '', count = 6 } = options;
  
  const rawCandidates = await searchCandidatesSerper({
    jobTitle,
    skills,
    location,
    count,
  });

  if (!rawCandidates || rawCandidates.length === 0) {
    return [];
  }

  const enrichedResults = await Promise.all(
    rawCandidates.map(async (candidate) => {
      const techDna = await generateTechDna({
        candidate,
        jdText,
        jobTitle,
      });

      return {
        candidate,
        techDna,
      };
    })
  );

  return publicDiscoveryResults(enrichedResults);
}
