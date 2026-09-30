import DiscoveryClient from './DiscoveryClient';
import { requireWorkspace } from '../../../lib/workspace-page';
import { workspaceEntitlements } from '../../../lib/usage-entitlements';

export const metadata = {
  title: 'Candidate Discovery | RecruitAI',
  description: 'Discover public LinkedIn profiles with job-relevant Tech DNA hiring briefs.',
};

export default async function DiscoveryPage() {
  const { workspace } = await requireWorkspace();
  const entitlement = await workspaceEntitlements(workspace.id);
  return <DiscoveryClient maxCandidates={entitlement.discoveryCandidates} />;
}
