import Link from 'next/link';
import {requireWorkspace} from '../../../../lib/workspace-page';
import {canManageCandidates} from '../../../../lib/recruit-data';
import {listAllRecords,pbFilterValue} from '../../../../lib/pocketbase';
import InterviewForm from './InterviewForm';
export default async function NewInterviewPage() {
 const {workspace,membership}=await requireWorkspace();
 if(!canManageCandidates(membership))return <p>You do not have permission to schedule interviews.</p>;
 const filter='workspace = "'+pbFilterValue(workspace.id)+'"';
 const [jobs,candidates,applications]=await Promise.all(['jobs','candidates','applications'].map(collection=>listAllRecords(collection,{filter})));
 const j=Object.fromEntries(jobs.map(x=>[x.id,x])),c=Object.fromEntries(candidates.map(x=>[x.id,x]));
 const options=applications.filter(a=>a.status==='active'&&j[a.job]&&c[a.candidate]&&c[a.candidate].status==='active'&&c[a.candidate].consent_status!=='withdrawn').map(a=>({...a,jobTitle:j[a.job].title,candidateName:c[a.candidate].first_name+' '+(c[a.candidate].last_name||''),candidateEmail:c[a.candidate].email}));
 return <div className="productPage formPage"><Link href="/dashboard/interviews">← All interviews</Link><section className="surfaceCard interviewForm"><h1>Schedule an interview</h1>{options.length?<InterviewForm applications={options}/>:<p>No eligible applications. <Link href="/dashboard/candidates">Add a candidate to a job first.</Link></p>}</section></div>;
}