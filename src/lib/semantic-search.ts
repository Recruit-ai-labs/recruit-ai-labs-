import { nimEmbedding, nimChatCompletion } from './nim'
import { createServerClient } from './supabase-server'
import { NIM_MODELS } from '@/config/nim-models'

export async function generateJobEmbedding(
  orgId: string,
  jobText: string
): Promise<number[]> {
  const embeddings = await nimEmbedding(
    orgId,
    NIM_MODELS.EMBEDDING_E5,
    jobText
  )
  
  return embeddings[0]
}

export async function generateCandidateEmbedding(
  orgId: string,
  candidateText: string
): Promise<number[]> {
  const embeddings = await nimEmbedding(
    orgId,
    NIM_MODELS.EMBEDDING_E5,
    candidateText
  )
  
  return embeddings[0]
}

export async function searchCandidatesByJob(
  orgId: string,
  jobId: string,
  limit: number = 20
) {
  const supabase = createServerClient()
  
  // Get job details
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('org_id', orgId)
    .single()
  
  if (jobError || !job) {
    throw new Error('Job not found')
  }
  
  // Get job embedding or generate it
  let jobEmbedding = (job as any)?.embedding
  
  if (!jobEmbedding) {
    const jobText = `${(job as any).title} ${(job as any).description} ${(job as any).requirements}`
    jobEmbedding = await generateJobEmbedding(orgId, jobText)
    
    // Save embedding
    await (supabase as any).from('jobs').update({ embedding: jobEmbedding }).eq('id', jobId)
  }
  
  // Search for similar candidates using pgvector
  const { data: candidates, error } = await (supabase as any)
    .rpc('match_candidates', {
      query_embedding: jobEmbedding,
      match_threshold: 0.5,
      match_count: limit,
    })
  
  if (error) {
    // Fallback to direct query if RPC doesn't exist
    const { data: fallbackCandidates } = await (supabase as any)
      .from('candidates')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return fallbackCandidates || []
  }
  
  return candidates
}

export async function searchJobsByQuery(
  orgId: string,
  searchQuery: string,
  limit: number = 20
) {
  const supabase = createServerClient()
  
  // Embed the search query
  const queryEmbedding = await nimEmbedding(orgId, NIM_MODELS.EMBEDDING_E5, searchQuery)
  
  // Search for similar jobs
  const { data: jobs, error } = await (supabase as any)
    .rpc('match_jobs', {
      query_embedding: queryEmbedding[0],
      match_threshold: 0.5,
      match_count: limit,
    })
  
  if (error) {
    // Fallback to direct query
    const { data: fallbackJobs } = await (supabase as any)
      .from('jobs')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return fallbackJobs || []
  }
  
  return jobs
}

export async function findSimilarCandidates(
  orgId: string,
  candidateId: string,
  limit: number = 10
) {
  const supabase = createServerClient()
  
  // Get candidate embedding
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .eq('org_id', orgId)
    .single()
  
  if (candidateError || !candidate || !(candidate as any).embedding) {
    throw new Error('Candidate not found or no embedding')
  }
  
  // Find similar candidates
  const { data: similarCandidates, error } = await (supabase as any)
    .rpc('match_candidates', {
      query_embedding: (candidate as any).embedding,
      match_threshold: 0.7,
      match_count: limit,
    })
  
  if (error) {
    // Fallback
    const { data: fallbackCandidates } = await (supabase as any)
      .from('candidates')
      .select('*')
      .eq('org_id', orgId)
      .neq('id', candidateId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return fallbackCandidates || []
  }
  
  return similarCandidates
}

export async function rankCandidatesWithNIM(
  orgId: string,
  jobId: string,
  candidateIds: string[]
) {
  const supabase = createServerClient()
  
  // Get job details
  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  
  // Get candidate details
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .in('id', candidateIds)
  
  if (!job || !candidates || candidates.length === 0) {
    return []
  }
  
  // Create candidate summaries
  const candidateTexts = candidates.map((c: any) => {
    return `${c.name}: Skills: ${(c.parsed_skills || []).join(', ')}. Experience: ${(c.parsed_experience || []).map((e: any) => `${e.title} at ${e.company}`).join(', ')}. Summary: ${c.ai_summary || ''}`
  }).join('\n\n')
  
  const prompt = `Rank these candidates for the following job position. Return a JSON array of objects with candidate_id, rank (1-N), score (1-100), and brief_reason.

Job: ${(job as any).title}
Description: ${(job as any).description}
Requirements: ${(job as any).requirements}

Candidates:
${candidateTexts}

Rank them from best to worst fit. Return ONLY the JSON array.`

  const response = await nimChatCompletion(
    orgId,
    NIM_MODELS.LLM_405B,
    [
      { role: 'system', content: 'You are an expert recruiter ranking candidates for a job.' },
      { role: 'user', content: prompt }
    ],
    0.1,
    2048
  )
  
  const content = response.choices[0]?.message?.content
  if (!content) {
    return []
  }
  
  try {
    // Extract JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return []
    }
    
    const rankings = JSON.parse(jsonMatch[0])
    return rankings
  } catch (e) {
    console.error('Failed to parse NIM ranking:', e)
    return []
  }
}

export async function semanticSearch(
  orgId: string,
  entityType: 'jobs' | 'candidates',
  query: string,
  limit: number = 20
) {
  const supabase = createServerClient()
  
  // Embed the query
  const queryEmbedding = await nimEmbedding(orgId, NIM_MODELS.EMBEDDING_E5, query)
  
  if (entityType === 'candidates') {
    const { data, error } = await (supabase as any)
      .rpc('match_candidates', {
        query_embedding: queryEmbedding[0],
        match_threshold: 0.5,
        match_count: limit,
      })
    
    return error ? [] : data || []
  } else {
    const { data, error } = await (supabase as any)
      .rpc('match_jobs', {
        query_embedding: queryEmbedding[0],
        match_threshold: 0.5,
        match_count: limit,
      })
    
    return error ? [] : data || []
  }
}
