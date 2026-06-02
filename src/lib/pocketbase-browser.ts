import PocketBase from 'pocketbase'

// PocketBase client for browser-side operations
const pocketbaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

let pbInstance: PocketBase | null = null

export function getPB(): PocketBase {
  if (!pbInstance) {
    pbInstance = new PocketBase(pocketbaseUrl)
  }

  return pbInstance
}

// Re-export types
export type {
  Organization,
  User,
  Job,
  Candidate,
  Application,
  Interview,
  CheatingEvent,
  NIMLog,
  Activity,
  Subscription,
} from './pocketbase-server'
