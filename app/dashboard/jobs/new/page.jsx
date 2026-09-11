import JobForm from '../JobForm';
import { requireWorkspace } from '../../../../lib/workspace-page';
import { canManageJobs } from '../../../../lib/recruit-data';
import { redirect } from 'next/navigation';

export default async function NewJobPage() {
  const { membership } = await requireWorkspace();
  if (!canManageJobs(membership)) redirect('/dashboard/jobs');
  return <JobForm />;
}
