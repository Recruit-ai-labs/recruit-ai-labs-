import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGmailRaw, safeHeader, sanitizeEmailHtml } from '../lib/outreach-mail.mjs';

test('outreach headers reject CRLF injection', () => {
  assert.equal(safeHeader('Hello\r\nBcc: attacker@example.com'), 'Hello  Bcc: attacker@example.com');
});

test('outreach HTML removes active content and unsafe links', () => {
  const html = sanitizeEmailHtml('<b>Hi</b><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a>');
  assert.equal(html, '<b>Hi</b><a>bad</a><a href="https://example.com">good</a>');
});

test('Gmail MIME keeps recipients isolated and includes attachments', () => {
  const raw = buildGmailRaw({ from: 'sender@example.com', to: 'one@example.com', subject: 'Role', html: '<b>Hello</b>', attachments: [{ name: 'role.txt', type: 'text/plain', content: Buffer.from('details').toString('base64') }] });
  const mime = Buffer.from(raw, 'base64url').toString();
  assert.match(mime, /To: one@example\.com/);
  assert.doesNotMatch(mime, /two@example\.com/);
  assert.match(mime, /filename="role\.txt"/);
});
