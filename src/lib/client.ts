import PocketBase from 'pocketbase'
import { useAuth } from '@clerk/nextjs'

/**
 * Browser-side PocketBase client
 * Note: This uses admin client for simplicity. In production, you should
 * implement proper user authentication.
 */
export function createClient() {
  const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090')
  return pb
}
