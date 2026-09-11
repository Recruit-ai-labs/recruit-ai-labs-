'use server';
import {redirect} from 'next/navigation';
import {candidateIdentity} from '../../../../lib/candidate-session';
import {pbRequest} from '../../../../lib/pocketbase';
export async function startPublicInterviewAction(fd) {
 const token=String(fd.get('token')||'');if(!/^[a-f0-9]{44}$/.test(token))redirect('/');
 const identity=await candidateIdentity(),email=String(fd.get('email')||'').trim().toLowerCase();
 if(!identity||!identity.emails.includes(email))redirect('/interview/apply/'+token+'?notice=verify');
 if(!String(fd.get('first_name')||'').trim()||fd.get('consent')!=='yes')redirect('/interview/apply/'+token+'?notice=invalid');
 let result;
 try{result=await pbRequest('/api/recruit/interview/register',{method:'POST',body:JSON.stringify({token,userId:identity.userId,email,first_name:String(fd.get('first_name')).trim(),last_name:fd.get('last_name'),phone:fd.get('phone'),location:fd.get('location'),consent:true,inviteToken:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','').slice(0,12)})});}
 catch(error){redirect('/interview/apply/'+token+'?notice='+(error.status===429?'rate-limited':'unavailable'));}
 if(result.completed)redirect('/interview/apply/'+token+'?notice=completed');
 redirect('/interview/'+result.token);
}