import {requireWorkspace} from '../../../lib/workspace-page';
import {listRecords,pbFilterValue} from '../../../lib/pocketbase';
import {canManageCandidates} from '../../../lib/recruit-data';
import VettingForm from './VettingForm';
import VettingBoard from './VettingBoard';
import Icon from '../components/Icon';
export const dynamic='force-dynamic';
export default async function Page(){
  const {workspace,membership}=await requireWorkspace(),filter=`workspace = "${pbFilterValue(workspace.id)}"`;
  const [candidates,checks]=await Promise.all([listRecords('candidates',{filter:`${filter} && status = "active"`,perPage:200}),listRecords('candidate_vetting',{filter,sort:'-created',perPage:100})]);
  const verified=checks.items.filter(check=>check.status==='verified').length,overdue=checks.items.filter(check=>check.due_at&&!['verified','rejected'].includes(check.status)&&Date.parse(check.due_at)<Date.now()).length,flagged=checks.items.filter(check=>['medium','high'].includes(check.risk_level)).length;
  return <div className="productPage vettingWorkspace"><header className="pageHeading"><div><p className="pageEyebrow">CANDIDATE ASSURANCE</p><h1>Vetting</h1><p>A clear record of what was checked, the evidence behind it and what needs follow-up.</p></div><span className="reviewBadge"><Icon name="shield"/>Human verified</span></header><div className="reviewMetrics"><article><span>Recent checks</span><strong>{checks.items.length}</strong></article><article><span>Verified</span><strong>{verified}</strong></article><article><span>Needs attention</span><strong>{overdue+flagged}</strong><small>{overdue} overdue · {flagged} risk flagged</small></article></div><div className="vettingLayout"><section className="surfaceCard settingsCard"><div className="reviewSectionHeading"><Icon name="shield"/><div><h2>Record a check</h2><p>Capture the source, risk and review outcome.</p></div></div>{canManageCandidates(membership)?<VettingForm candidates={candidates.items}/>:<p>You have view-only access.</p>}</section><VettingBoard checks={checks.items} candidates={candidates.items} canManage={canManageCandidates(membership)}/></div></div>;
}
