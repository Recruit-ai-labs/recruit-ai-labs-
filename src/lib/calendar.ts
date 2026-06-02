const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

interface CalendarEvent {
  id: string
  summary: string
  description: string
  location?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: Array<{ email: string }>
  conferenceData?: any
}

export async function createCalendarEvent(params: {
  accessToken: string
  event: {
    title: string
    description: string
    startTime: string
    endTime: string
    attendees?: string[]
    location?: string
    videoCall?: boolean
  }
}): Promise<CalendarEvent> {
  const event: Omit<CalendarEvent, 'id'> = {
    summary: params.event.title,
    description: params.event.description,
    location: params.event.location,
    start: {
      dateTime: params.event.startTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: params.event.endTime,
      timeZone: 'UTC',
    },
  }
  
  if (params.event.attendees) {
    event.attendees = params.event.attendees.map(email => ({ email }))
  }
  
  if (params.event.videoCall) {
    event.conferenceData = {
      createRequest: {
        requestId: `recruitai-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    }
  }
  
  const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${response.statusText}`)
  }
  
  return response.json()
}

export async function updateCalendarEvent(params: {
  accessToken: string
  eventId: string
  event: Partial<{
    title: string
    description: string
    startTime: string
    endTime: string
    attendees: string[]
    location: string
  }>
}): Promise<CalendarEvent> {
  const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${params.eventId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params.event),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to update calendar event: ${response.statusText}`)
  }
  
  return response.json()
}

export async function deleteCalendarEvent(params: {
  accessToken: string
  eventId: string
}): Promise<void> {
  const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${params.eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${params.accessToken}`,
    },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to delete calendar event: ${response.statusText}`)
  }
}

export async function checkCalendarAvailability(params: {
  accessToken: string
  startTime: string
  endTime: string
}): Promise<boolean> {
  const response = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: params.startTime,
      timeMax: params.endTime,
      items: [{ id: 'primary' }],
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to check availability: ${response.statusText}`)
  }
  
  const data = await response.json()
  const busySlots = data.calendars?.primary?.busy || []
  
  return busySlots.length === 0
}
