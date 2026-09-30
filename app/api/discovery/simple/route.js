import { NextResponse } from 'next/server';
import { discoverCandidates } from '../../../../lib/discovery-simple.mjs';
import { requireWorkspace } from '../../../../lib/workspace-page';
import { workspaceEntitlements } from '../../../../lib/usage-entitlements';
import { enrichDiscoveryEmails } from '../../../../lib/prospeo';

export async function POST(req) {
  try {
    const { workspace } = await requireWorkspace();
    const entitlement = await workspaceEntitlements(workspace.id);
    const { jobTitle, jdText, skills = [], location = '', count = 6 } = await req.json();
    if (!jobTitle) {
      return NextResponse.json({ error: 'jobTitle is required' }, { status: 400 });
    }
    const maxCandidates = Number.isFinite(entitlement.discoveryCandidates) ? entitlement.discoveryCandidates : 10;
    const requestedCount = Math.min(Math.max(Number(count) || maxCandidates, 3), maxCandidates);
    const results = await discoverCandidates(jobTitle, jdText || '', {
      skills,
      location,
      count: requestedCount,
    });
    const limitedResults = results.slice(0, maxCandidates);
    const enrichedResults = await enrichDiscoveryEmails(limitedResults);
    return NextResponse.json({ results: enrichedResults });
  } catch (e) {
    console.error('API discovery error:', e);
    return NextResponse.json({ error: e.message || 'Discovery failed' }, { status: 500 });
  }
}
