import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { getRecord } from '../../../../lib/pocketbase';
import { extractResumeText } from '../../../../lib/resume-text';
import { analyzeDNA, generateQuestion } from '../../../../lib/tech-dna-ai';
import { cleanText, EVENT_LIMIT, QUESTION_LIMIT } from '../../../../lib/tech-dna-core.mjs';
import { eventsFor, getInterviewLink, getSession, interviewDB, opaqueToken, secretHash, sessionCookie, updateSession } from '../../../../lib/tech-dna-store';

export const runtime = 'nodejs';
export const maxDuration = 120;
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
function publicState(session, events = []) {
  return { status: session.status, answered: session.transcript.length, question: session.questions[session.transcript.length] ? { id: session.questions[session.transcript.length].id, prompt: session.questions[session.transcript.length].prompt } : null, events: events.length, analysisReady: Boolean(session.dna), registered: true };
}
async function boundedBody(request, limit) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Empty request.');
  const chunks = []; let length = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > limit) { await reader.cancel(); throw new Error('Upload exceeds the 3 MB limit.'); } chunks.push(value); }
  return Buffer.concat(chunks);
}
export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const link = await getInterviewLink(token);
    if (!link) return json({ error: 'This interview link has expired or is unavailable.' }, 404);
    const session = await getSession(link, (await cookies()).get(sessionCookie(token))?.value);
    return json(session ? publicState(session, await eventsFor(session.id)) : { registered: false });
  } catch { return json({ error: 'Interview service is unavailable. Please retry.' }, 503); }
}
export async function POST(request, { params }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403);
  let lease = null;
  try {
    const { token } = await params;
    const link = await getInterviewLink(token);
    if (!link) return json({ error: 'This interview link has expired or is unavailable.' }, 404);
    const db = await interviewDB();
    const jar = await cookies();
    let session = await getSession(link, jar.get(sessionCookie(token))?.value);
    const multipart = request.headers.get('content-type')?.includes('multipart/form-data');
    const bytes = await boundedBody(request, multipart ? 3 * 1024 * 1024 : 24000);
    if (multipart) {
      if (session) return json(publicState(session, await eventsFor(session.id)));
      const job = await getRecord('jobs', link.job);
      if (job.status !== 'open') return json({ error: 'This role is not accepting interviews. Contact the recruiter.' }, 409);
      const form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') }, body: bytes }).formData();
      const first = cleanText(form.get('first_name'), 100), last = cleanText(form.get('last_name'), 100), email = cleanText(form.get('email'), 254).toLowerCase();
      if (!first || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || form.get('consent') !== 'yes') return json({ error: 'Enter your name, valid email and consent to continue.' }, 400);
      let resume = cleanText(form.get('resume_text'), 24000);
      const file = form.get('resume');
      if (file?.size > 2 * 1024 * 1024) return json({ error: 'Upload a resume smaller than 2 MB.' }, 400);
      if (file?.size) resume = (await extractResumeText(await file.arrayBuffer(), { filename: file.name, contentType: file.type })).text.slice(0, 24000);
      if (resume.length < 80) return json({ error: 'Upload a text-based PDF/DOCX or paste at least 80 characters of resume experience.' }, 400);
      const id = randomUUID(), candidate = randomUUID().replaceAll('-', '').slice(0, 15), secret = opaqueToken(), now = new Date().toISOString();
      const tx = await db.transaction('write');
      try {
        const count = (await tx.execute({ sql: 'SELECT COUNT(*) AS n FROM sireen_sessions WHERE link=?', args: [link.id] })).rows[0].n;
        if (count >= 100) throw new Error('This invitation has reached capacity. Contact the recruiter.');
        const duplicate = (await tx.execute({ sql: 'SELECT id FROM sireen_sessions WHERE link=? AND email=?', args: [link.id, email] })).rows[0];
        if (duplicate) throw new Error('An application already exists. Resume in the original browser or contact your recruiter.');
        await tx.execute({ sql: `INSERT INTO candidates (id,workspace,first_name,last_name,email,source,status,consent_status,consent_at,skills,summary,created,updated) VALUES (?,?,?,?,?,'career-site','active','obtained',?,'[]','',?,?)`, args: [candidate, link.workspace, first, last, email, now, now, now] });
        await tx.execute({ sql: `INSERT INTO applications (id,workspace,job,candidate,stage,status,applied_at,last_activity_at,created,updated) VALUES (?,?,?,?,'new','active',?,?,?,?)`, args: [randomUUID().replaceAll('-', '').slice(0, 15), link.workspace, link.job, candidate, now, now, now, now] });
        await tx.execute({ sql: 'INSERT INTO sireen_sessions (id,link,workspace,candidate,secret_hash,email,resume,created,updated) VALUES (?,?,?,?,?,?,?,?,?)', args: [id, link.id, link.workspace, candidate, secretHash(secret), email, resume, now, now] });
        await tx.commit();
      } finally { tx.close(); }
      jar.set(sessionCookie(token), secret, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: `/api/sireen/${token}`, maxAge: 7 * 86400 });
      return json({ registered: true, status: 'ready', answered: 0, events: 0 });
    }
    if (!session) return json({ error: 'Please complete your application first.' }, 401);
    let body;
    try { body = JSON.parse(bytes.toString('utf8')); }
    catch { return json({ error: 'Invalid request body. Please retry this step.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid request body.' }, 400);
    const events = await eventsFor(session.id);
    if (body.action === 'event') {
      if (!['active','paused'].includes(session.status)) return json(publicState(session, events));
      if (!['tab_hidden','fullscreen_exit','window_blur','device_lost'].includes(body.kind)) return json({ error: 'Invalid event.' }, 400);
      const tx = await db.transaction('write');
      try {
        const latest = (await tx.execute({ sql: 'SELECT status FROM sireen_sessions WHERE id=?', args: [session.id] })).rows[0];
        const recent = (await tx.execute({ sql: 'SELECT created FROM sireen_events WHERE session=? ORDER BY created DESC LIMIT 1', args: [session.id] })).rows[0];
        // Fullscreen exit, blur and visibility change often describe the same incident.
        if (['active','paused'].includes(latest.status) && (!recent || Date.now() - Date.parse(recent.created) > 2500)) {
          await tx.execute({ sql: 'INSERT INTO sireen_events (id,session,kind,created) VALUES (?,?,?,?)', args: [randomUUID(), session.id, body.kind, new Date().toISOString()] });
          const n = (await tx.execute({ sql: 'SELECT COUNT(*) AS n FROM sireen_events WHERE session=?', args: [session.id] })).rows[0].n;
          await tx.execute({ sql: 'UPDATE sireen_sessions SET status=?,revision=revision+1,updated=? WHERE id=?', args: [n >= EVENT_LIMIT ? 'terminated' : 'paused', new Date().toISOString(), session.id] });
        }
        await tx.commit();
      } finally { tx.close(); }
    } else if (body.action === 'start' || body.action === 'resume') {
      if (!['ready','paused','active'].includes(session.status)) return json(publicState(session, events));
      if (events.length >= EVENT_LIMIT) return json({ error: 'This session has ended and needs recruiter review.' }, 409);
      await updateSession(session, { status: 'active' });
    } else if (body.action === 'answer') {
      if (session.status !== 'active') return json({ error: 'Resume your interview before submitting an answer.' }, 409);
      const q = session.questions[session.transcript.length];
      const answer = cleanText(body.answer, 12000);
      if (!q || q.id !== body.question_id || !answer) return json({ error: 'Answer is missing or this question was already submitted. Reload saved progress.' }, 409);
      const transcript = [...session.transcript, { ...q, answer, answered_at: new Date().toISOString() }];
      await updateSession(session, { transcript, ...(transcript.length === QUESTION_LIMIT ? { status: 'completed' } : {}) });
      // Persist completion first. Evaluation failure must never roll back an answer.
      if (transcript.length === QUESTION_LIMIT) {
        const completed = { ...session, transcript, status: 'completed', revision: session.revision + 1 };
        try { await updateSession(completed, { dna: await analyzeDNA(link.blueprint, transcript) }); }
        catch { console.warn('Tech DNA pending; saved transcript remains available for retry.'); }
      }
    } else if (body.action === 'advance' || body.action === 'analyze') {
      const canAnalyze = body.action === 'analyze' && ['completed','terminated'].includes(session.status);
      const canAdvance = body.action === 'advance' && session.status === 'active' && session.questions.length === session.transcript.length && session.questions.length < QUESTION_LIMIT;
      if (!canAnalyze && !canAdvance) return json(publicState(session, events));
      if (canAnalyze && session.dna) return json(publicState(session, events));
      const lock = await db.execute({ sql: 'INSERT INTO sireen_leases (session,expires) VALUES (?,?) ON CONFLICT(session) DO UPDATE SET expires=excluded.expires WHERE sireen_leases.expires < ?', args: [session.id, Date.now() + 75000, Date.now()] });
      if (!lock.rowsAffected) return json({ error: 'Sireen is still preparing your response. Retry in a moment.' }, 409);
      lease = session.id;
      if (canAnalyze) await updateSession(session, { dna: await analyzeDNA(link.blueprint, session.transcript) });
      else await updateSession(session, { questions: [...session.questions, await generateQuestion(link.blueprint, session.resume, session.transcript, session.questions)] });
    } else return json({ error: 'Unknown action.' }, 400);
    session = await getSession(link, jar.get(sessionCookie(token))?.value);
    return json(publicState(session, await eventsFor(session.id)));
  } catch (error) {
    console.error('Sireen request failed:', error?.code || error?.name);
    if (error?.code === 'sireen_invalid_response') return json({ error: error.message, retryable: true }, 502);
    if (error?.name === 'OpenRouterError') return json({ error: 'Sireen is temporarily unavailable. Your saved answers are safe. Please retry shortly.', retryable: true }, 503);
    const known = /resume|question|Session changed|application already|capacity|Upload|Enter|Sireen could|selectable text/i.test(error.message);
    return json({ error: known ? error.message : 'Could not complete this step. Your saved progress is safe; please retry.' }, known ? 400 : 500);
  } finally {
    if (lease) await (await interviewDB()).execute({ sql: 'DELETE FROM sireen_leases WHERE session=?', args: [lease] }).catch(() => {});
  }
}
