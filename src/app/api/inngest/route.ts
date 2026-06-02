import { serveInngest } from '@/lib/inngest'

export const { GET, POST, PUT } = serveInngest

export const runtime = 'edge'
