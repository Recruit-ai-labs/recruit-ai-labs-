import posthog from 'posthog-js'

let posthogInitialized = false

export function initPostHog() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_API_KEY && !posthogInitialized) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY, {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
    })
    posthogInitialized = true
  }
  
  return posthog
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, properties)
  }
}

export const RecruitmentEvents = {
  JOB_POSTED: 'job_posted',
  APPLICATION_RECEIVED: 'application_received',
  CANDIDATE_SCREENED: 'candidate_screened',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEW_COMPLETED: 'interview_completed',
  OFFER_SENT: 'offer_sent',
  CANDIDATE_HIRED: 'candidate_hired',
  CANDIDATE_REJECTED: 'candidate_rejected',
  RESUME_UPLOADED: 'resume_uploaded',
  NIM_QUERY_EXECUTED: 'nim_query_executed',
  CANDIDATE_MATCHED: 'candidate_matched',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
}

export async function generateNIMUsageReport(orgId: string) {
  const { createServerClient } = await import('./supabase-server')
  const supabase = createServerClient()
  
  const { data: logs, error } = await (supabase as any)
    .from('nim_logs')
    .select('*')
    .eq('org_id', orgId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
  
  if (error || !logs) {
    return null
  }
  
  const report = {
    totalCalls: logs.length,
    totalTokensInput: logs.reduce((sum: number, log: any) => sum + log.tokens_input, 0),
    totalTokensOutput: logs.reduce((sum: number, log: any) => sum + log.tokens_output, 0),
    totalCost: logs.reduce((sum: number, log: any) => sum + log.cost_usd, 0),
    avgLatency: logs.reduce((sum: number, log: any) => sum + log.latency_ms, 0) / logs.length,
    modelsUsed: [...new Set(logs.map((log: any) => log.model))],
    dailyUsage: logs.reduce((acc: any, log: any) => {
      const date = new Date(log.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { calls: 0, cost: 0 }
      }
      acc[date].calls += 1
      acc[date].cost += log.cost_usd
      return acc
    }, {}),
  }
  
  return report
}
