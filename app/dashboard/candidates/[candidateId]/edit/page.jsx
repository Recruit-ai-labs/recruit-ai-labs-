import { notFound, redirect } from 'next/navigation';
import CandidateForm from '../../CandidateForm';
import { canManageCandidates, getCandidateForWorkspace } from '../../../../../lib/recruit-data';
import { requireWorkspace } from '../../../../../lib/workspace-page';

export default async function EditCandidatePage({ params }) {
  const { candidateId } = await params;
  const { workspace, membership } = await requireWorkspace();
  if (!canManageCandidates(membership)) redirect(`/dashboard/candidates/${candidateId}`);
  const candidate = await getCandidateForWorkspace(workspace.id, candidateId);
  if (!candidate) notFound();
  return <CandidateForm initialCandidate={candidate} />;
}
