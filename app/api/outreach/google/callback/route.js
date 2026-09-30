import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireWorkspace } from '../../../../../lib/workspace-page';
import { saveOutreachAccount } from '../../../../../lib/outreach-accounts';

function validState(state, cookie, userId) {
  try {
    const [payload, signature] = state.split('.');
    const expected = createHmac('sha256', process.env.ACCESS_AUTH_SECRET || process.env.OUTREACH_TOKEN_SECRET || '').update(payload).digest('base64url');
    if (!signature || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.userId === userId && data.nonce === cookie && data.exp > Date.now();
  } catch { return false; }
}
export async function GET(request) {
  const url = new URL(request.url), { userId, email } = await requireWorkspace();
  const state = url.searchParams.get('state') || '', cookie = request.cookies.get('outreach-oauth-state')?.value || '';
  const finish = (notice) => { const response = NextResponse.redirect(new URL(`/dashboard/outreach?notice=${notice}`, request.url)); response.cookies.delete('outreach-oauth-state'); return response; };
  if (url.searchParams.get('error')) return finish('oauth-cancelled');
  if (!validState(state, cookie, userId) || !url.searchParams.get('code')) return finish('oauth-invalid');
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: url.searchParams.get('code'), client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: new URL('/api/outreach/google/callback', request.url).toString(), grant_type: 'authorization_code' }), signal: AbortSignal.timeout(15000) });
    const token = await tokenResponse.json(); if (!tokenResponse.ok || !token.access_token) throw new Error('Token exchange failed');
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10000) });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.email_verified || String(profile.email).toLowerCase() !== String(email).toLowerCase()) return finish('oauth-email-mismatch');
    await saveOutreachAccount({ userId, provider: 'google', email: String(profile.email).toLowerCase(), accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000 });
    return finish('account-connected');
  } catch { return finish('oauth-failed'); }
}
