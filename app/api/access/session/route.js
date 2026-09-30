import { accessIdentity, approvedClerkIdentity, accessFailure } from '../../../../lib/access';
import { APPROVAL_ADMIN } from '../../../../lib/access-core.mjs';

export async function GET(request) {
  try {
    const scope = new URL(request.url).searchParams.get('scope');
    const identity = scope === 'dashboard' ? await approvedClerkIdentity() : await accessIdentity();
    const allowed = Boolean(identity && (scope !== 'admin' || identity.email === APPROVAL_ADMIN));
    return Response.json({ allowed }, { status: allowed ? 200 : 401, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return accessFailure(error); }
}
