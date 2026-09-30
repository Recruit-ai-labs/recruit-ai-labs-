import 'server-only';
import {auth,currentUser} from '@clerk/nextjs/server';

export async function candidateIdentity() {
  const {userId}=await auth();
  if(!userId)return null;
  const user=await currentUser();
  const emails=(user?.emailAddresses||[]).filter(email=>email.verification?.status==='verified').map(email=>email.emailAddress.toLowerCase());
  return emails.length?{userId,emails}:null;
}
