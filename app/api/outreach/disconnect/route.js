import { NextResponse } from 'next/server';
import { requireWorkspace } from '../../../../lib/workspace-page';
import { deleteOutreachAccount, getOutreachAccount } from '../../../../lib/outreach-accounts';

export async function POST(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Cross-origin request blocked.' }, { status: 403 });
  const { userId } = await requireWorkspace();
  const account = await getOutreachAccount(userId, 'google', { secrets: true });
  if (account?.refreshToken) await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: account.refreshToken }), signal: AbortSignal.timeout(10000) }).catch(() => null);
  await deleteOutreachAccount(userId, 'google');
  return NextResponse.redirect(new URL('/dashboard/outreach?notice=account-disconnected', request.url), 303);
}
