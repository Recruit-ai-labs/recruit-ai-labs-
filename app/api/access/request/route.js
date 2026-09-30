import { accessService, accessFailure, readAccessBody } from '../../../../lib/access';
export async function POST(request) {
  try {
    const data = await readAccessBody(request);
    // Vercel overwrites this header. Locally use a shared bucket rather than trusting arbitrary forwarded IPs.
    const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') || 'unknown' : 'local';
    return Response.json(await accessService().requestOtp(data.email, ip), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accessFailure(error); }
}
