import Link from 'next/link';
import { requireWorkspace } from '../../../lib/workspace-page';
import { canManageCandidates } from '../../../lib/recruit-data';
import { discoveryCapabilities } from '../../../lib/discovery-provider.mjs';
import DiscoveryWorkspace from './DiscoveryWorkspace';

export const metadata = { title: 'Candidate discovery | Recruit AI' };
export default async function DiscoveryPage() {
  const { membership } = await requireWorkspace();
  if (!canManageCandidates(membership)) return <section className="surfaceCard settingsCard"><h1>Candidate discovery</h1><p>Discovery is available to workspace owners, admins and recruiters.</p><Link href="/dashboard/candidates">View candidates</Link></section>;
  return <DiscoveryWorkspace capabilities={discoveryCapabilities()}/>;
}
