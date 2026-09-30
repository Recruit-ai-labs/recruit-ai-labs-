import { createHmac, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireWorkspace } from '../../../../../lib/workspace-page';

function sign(payload) { return createHmac('sha256', process.env.ACCESS_AUTH_SECRET || process.env.OUTREACH_TOKEN_SECRET || '').update(payload).digest('base64url'); }

export async function GET(request) {
  const { userId } = await requireWorkspace();
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !(process.env.ACCESS_AUTH_SECRET || process.env.OUTREACH_TOKEN_SECRET)) return NextResponse.redirect(new URL('/dashboard/outreach?notice=oauth-not-configured', request.url));
  const nonce = randomBytes(24).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, nonce, exp: Date.now() + 10 * 60_000 })).toString('base64url');
  const state = `${payload}.${sign(payload)}`;
  const redirectUri = new URL('/api/outreach/google/callback', request.url).toString();
  const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorization.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email https://www.googleapis.com/auth/gmail.send', access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state }).toString();
  const response = NextResponse.redirect(authorization);
  response.cookies.set('outreach-oauth-state', nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/outreach/google/callback', maxAge: 600 });
  return response;
}
