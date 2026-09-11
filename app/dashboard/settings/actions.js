'use server';
import {revalidatePath} from 'next/cache';
import {cookies} from 'next/headers';
import {auth} from '@clerk/nextjs/server';
import {requireWorkspace} from '../../../lib/workspace-page';
import {createRecord,deleteRecord,listRecords,pbFilterValue,updateRecord} from '../../../lib/pocketbase';
const admin = m => m.status === 'active' && ['owner','admin'].includes(m.role);
export async function saveWorkspaceAction(_previous,fd) {
  const {workspace,membership}=await requireWorkspace();
  if(!admin(membership))return {error:'Only workspace owners and admins can edit settings.'};
  const name=String(fd.get('name')||'').trim(), website=String(fd.get('website')||'').trim(), company_size=String(fd.get('company_size')||'');
  if(name.length<2||name.length>120||!['1-10','11-50','51-200','201-500','501-1000','1000+'].includes(company_size))return {error:'Enter a name of 2–120 characters and choose a company size.'};
  if(website)try{if(!['http:','https:'].includes(new URL(website).protocol))throw Error();}catch{return {error:'Enter a valid website starting with https:// or http://.'};}
  try{await updateRecord('workspaces',workspace.id,{name,website,company_size});}catch{return {error:'Workspace could not be saved. Please retry.'};}
  revalidatePath('/dashboard','layout');return {message:'Workspace updated.'};
}
export async function inviteMemberAction(_previous,fd) {
  const {workspace,membership}=await requireWorkspace();
  if(!admin(membership))return {error:'Only workspace owners and admins can invite members.'};
  const email=String(fd.get('email')||'').trim().toLowerCase(),name=String(fd.get('name')||'').trim(),role=String(fd.get('role')||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||name.length<2||name.length>120||!['recruiter','hiring-manager','interviewer'].includes(role))return {error:'Enter a valid name, email and access role.'};
  try {
    const found=await listRecords('memberships',{filter:`workspace = "${pbFilterValue(workspace.id)}" && email = "${pbFilterValue(email)}"`,perPage:1});
    if(found.items?.length)return {error:'This email already has a membership or invitation. Review the team list below.'};
    const token=crypto.randomUUID().replaceAll('-','');
    await createRecord('memberships',{workspace:workspace.id,clerk_user_id:`invite:${token}`,email,name,role,job_function:role,status:'invited'});
    revalidatePath('/dashboard/settings');return {message:'Invitation created. Copy the link below and share it with this person.',path:`/dashboard/join/${token}`};
  }catch{return {error:'Invitation could not be created. Please retry.'};}
}
export async function revokeInviteAction(_previous,fd) {
  const {workspace,membership}=await requireWorkspace();
  if(!admin(membership))return {error:'You do not have permission to revoke invitations.'};
  try{
    const found=await listRecords('memberships',{filter:`workspace = "${pbFilterValue(workspace.id)}" && id = "${pbFilterValue(String(fd.get('membershipId')||''))}" && status = "invited"`,perPage:1});
    if(!found.items?.[0])return {error:'This invitation is no longer pending.'};
    await deleteRecord('memberships',found.items[0].id);
  }catch{return {error:'Could not revoke invitation. Retry.'};}
  revalidatePath('/dashboard/settings');return {message:'Invitation revoked.'};
}

export async function manageMemberAction(_previous,fd) {
 const {workspace,membership,userId}=await requireWorkspace();
 if(!admin(membership))return {error:'Only owners and admins can manage team access.'};
 const id=String(fd.get('membershipId')||''),role=String(fd.get('role')||''),status=String(fd.get('status')||'');
 if(!['admin','recruiter','hiring-manager','interviewer'].includes(role)||!['active','disabled'].includes(status))return {error:'Select a valid role and access status.'};
 try{
  const found=await listRecords('memberships',{filter:`workspace = "${pbFilterValue(workspace.id)}" && id = "${pbFilterValue(id)}"`,perPage:1});const member=found.items?.[0];
  if(!member||member.status==='invited'||member.role==='owner'||member.clerk_user_id===userId)return {error:'You cannot change your own access, an owner, or a pending invitation here.'};
  if(membership.role!=='owner'&&(role==='admin'||member.role==='admin'))return {error:'Only an owner can change administrator access.'};
  await updateRecord('memberships',member.id,{role,status});
 }catch{return {error:'Could not update team access. Please retry.'};}
 revalidatePath('/dashboard','layout');return {message:'Team access updated. Disabled members can no longer access this workspace.'};
}
export async function switchWorkspaceAction(_previous,fd) {
 const {userId}=await auth();if(!userId)return {error:'Sign in again.'};
 const workspace=String(fd.get('workspace')||'');
 const found=await listRecords('memberships',{filter:`clerk_user_id = "${pbFilterValue(userId)}" && workspace = "${pbFilterValue(workspace)}" && status = "active"`,perPage:1});
 if(!found.items?.length)return {error:'You do not have access to this workspace.'};
 (await cookies()).set('recruit-workspace',workspace,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
 revalidatePath('/dashboard','layout');return {message:'Workspace switched.'};
}
