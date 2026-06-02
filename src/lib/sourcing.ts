interface ProxycurlProfile {
  public_identifier: string
  first_name: string
  last_name: string
  full_name: string
  city: string
  state: string
  country: string
  headline: string
  summary: string
  experiences: Array<{
    company: string
    title: string
    description: string
    starts_at: { year: number; month: number }
    ends_at: { year: number; month: number } | null
  }>
  educations: Array<{
    school: string
    degree_name: string
    field_of_study: string
    starts_at: { year: number }
    ends_at: { year: number }
  }>
  skills: string[]
}

interface GitHubUser {
  login: string
  name: string | null
  bio: string | null
  company: string | null
  location: string | null
  public_repos: number
  followers: number
  following: number
}

interface GitHubRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  fork: boolean
}

export async function fetchLinkedInProfile(params: {
  linkedinUrl: string
}): Promise<any | null> {
  // COST OPTIMIZATION: ProxyCurl costs $0.05-0.15 per lookup
  // Only use when explicitly configured
  const apiKey = process.env.PROXYCURL_API_KEY
  
  if (!apiKey) {
    console.info('[Sourcing] ProxyCurl not configured - skipping LinkedIn enrichment (saves $0.05-0.15)')
    return null
  }
  
  const url = `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(params.linkedinUrl)}`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  })
  
  if (!response.ok) {
    return null
  }
  
  return response.json()
}

export async function fetchGitHubProfile(params: {
  username: string
}): Promise<{ user: GitHubUser | null; repos: GitHubRepo[] } | null> {
  const response = await fetch(`https://api.github.com/users/${params.username}`)
  
  if (!response.ok) {
    return null
  }
  
  const user = await response.json() as GitHubUser
  
  const reposResponse = await fetch(`https://api.github.com/users/${params.username}/repos?sort=stars&per_page=10`)
  const repos = reposResponse.ok ? await reposResponse.json() : []
  
  return {
    user,
    repos,
  }
}

export async function enrichCandidateProfile(params: {
  linkedinUrl?: string
  githubUrl?: string
}): Promise<any> {
  const [linkedinProfile, githubProfile] = await Promise.all([
    params.linkedinUrl ? fetchLinkedInProfile({ linkedinUrl: params.linkedinUrl }) : null,
    params.githubUrl ? fetchGitHubProfile({ 
      username: params.githubUrl.split('/').pop() || '' 
    }) : null,
  ])
  
  return {
    linkedin: linkedinProfile,
    github: githubProfile,
  }
}

export async function parseAndScoreCandidate(
  orgId: string,
  profile: any
): Promise<{ summary: string; score: number }> {
  const { nimChatCompletion } = await import('./nim')
  const { NIM_MODELS } = await import('@/config/nim-models')
  
  const profileText = JSON.stringify(profile, null, 2)
  
  const prompt = `Analyze this candidate profile and provide a summary and match score (1-100).

Profile:
${profileText}

Return JSON:
{
  "summary": "2-3 sentence professional summary",
  "score": number (1-100)
}`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_70B,
    [
      { role: 'system', content: 'You are an expert at evaluating candidate profiles.' },
      { role: 'user', content: prompt }
    ],
    0.3,
    1024
  )
  
  const content = response.choices[0]?.message?.content
  if (!content) {
    return { summary: 'Analysis failed', score: 50 }
  }
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { summary: 'Failed to parse', score: 50 }
    }
    
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    return { summary: 'Error in analysis', score: 50 }
  }
}
