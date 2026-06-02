import twilio from 'twilio'

let twilioClient: ReturnType<typeof twilio> | null = null

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

export async function sendSMS(params: {
  to: string
  message: string
  from?: string
}) {
  if (!twilioClient) {
    console.warn('Twilio not configured. SMS not sent.')
    return null
  }
  
  const message = await twilioClient.messages.create({
    body: params.message,
    to: params.to,
    from: params.from || process.env.TWILIO_PHONE_NUMBER,
  })
  
  return message
}

export const smsTemplates = {
  interviewReminder: (candidateName: string, jobTitle: string, time: string) => ({
    message: `Hi ${candidateName}, reminder: Your interview for ${jobTitle} is at ${time}. Good luck!`,
  }),
  
  applicationUpdate: (candidateName: string, status: string) => ({
    message: `Hi ${candidateName}, your application status has been updated to: ${status}. Check your email for details.`,
  }),
  
  offerNotification: (candidateName: string, jobTitle: string) => ({
    message: `Congratulations ${candidateName}! You have received an offer for ${jobTitle}. Check your email for details.`,
  }),
}
