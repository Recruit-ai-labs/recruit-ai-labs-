import { requireWorkspace } from '../../../lib/workspace-page';
import {getRecord,listAllRecords,pbFilterValue} from '../../../lib/pocketbase';
import {WorkspaceForm,InviteForm,RevokeInvite,MemberForm,WorkspaceSwitcher} from './SettingsForms';
import CopyLink from '../components/CopyLink';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { workspace, membership, userId } = await requireWorkspace();
  const canManage = ['owner','admin'].includes(membership.role);
  const members = canManage ? await listAllRecords('memberships',{filter:'workspace = "'+pbFilterValue(workspace.id)+'"',sort:'-created'}) : [];
  const memberships=await listAllRecords('memberships',{filter:'clerk_user_id = "'+pbFilterValue(userId)+'" && status = "active"'});const workspaces=await Promise.all(memberships.map(m=>getRecord('workspaces',m.workspace)));
  return (
    <div className="productPage">
      <div className="pageHeading"><div><p className="pageEyebrow">ADMINISTRATION</p><h1>Workspace settings</h1><p>Manage workspace identity, access and connected systems.</p></div></div>
      <div className="settingsGrid"><section className="surfaceCard settingsCard"><h2>Your workspaces</h2><WorkspaceSwitcher workspaces={workspaces} current={workspace.id}/></section>
        <section className="surfaceCard settingsCard">
          <div><small>GENERAL</small><h2>Workspace profile</h2><p>Stored in PocketBase</p></div>
          <dl><div><dt>Name</dt><dd>{workspace.name}</dd></div><div><dt>Website</dt><dd>{workspace.website || 'Not provided'}</dd></div><div><dt>Company size</dt><dd>{workspace.company_size}</dd></div><div><dt>Workspace ID</dt><dd><code>{workspace.id}</code></dd></div></dl>
          {canManage ? <WorkspaceForm workspace={workspace}/> : <p>Only owners and admins can edit the workspace.</p>}
        </section>
        <section className="surfaceCard settingsCard">
          <div><small>ACCESS</small><h2>Your membership</h2><p>Identity managed through Clerk</p></div>
          <dl><div><dt>Name</dt><dd>{membership.name}</dd></div><div><dt>Email</dt><dd>{membership.email}</dd></div><div><dt>Access role</dt><dd>{membership.role}</dd></div><div><dt>Job function</dt><dd>{membership.job_function}</dd></div><div><dt>Status</dt><dd>{membership.status}</dd></div></dl>
          {canManage ? <InviteForm/> : <p>Ask an owner or admin to invite team members.</p>}
        </section>
        {canManage && <section className="surfaceCard settingsCard"><h2>Team members and invitations</h2>{members.map(member=><article key={member.id}><h3>{member.name}</h3><p>{member.email} — {member.role} — {member.status}</p>{member.status === "invited" && <>{Date.now()-Date.parse(member.created)<7*86400000?<CopyLink path={"/dashboard/join/"+member.clerk_user_id.replace("invite:","")}/>:<p>Expired invitation. Revoke it, then create a new invitation above.</p>}<RevokeInvite id={member.id}/></>}{member.status!=="invited"&&member.role!=="owner"&&member.clerk_user_id!==userId&&(membership.role==='owner'||member.role!=='admin')&&<MemberForm member={member} isOwner={membership.role==='owner'}/>}</article>)}</section>}<section className="surfaceCard settingsCard integrationCard">
          <div><small>INTEGRATIONS</small><h2>Connections</h2><p>Provider setup will arrive feature by feature.</p></div>
          <ul><li><span>PB</span><div><b>PocketBase</b><small>Primary product database</small></div><mark>Connected</mark></li><li><span>CL</span><div><b>Clerk</b><small>Identity and session management</small></div><mark>Connected</mark></li></ul>
        </section>
      </div>
    </div>
  );
}
