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

