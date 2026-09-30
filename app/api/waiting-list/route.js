import { accessIdentity, accessService, accessFailure, readAccessBody } from '../../../lib/access';
import { AccessError, APPROVAL_ADMIN } from '../../../lib/access-core.mjs';
export async function POST(request) {
  try {
    const data = await readAccessBody(request), identity = await accessIdentity();
    if (!identity) throw new AccessError('Please verify your email again.', 401);
    if (identity.email === APPROVAL_ADMIN) throw new AccessError('Use the approval portal.', 403);
    const entry = await accessService().submit(identity.email, data);
    return Response.json({ number: Number(entry.number), status: entry.status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accessFailure(error); }
}
