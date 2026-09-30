import { cookies } from 'next/headers';
import { accessService, accessFailure, readAccessBody, createApprovedTicket } from '../../../../lib/access';
import { ACCESS_COOKIE, SESSION_SECONDS, APPROVAL_ADMIN } from '../../../../lib/access-core.mjs';
export async function POST(request) {
  try {
    const data = await readAccessBody(request), service = accessService();
    const identity = await service.verifyOtp(data.challengeId, data.code);
    (await cookies()).set(ACCESS_COOKIE, identity.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS });
    let result;
    if (identity.email === APPROVAL_ADMIN) result = { redirect: '/approval-portal' };
    else {
      const entry = await service.ensureRequest(identity.email);
      result = entry.status === 'approved' ? { ticket: await createApprovedTicket(identity.email), redirect: '/dashboard' } : { redirect: '/waiting-list' };
    }
    if (result.ticket) {
      // Once handed to Clerk, its session owns sign-out; don't leave a separate waitlist login alive.
      await service.revokeSession(identity.token);
      (await cookies()).delete(ACCESS_COOKIE);
    }
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accessFailure(error); }
}
