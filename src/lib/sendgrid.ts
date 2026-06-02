import sendgrid from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}) {
  const msg = {
    to: params.to,
    from: params.from || 'noreply@recruitai.com',
    subject: params.subject,
    html: params.html,
    text: params.text || params.html.replace(/<[^>]*>/g, ''),
  }
  
  const [response] = await sendgrid.send(msg)
  return response
}

export const emailTemplates = {
  applicationConfirmation: (candidateName: string, jobTitle: string) => ({
    subject: `Application Received - ${jobTitle}`,
    html: `
      <h2>Hi ${candidateName},</h2>
      <p>Thank you for applying to the <strong>${jobTitle}</strong> position.</p>
      <p>We've received your application and our team will review it shortly.</p>
      <p>You'll hear from us soon about next steps.</p>
      <p>Best regards,<br/>The RecruitAI Team</p>
    `,
  }),
  
  interviewInvitation: (candidateName: string, jobTitle: string, date: string, time: string, link?: string) => ({
    subject: `Interview Invitation - ${jobTitle}`,
    html: `
      <h2>Hi ${candidateName},</h2>
      <p>Congratulations! We'd like to invite you to an interview for the <strong>${jobTitle}</strong> position.</p>
      <p><strong>Date:</strong> ${date}<br/>
      <strong>Time:</strong> ${time}</p>
      ${link ? `<p><strong>Video Link:</strong> <a href="${link}">${link}</a></p>` : ''}
      <p>Please confirm your availability.</p>
      <p>Best regards,<br/>The RecruitAI Team</p>
    `,
  }),
  
  statusUpdate: (candidateName: string, jobTitle: string, status: string) => ({
    subject: `Application Update - ${jobTitle}`,
    html: `
      <h2>Hi ${candidateName},</h2>
      <p>Your application for <strong>${jobTitle}</strong> has been updated.</p>
      <p><strong>Current Status:</strong> ${status}</p>
      <p>We'll keep you updated on any further changes.</p>
      <p>Best regards,<br/>The RecruitAI Team</p>
    `,
  }),
  
  offerLetter: (candidateName: string, jobTitle: string, details: string) => ({
    subject: `Job Offer - ${jobTitle}`,
    html: `
      <h2>Congratulations ${candidateName}!</h2>
      <p>We are pleased to offer you the position of <strong>${jobTitle}</strong>.</p>
      <p>${details}</p>
      <p>We look forward to having you join our team!</p>
      <p>Best regards,<br/>The RecruitAI Team</p>
    `,
  }),
}
