import { nimChatCompletion, nimEmbedding } from './nim'
import { NIM_MODELS } from '@/config/nim-models'

export async function generateJobDescription(
  orgId: string,
  params: {
    role: string
    seniority: string
    skills: string[]
    company?: string
    location?: string
  }
): Promise<string> {
  const prompt = `You are an expert technical recruiter. Write a compelling, SEO-optimized job description for a ${params.seniority} ${params.role} position.

${params.company ? `Company: ${params.company}` : ''}
${params.location ? `Location: ${params.location}` : ''}
Required Skills: ${params.skills.join(', ')}

Include the following sections:
- About the Role (2-3 sentences)
- Key Responsibilities (5-7 bullet points)
- Required Qualifications (5-7 bullet points)
- Nice-to-Have Skills (3-5 bullet points)
- Benefits & Perks (4-6 bullet points)

Format as markdown. Make it engaging and professional. Focus on attracting top talent.`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_70B,
    [
      { role: 'system', content: 'You are an expert technical recruiter writing job descriptions.' },
      { role: 'user', content: prompt }
    ],
    0.7,
    4096
  )
  
  return response.choices[0]?.message?.content || 'Failed to generate job description'
}

export async function improveJobDescription(
  orgId: string,
  currentDescription: string
): Promise<string> {
  const prompt = `Improve this job description to make it more compelling, inclusive, and SEO-friendly.

Current Description:
${currentDescription}

Improvements to make:
- Make it more engaging and exciting
- Use inclusive language
- Add relevant keywords for SEO
- Ensure clear structure and formatting
- Keep it concise but comprehensive

Return the improved version in markdown format.`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_70B,
    [
      { role: 'system', content: 'You are an expert at writing and improving job descriptions.' },
      { role: 'user', content: prompt }
    ],
    0.5,
    4096
  )
  
  return response.choices[0]?.message?.content || currentDescription
}

export async function generateJobRequirements(
  orgId: string,
  role: string,
  seniority: string,
  industry?: string
): Promise<string[]> {
  const prompt = `List the key requirements for a ${seniority} ${role} position${industry ? ` in the ${industry} industry` : ''}.

Return a JSON array of strings. Each string should be a requirement (5-10 words).

Examples:
- "Bachelor's degree in Computer Science or related field"
- "3+ years of experience with React and TypeScript"
- "Strong problem-solving and analytical skills"`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_70B,
    [
      { role: 'system', content: 'You are an expert at defining job requirements.' },
      { role: 'user', content: prompt }
    ],
    0.3,
    2048
  )
  
  const content = response.choices[0]?.message?.content
  if (!content) return []
  
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    return []
  }
}

export async function generateJobEmbeddingAndSave(
  orgId: string,
  jobId: string,
  jobText: string
): Promise<number[]> {
  const embedding = await nimEmbedding(orgId, NIM_MODELS.EMBEDDING_E5, jobText)
  
  // Save to database
  const { createServerClient } = await import('./supabase-server')
  const supabase = createServerClient()
  
  await (supabase as any)
    .from('jobs')
    .update({ embedding: embedding[0] })
    .eq('id', jobId)
  
  return embedding[0]
}
