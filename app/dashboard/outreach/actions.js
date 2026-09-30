'use server';

import { redirect } from 'next/navigation';
import { requireWorkspace } from '../../../lib/workspace-page';
import { googleAccessToken } from '../../../lib/outreach-accounts';
import { buildGmailRaw, sanitizeEmailHtml, safeHeader } from '../../../lib/outreach-mail.mjs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendOutreachAction(formData) {
  const { userId, email: loginEmail } = await requireWorkspace();
  const recipients = [...new Set(formData.getAll('recipients').map(String).map((item) => item.trim().toLowerCase()).filter(Boolean))].slice(0, 10);
  const subject = safeHeader(formData.get('subject')), body = sanitizeEmailHtml(formData.get('body'));
  if (!recipients.length || recipients.some((item) => !emailPattern.test(item)) || !subject || !body || formData.get('outreachBasis') !== 'confirmed') redirect('/dashboard/outreach?notice=incomplete');
  const attachments = [];
  let totalSize = 0;
  for (const file of formData.getAll('attachments').slice(0, 5)) {
    if (!file || typeof file === 'string' || !file.size) continue;
    totalSize += file.size;
    if (file.size > 10 * 1024 * 1024 || totalSize > 20 * 1024 * 1024) redirect('/dashboard/outreach?notice=attachment-too-large');
    attachments.push({ name: file.name, type: file.type, content: Buffer.from(await file.arrayBuffer()).toString('base64') });
  }
  try {
    const account = await googleAccessToken(userId);
    if (!account || account.email !== String(loginEmail).toLowerCase()) redirect('/dashboard/outreach?notice=account-required');
    const responses = await Promise.all(recipients.map((recipient) => fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: buildGmailRaw({ from: account.email, to: recipient, subject, html: body, attachments }) }), signal: AbortSignal.timeout(20000) })));
    if (responses.some((response) => !response.ok)) throw new Error('Gmail rejected delivery');
  } catch (error) { if (error?.digest) throw error; redirect('/dashboard/outreach?notice=failed'); }
  redirect('/dashboard/outreach?notice=sent');
}
