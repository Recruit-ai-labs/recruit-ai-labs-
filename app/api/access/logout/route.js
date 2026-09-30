import { cookies } from 'next/headers';
import { accessFailure, readAccessBody, accessService } from '../../../../lib/access';
import { ACCESS_COOKIE } from '../../../../lib/access-core.mjs';
export async function POST(request) {
  try {
    await readAccessBody(request);
    const jar = await cookies(), token = jar.get(ACCESS_COOKIE)?.value;
    if (token) await accessService().revokeSession(token);
    jar.delete(ACCESS_COOKIE);
    return Response.json({ success: true });
  } catch (error) { return accessFailure(error); }
}
