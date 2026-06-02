import { Inngest } from 'inngest'
import { serve } from 'inngest/next'

export const inngest = new Inngest({
  id: 'recruitai',
  name: 'RecruitAI Background Jobs',
})

export const processResumeJob = inngest.createFunction(
  { id: 'process-resume', triggers: [{ event: 'resume.uploaded' }] },
  async ({ event, step }) => {
    const { orgId, fileId, fileType } = event.data
    
    // Download file and serialize as base64 for safe JSON transport across step boundaries
    const fileBase64 = await step.run('download-file', async () => {
      const { createServerClient } = await import('./supabase-server')
      const supabase = createServerClient()
      
      const { data, error } = await supabase.storage
        .from('recruitai-resumes')
        .download(fileId)
      
      if (error) throw error
      const arrayBuffer = await data.arrayBuffer()
      return Buffer.from(arrayBuffer).toString('base64')
    })
    
    // Process resume
    const result = await step.run('parse-resume', async () => {
      const { processResume } = await import('./resume-parser')
      const fileBuffer = Buffer.from(fileBase64, 'base64')
      return await processResume(orgId, fileBuffer, fileType)
    })
    
    // Save to database
    await step.run('save-candidate', async () => {
      const { saveCandidateToDatabase } = await import('./resume-parser')
      return await saveCandidateToDatabase(
        orgId,
        result.resumeText,
        result.parsedData,
        result.aiSummary,
        result.embedding
      )
    })
    
    return { success: true }
  }
)

export const generateJobEmbeddingJob = inngest.createFunction(
  { id: 'generate-job-embedding', triggers: [{ event: 'job.created' }] },
  async ({ event, step }) => {
    const { jobId, orgId } = event.data
    
    await step.run('generate-embedding', async () => {
      const { createServerClient } = await import('./supabase-server')
      const supabase = createServerClient()
      
      const { data: job } = await (supabase as any)
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single()
      
      const { generateJobEmbedding } = await import('./semantic-search')
      const embedding = await generateJobEmbedding(orgId, `${job.title} ${job.description} ${job.requirements}`)
      
      await (supabase as any)
        .from('jobs')
        .update({ embedding })
        .eq('id', jobId)
    })
    
    return { success: true }
  }
)

export const sendNotificationJob = inngest.createFunction(
  { id: 'send-notification', triggers: [{ event: 'notification.send' }] },
  async ({ event, step }) => {
    const { type, to, data } = event.data
    
    await step.run('send-email', async () => {
      const { sendEmail, emailTemplates } = await import('./sendgrid')
      
      let template
      switch (type) {
        case 'application_confirmation':
          template = emailTemplates.applicationConfirmation(data.candidateName, data.jobTitle)
          break
        case 'interview_invitation':
          template = emailTemplates.interviewInvitation(data.candidateName, data.jobTitle, data.date, data.time, data.link)
          break
        default:
          return
      }
      
      await sendEmail({
        to,
        subject: template.subject,
        html: template.html,
      })
    })
    
    return { success: true }
  }
)

export const syncJobBoardsJob = inngest.createFunction(
  { id: 'sync-job-boards', name: 'Sync Job Boards', triggers: [{ cron: '0 */6 * * *' }] },
  async ({ step }) => {
    await step.run('fetch-jobs', async () => {
      const { fetchAdzunaJobs, fetchJSearchJobs } = await import('./job-boards')
      
      const [adzuna, jsearch] = await Promise.all([
        fetchAdzunaJobs({ query: 'software engineer', location: 'United States' }),
        fetchJSearchJobs({ query: 'software engineer', location: 'United States' }),
      ])
      
      return { adzunaCount: adzuna.length, jsearchCount: jsearch.length }
    })
    
    return { success: true }
  }
)

export const serveInngest = serve({
  client: inngest,
  functions: [
    processResumeJob,
    generateJobEmbeddingJob,
    sendNotificationJob,
    syncJobBoardsJob,
  ],
})
