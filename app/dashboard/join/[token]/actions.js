'use server';
import {auth,currentUser} from '@clerk/nextjs/server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {cookies} from 'next/headers';
import {getWorkspaceContext} from '../../../../lib/recruit-data';
import {listRecords,pbFilterValue,updateRecord} from '../../../../lib/pocketbase';
export async function acceptInviteAction(_previous,fd) {
 const {userId}=await auth();if(!userId)return {error:'Please sign in again.'};
 const token=String(fd.get('token')||'');if(!/^[a-f0-9]{32}$/.test(token))return {error:'Invalid invitation.'};
 const user=await currentUser();
 try{
  const found=await listRecords('memberships',{filter:`clerk_user_id = "invite:${pbFilterValue(token)}" && status = "invited"`,perPage:1});const invite=found.items?.[0];
  if(!invite||Date.now()-Date.parse(invite.created)>7*24*60*60*1000)return {error:'This invitation has expired or been revoked. Ask the workspace admin for a new link.'};
  if(!user?.emailAddresses?.some(e=>e.verification?.status==='verified'&&e.emailAddress.toLowerCase()===invite.email.toLowerCase()))return {error:'Sign in with the verified email address this invitation was sent to.'};
  const existing=await listRecords('memberships',{filter:`clerk_user_id = "${pbFilterValue(userId)}" && workspace = "${pbFilterValue(invite.workspace)}"`,perPage:1});
  if(existing.items?.length)return {error:'You already have a membership in this workspace. Ask its admin to restore access if disabled.'};
  await updateRecord('memberships',invite.id,{clerk_user_id:userId,status:'active'});
  (await cookies()).set('recruit-workspace',invite.workspace,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
 }catch{return {error:'Could not accept the invitation. Please retry.'};}
 revalidatePath('/dashboard','layout');redirect('/dashboard');
}
