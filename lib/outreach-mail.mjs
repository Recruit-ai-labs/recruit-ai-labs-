const allowedTags = new Set(['B','STRONG','I','EM','U','BR','P','DIV','UL','OL','LI','A']);

export function safeHeader(value, max = 200) { return String(value || '').replace(/[\r\n\0]/g, ' ').trim().slice(0, max); }
export function sanitizeEmailHtml(value) {
  let html = String(value || '').slice(0, 20000);
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  return html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag, attrs) => {
    const upper = tag.toUpperCase(); if (!allowedTags.has(upper)) return '';
    if (match.startsWith('</')) return `</${tag.toLowerCase()}>`;
    if (upper !== 'A') return upper === 'BR' ? '<br>' : `<${tag.toLowerCase()}>`;
    const href = attrs.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || '';
    return /^https?:\/\//i.test(href) ? `<a href="${href.replace(/["<>]/g, '')}">` : '<a>';
  });
}
export function buildGmailRaw({ from, to, subject, html, attachments = [] }) {
  const boundary = `recruit_ai_${crypto.randomUUID().replaceAll('-', '')}`;
  const lines = [`From: ${safeHeader(from,254)}`, `To: ${safeHeader(to,254)}`, `Subject: =?UTF-8?B?${Buffer.from(safeHeader(subject)).toString('base64')}?=`, 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(sanitizeEmailHtml(html)).toString('base64')];
  for (const file of attachments) lines.push(`--${boundary}`, `Content-Type: ${safeHeader(file.type || 'application/octet-stream',100)}`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${safeHeader(file.name,120).replaceAll('"','')}"`, '', file.content);
  lines.push(`--${boundary}--`, '');
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}
