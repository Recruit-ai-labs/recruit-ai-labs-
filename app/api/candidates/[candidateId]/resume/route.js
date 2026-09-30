import { getCandidateForWorkspace, getWorkspaceContext } from '../../../../../lib/recruit-data';
import { pbRawRequest } from '../../../../../lib/pocketbase';
import { approvedClerkIdentity } from '../../../../../lib/access';

export async function GET(_request, { params }) {
  const identity = await approvedClerkIdentity();
  if (!identity) return new Response('Forbidden', { status: 403 });
  const { userId } = identity;
  const context = await getWorkspaceContext(userId);
  if (!context) return new Response('Forbidden', { status: 403 });
  const { candidateId } = await params;
  const candidate = await getCandidateForWorkspace(context.workspace.id, candidateId);
  if (!candidate?.resume) return new Response('Resume not found', { status: 404 });
  const filename = Array.isArray(candidate.resume) ? candidate.resume[0] : candidate.resume;
  let source;
  if (candidate.resume_url) {
    const blobResponse = await fetch(candidate.resume_url, { cache: 'no-store' });
    if (!blobResponse.ok) return new Response('Resume not found', { status: 404 });
    source = blobResponse;
  } else {
    source = await pbRawRequest(`/api/files/candidates/${encodeURIComponent(candidate.id)}/${encodeURIComponent(filename)}`);
  }
  return new Response(source.body, {
    status: 200,
    headers: {
      'Content-Type': source.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${filename.replace(/["\r\n]/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
