import { accessIdentity, accessService, accessFailure, readAccessBody } from '../../../lib/access';
import { AccessError, APPROVAL_ADMIN } from '../../../lib/access-core.mjs';
export async function POST(request) {
  try {
    const data = await readAccessBody(request), identity = await accessIdentity();
    if (identity?.email !== APPROVAL_ADMIN) throw new AccessError('Approval portal access required.', 403);
    const base = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url);
    const result = await accessService().approve(identity.email, data.number, new URL('/sign-in', base).href);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accessFailure(error); }
}
