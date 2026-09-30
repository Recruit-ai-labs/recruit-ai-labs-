import 'server-only';
import { cookies } from 'next/headers';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTursoClient } from './turso';
import { ACCESS_COOKIE, APPROVAL_ADMIN, AccessError, createAccessService, normalizeEmail, provisionApprovedWorkspace } from './access-core.mjs';

const isLocalDevelopment = process.env.NODE_ENV === 'development';

async function sendMail({ to, subject, text, idempotencyKey }) {
  const key = process.env.RESEND_API_KEY, from = process.env.SMTP_FROM_EMAIL;
  if (!key || !from) throw new Error('Email delivery is not configured.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    body: JSON.stringify({ from: `Recruit AI <${from}>`, to: [to], subject, text }), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.id) throw new Error('Email delivery failed.');
}
export function accessService() {
  return createAccessService({ db: getTursoClient(), secret: process.env.ACCESS_AUTH_SECRET || process.env.CLERK_SECRET_KEY, sendMail });
}
export async function accessIdentity() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const session = await accessService().session(token);
  if (session) return session;
  const user = await currentUser();
  const email = user?.primaryEmailAddress;
  return email?.verification?.status === 'verified' ? { email: normalizeEmail(email.emailAddress) } : null;
}
export async function requireAccessIdentity() {
  const identity = await accessIdentity();
  if (!identity) redirect('/sign-in');
  return identity;
}
export async function requireApprovalAdmin() {
  const identity = await requireAccessIdentity();
  if (identity.email !== APPROVAL_ADMIN) redirect('/waiting-list');
  return identity;
}
export async function approvedClerkIdentity() {
  const user = await currentUser();
  const primary = user?.primaryEmailAddress;
  if (!user || primary?.verification?.status !== 'verified') return null;
  const email = normalizeEmail(primary.emailAddress);
  // Local development must not depend on the remote approval database. Clerk
  // still verifies the identity; production continues through the full gate.
  if (isLocalDevelopment) return { userId: user.id, email, user };
  const accessSession = await accessService().session((await cookies()).get(ACCESS_COOKIE)?.value);
  if (accessSession && accessSession.email !== email) return null;
  if (email === APPROVAL_ADMIN) return null;
  const request = await accessService().getRequest(email);
  return request?.status === 'approved' ? { userId: user.id, email, user } : null;
}
export async function requireApprovedAccount() {
  const identity = await approvedClerkIdentity();
  if (identity) return identity;
  const visitor = await accessIdentity();
  if (visitor?.email === APPROVAL_ADMIN) redirect('/approval-portal');
  redirect(visitor ? '/waiting-list' : '/sign-in');
}

export async function resolveSocialAccess() {
  const user = await currentUser();
  const primary = user?.primaryEmailAddress;
  if (!user || primary?.verification?.status !== 'verified') return '/sign-in';
  const email = normalizeEmail(primary.emailAddress);
  if (isLocalDevelopment) return '/dashboard';
  if (email === APPROVAL_ADMIN) return '/approval-portal';
  const request = await accessService().getRequest(email);
  if (request?.status !== 'approved') return '/waiting-list';
  await provisionApprovedWorkspace(getTursoClient(), email, user.id);
  return '/dashboard';
}
// Only called after a fresh OTP has been consumed and approval has been read from SQL.
export async function createApprovedTicket(email) {
  if (email === APPROVAL_ADMIN || (await accessService().getRequest(email))?.status !== 'approved') throw new AccessError('Approval is required.', 403);
  const client = await clerkClient();
  let users = await client.users.getUserList({ emailAddress: [email], limit: 2 });
  let user = users.data.find((item) => normalizeEmail(item.primaryEmailAddress?.emailAddress) === email);
  if (!user && users.data.length) throw new AccessError('Use your account’s primary email address to sign in.');
  if (!user) {
    try { user = await client.users.createUser({ emailAddress: [email], skipPasswordRequirement: true }); }
    catch (error) {
      // A simultaneous approved login may have created the same account.
      users = await client.users.getUserList({ emailAddress: [email], limit: 2 });
      user = users.data.find((item) => normalizeEmail(item.primaryEmailAddress?.emailAddress) === email);
      if (!user) throw error;
    }
  }
  await provisionApprovedWorkspace(getTursoClient(), email, user.id);
  const ticket = await client.signInTokens.createSignInToken({ userId: user.id, expiresInSeconds: 60 });
  return ticket.token;
}
export async function readAccessBody(request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new AccessError('Please submit from this website.', 403);
  const raw = await request.text();
  if (raw.length > 12000) throw new AccessError('Request too large.', 413);
  try { const data = JSON.parse(raw); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
  catch { throw new AccessError('Invalid request.'); }
}
export function accessFailure(error) {
  return Response.json({ error: error instanceof AccessError ? error.message : 'This service is temporarily unavailable. Please retry.' }, { status: error instanceof AccessError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
}
