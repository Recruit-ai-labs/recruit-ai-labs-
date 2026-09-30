import {approvedClerkIdentity} from '../../../../../../lib/access';
import {getWorkspaceContext} from '../../../../../../lib/recruit-data';
import {listRecords,pbFilterValue} from '../../../../../../lib/pocketbase';

export const runtime='nodejs';
export async function GET(_request,{params}) {
  const identity=await approvedClerkIdentity(); if(!identity)return new Response('Forbidden',{status:403});
  const context=await getWorkspaceContext(identity.userId); if(!context)return new Response('Forbidden',{status:403});
  const {checkId,artifactId}=await params;
  if(!/^[a-z0-9]{15}$/.test(checkId)||!/^[a-f0-9-]{36}$/.test(artifactId))return new Response('Not found',{status:404});
  const records=await listRecords('candidate_vetting',{filter:`id = "${pbFilterValue(checkId)}" && workspace = "${pbFilterValue(context.workspace.id)}"`,perPage:1});
  const artifact=(records.items?.[0]?.artifacts||[]).find(item=>item?.id===artifactId);
  if(!artifact?.url)return new Response('Not found',{status:404});
  const source=await fetch(artifact.url,{cache:'no-store'}); if(!source.ok)return new Response('Evidence file not found',{status:404});
  const filename=String(artifact.filename||'evidence').replace(/["\r\n]/g,'');
  return new Response(source.body,{headers:{'Content-Type':artifact.mime||source.headers.get('content-type')||'application/octet-stream','Content-Disposition':`inline; filename="${filename}"`,'Cache-Control':'private, no-store'}});
}
