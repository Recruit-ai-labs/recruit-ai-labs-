import OutreachComposer from './OutreachComposer';
import { requireWorkspace } from '../../../lib/workspace-page';
import { getOutreachAccount } from '../../../lib/outreach-accounts';
import './outreach.css';

export const metadata = { title: 'Outreach | Recruit AI', description: 'Compose candidate email and LinkedIn outreach.' };
const values = (value) => Array.isArray(value) ? value : value ? [value] : [];

export default async function OutreachPage({ searchParams }) {
  const query = await searchParams;
  const { email = '', userId } = await requireWorkspace();
  let sendingAccount = null;
  try { sendingAccount = await getOutreachAccount(userId); } catch {}
  const names = values(query.name).slice(0, 10), emails = values(query.email).slice(0, 10), linkedins = values(query.linkedin).slice(0, 10);
  const recipients = Array.from({ length: Math.max(names.length, emails.length, linkedins.length) }, (_, index) => ({
    name: String(names[index] || 'Candidate').slice(0, 120), email: String(emails[index] || '').slice(0, 254), linkedin: String(linkedins[index] || '').slice(0, 500),
  }));
  return <OutreachComposer initialChannel={query.channel === 'linkedin' ? 'linkedin' : 'email'} initialRecipients={recipients} loginEmail={email} sendingAccount={sendingAccount} notice={String(query.notice || '')}/>;
}
