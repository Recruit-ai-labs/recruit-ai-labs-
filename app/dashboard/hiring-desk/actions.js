'use server';
import {revalidatePath} from 'next/cache';
import {requireWorkspace} from '../../../lib/workspace-page';
import {createRecord, listRecords, pbFilterValue} from '../../../lib/pocketbase';
import {canManageCandidates} from '../../../lib/recruit-data';
import {validateDeskEvent} from '../../../lib/hiring-desk.mjs';

export async function saveDeskEvent(previous, form) {
  const {workspace, membership, userId} = await requireWorkspace();
  if (!canManageCandidates(membership)) return {error: 'You do not have permission to manage hiring tasks.'};
  try {
    const event = validateDeskEvent(Object.fromEntries(form));
    const [type, id] = event.key.split(':');
    if (type !== 'application') return {error: 'This task type is no longer supported.'};
    const scope = `workspace = "${pbFilterValue(workspace.id)}"`;
    const found = await listRecords('applications', {filter: `${scope} && id = "${pbFilterValue(id)}"`, perPage: 1});
    if (!found.items?.length) return {error: 'This record is unavailable in your workspace.'};
    await createRecord('activities', {workspace: workspace.id, actor_clerk_user_id: userId,
      entity_type: type, entity_id: id, action: 'hiring-desk.event',
      metadata: {...event, owner: event.kind === 'assign' ? userId : '', at: new Date().toISOString()},
    });
    for (const path of ['/dashboard/today', '/dashboard/decision-room', '/dashboard/follow-ups']) revalidatePath(path);
    return {success: 'Saved to workspace history.'};
  } catch { return {error: 'Could not save. Check the fields and retry; your note has not been recorded.'}; }
}
