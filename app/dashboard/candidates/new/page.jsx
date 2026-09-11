import { redirect } from 'next/navigation';
import CandidateForm from '../CandidateForm';
import { canManageCandidates, listJobsForWorkspace } from '../../../../lib/recruit-data';
import { requireWorkspace } from '../../../../lib/workspace-page';

export default async function NewCandidatePage() {
  const { workspace, membership } = await requireWorkspace();
  if (!canManageCandidates(membership)) redirect('/dashboard/candidates');
  const jobs = await listJobsForWorkspace(workspace.id, { status: 'open' });
  return <CandidateForm jobs={jobs.items || []} />;
}
