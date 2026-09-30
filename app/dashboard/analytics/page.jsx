import { requireWorkspace } from '../../../lib/workspace-page';
import { getAnalyticsData } from '../../../lib/analytics-data';
import AnalyticsOverview from '../components/AnalyticsOverview';
import Link from 'next/link';
import { workspaceEntitlements } from '../../../lib/usage-entitlements';

export const dynamic = 'force-dynamic';
export default async function AnalyticsPage() {
  const { workspace } = await requireWorkspace();
  const entitlement = await workspaceEntitlements(workspace.id);
  if (entitlement.plan !== 'pro') return <div className="productPage"><section className="surfaceCard settingsCard"><p className="pageEyebrow">RECRUIT AI PRO</p><h1>Insights are available on Pro.</h1><p>Upgrade to unlock unlimited analytics, intelligence and performance insights.</p><Link className="primaryAction" href="/dashboard/billing">Upgrade to Pro</Link></section></div>;
  const data = await getAnalyticsData(workspace.id);
  return <AnalyticsOverview data={data} />;
}
