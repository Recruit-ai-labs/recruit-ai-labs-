import { notFound, redirect } from 'next/navigation';
import JobForm from '../../JobForm';
import { canManageJobs, getJobForWorkspace } from '../../../../../lib/recruit-data';
import { requireWorkspace } from '../../../../../lib/workspace-page';

export default async function EditJobPage({ params }) {
  const { jobId } = await params;
  const { workspace, membership } = await requireWorkspace();
  if (!canManageJobs(membership)) redirect(`/dashboard/jobs/${jobId}`);
  const job = await getJobForWorkspace(workspace.id, jobId);
  if (!job) notFound();
  return <JobForm initialJob={job} />;
}
