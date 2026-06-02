import { getAdminClient } from './pocketbase-server'
import { auth } from '@clerk/nextjs/server'

/**
 * Server-side PocketBase client with Clerk authentication
 */
export async function createClient() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const pb = await getAdminClient()
  
  // Get user record from PocketBase
  const users = await pb.collection('users').getList(1, 1, {
    filter: `clerk_id = "${userId}"`,
  })

  if (users.items.length === 0) {
    throw new Error('User record not found in database')
  }

  // Authenticate with the user record
  pb.authStore.save(users.items[0].token, users.items[0])
  
  return pb
}
