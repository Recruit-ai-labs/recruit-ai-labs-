import { NIM_MODELS, NIM_COSTS, type NIMModel } from '@/config/nim-models'
import { createServerClient } from './supabase-server'
import { nimCache } from './nim-cache'

const NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1'
const NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY

if (!NIM_API_KEY) {
  console.warn('NVIDIA_NIM_API_KEY is not set. NIM API calls will fail.')
}

interface NimMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface NimUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

interface NimCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: NimMessage
    finish_reason: string
  }>
  usage: NimUsage
}

interface NimEmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function logNimCall(
  orgId: string,
  model: string,
  endpoint: string,
  tokensInput: number,
  tokensOutput: number,
  latencyMs: number
) {
  try {
    const supabase = createServerClient()
    
    const costPerToken = NIM_COSTS[model as NIMModel]
    let costUsd = 0
    
    if ('per_request' in costPerToken) {
      costUsd = costPerToken.per_request
    } else {
      costUsd = (tokensInput * costPerToken.input) + (tokensOutput * costPerToken.output)
    }
    
    const { error } = await supabase.from('nim_logs').insert({
      org_id: orgId,
      model,
      endpoint,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      latency_ms: latencyMs,
      cost_usd: costUsd,
    } as any)
    
    if (error) {
      console.error('Failed to log NIM call:', error)
    }
    
    // Update org credits
    const { error: updateError } = await (supabase as any)
      .from('organizations')
      .update({ nim_credits_used: costUsd })
      .eq('id', orgId)
    
    if (updateError) {
      console.error('Failed to update org credits:', updateError)
    }
  } catch (error) {
    console.error('Failed to log NIM call:', error)
  }
}

export async function nimChatCompletion(
  orgId: string,
  model: string = NIM_MODELS.LLM_70B,
  messages: NimMessage[],
  temperature: number = 0.3,
  maxTokens: number = 4096,
  maxRetries: number = 3
): Promise<NimCompletionResponse> {
  // Check cache first (only cache if temperature is 0 - deterministic)
  if (temperature === 0) {
    const cacheKey = ['chat', model, messages, maxTokens]
    const cached = nimCache.get<NimCompletionResponse>(...cacheKey)
    if (cached) {
      console.log('[NIM Cache] Hit for chat completion')
      return cached
    }
  }
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NIM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      })
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        const waitTime = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : Math.pow(2, attempt) * 1000 + Math.random() * 1000
        
        console.warn(`NIM rate limited. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(waitTime)
        lastError = new Error(`Rate limited: ${response.statusText}`)
        continue
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`NIM API error (${response.status}): ${errorText}`)
      }
      
      const data = await response.json() as NimCompletionResponse
      const latency = Date.now() - startTime
      
      // Cache the response (15 minutes TTL)
      if (temperature === 0) {
        const cacheKey = ['chat', model, messages, maxTokens]
        nimCache.set(data, 15 * 60 * 1000, ...cacheKey)
      }
      
      await logNimCall(
        orgId,
        model,
        '/chat/completions',
        data.usage?.prompt_tokens || 0,
        data.usage?.completion_tokens || 0,
        latency
      )
      
      return data
    } catch (error) {
      lastError = error as Error
      if (attempt === maxRetries - 1) {
        throw error
      }
      await sleep(Math.pow(2, attempt) * 1000)
    }
  }
  
  throw lastError || new Error('NIM request failed after retries')
}

export async function nimEmbedding(
  orgId: string,
  model: string = NIM_MODELS.EMBEDDING_E5,
  input: string | string[],
  maxRetries: number = 3
): Promise<number[][]> {
  // Check cache first (embeddings are deterministic)
  const cacheKey = ['embedding', model, input]
  const cached = nimCache.get<number[][]>(...cacheKey)
  if (cached) {
    console.log('[NIM Cache] Hit for embedding')
    return cached
  }
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${NIM_BASE_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NIM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: Array.isArray(input) ? input : [input],
          encoding_format: 'float',
        }),
      })
      
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000
        console.warn(`NIM rate limited. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(waitTime)
        lastError = new Error(`Rate limited: ${response.statusText}`)
        continue
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`NIM Embedding error (${response.status}): ${errorText}`)
      }
      
      const data = await response.json() as NimEmbeddingResponse
      const latency = Date.now() - startTime
      
      // Cache embeddings for 1 hour
      const cacheKey = ['embedding', model, input]
      nimCache.set(data.data.map(d => d.embedding), 60 * 60 * 1000, ...cacheKey)
      
      await logNimCall(
        orgId,
        model,
        '/embeddings',
        data.usage?.prompt_tokens || 0,
        0,
        latency
      )
      
      return data.data.map(d => d.embedding)
    } catch (error) {
      lastError = error as Error
      if (attempt === maxRetries - 1) {
        throw error
      }
      await sleep(Math.pow(2, attempt) * 1000)
    }
  }
  
  throw lastError || new Error('NIM embedding failed after retries')
}

export async function nimStreamChat(
  orgId: string,
  model: string = NIM_MODELS.LLM_70B,
  messages: NimMessage[],
  temperature: number = 0.3,
  maxTokens: number = 4096
): Promise<ReadableStream<string>> {
  const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NIM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`NIM Streaming API error (${response.status}): ${errorText}`)
  }
  
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Failed to get response reader')
  }
  
  const decoder = new TextDecoder()
  
  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  controller.enqueue(content)
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const cost = NIM_COSTS[model as NIMModel]
  if (!cost) return 0
  
  if ('per_request' in cost) {
    return cost.per_request
  }
  
  return (inputTokens * cost.input) + (outputTokens * cost.output)
}

export { NIM_MODELS }
