'use server';
import {revalidatePath} from 'next/cache';
import {requireWorkspace} from '../../../lib/workspace-page';
import {createRecord,deleteRecord,listRecords,pbFilterValue,updateRecord} from '../../../lib/pocketbase';
import {canManageCandidates} from '../../../lib/recruit-data';
import {storeVettingEvidence} from '../../../lib/vetting-storage';

const kinds=new Set(['identity','education','employment','reference','work-sample','technical']);
const statuses=new Set(['not-started','requested','candidate-provided','reviewed','verified','rejected']);
const riskLevels=new Set(['none','low','medium','high']);
const auditEvent=({from='',to,userId,at=new Date().toISOString()})=>({from,to,reviewer_clerk_user_id:userId,at});
function validSourceUrl(value) { try { const url=new URL(value); return ['http:','https:'].includes(url.protocol); } catch { return false; } }

export async function recordVettingAction(_,form) {
  const {workspace,membership,userId}=await requireWorkspace();
  if(!canManageCandidates(membership)) return {error:'Recruiter access required.'};
  const candidate=String(form.get('candidate')||''),kind=String(form.get('kind')||''),status=String(form.get('status')||''),risk_level=String(form.get('risk_level')||'none'),evidence=String(form.get('evidence')||'').trim().slice(0,3000),source_url=String(form.get('source_url')||'').trim(),due_at=String(form.get('due_at')||'').trim(),file=form.get('evidence_file');
  if(!/^[a-z0-9]{15}$/.test(candidate)||!kinds.has(kind)||!statuses.has(status)||!riskLevels.has(risk_level)) return {error:'Invalid vetting record.'};
  if(form.get('vetting_consent_confirmed')!=='yes') return {error:'Confirm that vetting evidence may be reviewed.'};
  if(due_at&&Number.isNaN(Date.parse(due_at))) return {error:'Enter a valid due date.'};
  if(source_url&&!validSourceUrl(source_url)) return {error:'Evidence source must be a valid http(s) URL.'};
  const owned=await listRecords('candidates',{filter:`id = "${pbFilterValue(candidate)}" && workspace = "${pbFilterValue(workspace.id)}"`,perPage:1});
  if(!owned.items?.[0]) return {error:'Candidate unavailable.'};
  const now=new Date().toISOString(); let artifact=null;
  try { artifact=await storeVettingEvidence(file,workspace.id,crypto.randomUUID()); } catch(error) { return {error:error?.message||'Evidence file could not be stored.'}; }
  try {
    await createRecord('candidate_vetting',{workspace:workspace.id,candidate,kind,status,risk_level,evidence,source_url,artifacts:artifact?[artifact]:[],due_at:due_at?new Date(`${due_at}T00:00:00.000Z`).toISOString():'',consent_confirmed_at:now,consent_confirmed_by:userId,status_history:[auditEvent({to:status,userId,at:now})],reviewer_clerk_user_id:userId,reviewed_at:['reviewed','verified','rejected'].includes(status)?now:''});
  } catch { return {error:'Vetting evidence could not be saved. Please retry.'}; }
  revalidatePath('/dashboard/vetting'); return {message:'Vetting evidence recorded.'};
}

export async function deleteVettingAction(_,form) {
  const {workspace,membership}=await requireWorkspace(); if(!canManageCandidates(membership))return {error:'Recruiter access required.'};
  const id=String(form.get('id')||''); if(!/^[a-z0-9]{15}$/.test(id))return {error:'Invalid check.'};
  try {const checks=await listRecords('candidate_vetting',{filter:`id = "${pbFilterValue(id)}" && workspace = "${pbFilterValue(workspace.id)}"`,perPage:1});if(!checks.items?.[0])return {error:'This check is no longer available.'};await deleteRecord('candidate_vetting',id);revalidatePath('/dashboard/vetting');return {message:'Check deleted.'};}catch{return {error:'The check could not be deleted. Please retry.'};}
}

export async function updateVettingStatusAction({id,status}) {
  const {workspace,membership,userId}=await requireWorkspace(); if(!canManageCandidates(membership))return {error:'Recruiter access required.'};
  if(!/^[a-z0-9]{15}$/.test(String(id||''))||!statuses.has(String(status||'')))return {error:'Invalid vetting update.'};
  try {const checks=await listRecords('candidate_vetting',{filter:`id = "${pbFilterValue(id)}" && workspace = "${pbFilterValue(workspace.id)}"`,perPage:1}),check=checks.items?.[0];if(!check)return {error:'This check is no longer available.'};const history=Array.isArray(check.status_history)?check.status_history:[];await updateRecord('candidate_vetting',id,{status,status_history:[...history,auditEvent({from:check.status||'not-started',to:status,userId})].slice(-30),reviewer_clerk_user_id:userId,reviewed_at:['reviewed','verified','rejected'].includes(status)?new Date().toISOString():''});revalidatePath('/dashboard/vetting');return {message:'Vetting status updated.'};}catch{return {error:'The vetting status could not be updated. Please retry.'};}
}
