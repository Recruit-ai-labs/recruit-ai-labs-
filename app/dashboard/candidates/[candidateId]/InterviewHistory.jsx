import Link from 'next/link';
import {listRecords,pbFilterValue} from '../../../../lib/pocketbase';
export default async function InterviewHistory({workspaceId,candidateId}){
 const result=await listRecords('interviews',{filter:`workspace = "${pbFilterValue(workspaceId)}" && candidate = "${pbFilterValue(candidateId)}"`,sort:'-created',perPage:100});
 return <section className="surfaceCard candidateSection"><h2>Interview transcripts &amp; evaluations</h2>{result.items?.length?result.items.map(i=><article key={i.id}><h3>{i.title}</h3><p>{i.candidate_submitted_at?'Submitted':'Awaiting submission'} · {i.candidate_answers?.length||0} answers</p><Link href={`/dashboard/interviews/${i.id}/candidate-response`}>Review transcript and AI evaluation &rarr;</Link></article>):<p>No interviews yet.</p>}</section>;
}
