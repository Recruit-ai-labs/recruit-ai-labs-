import { redirect } from 'next/navigation';
import { resolveSocialAccess } from '../../../lib/access';

export const dynamic = 'force-dynamic';

export default async function SocialAccessGate() {
  redirect(await resolveSocialAccess());
}
