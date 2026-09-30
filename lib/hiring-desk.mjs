export const terminalStages = new Set(['hired', 'rejected', 'offer']);
export const activeApplication = app => app.status === 'active' && !terminalStages.has(app.stage);
export const candidateName = candidate => [candidate?.first_name, candidate?.last_name].filter(Boolean).join(' ') || 'Candidate';
export function ageDays(value, now = Date.now()) {
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.floor((now - date) / 86400000)) : null;
}
export function taskState(events, key) {
  const state = {};
  const rows = events.filter(event => event.metadata?.key === key).sort((a, b) => String(b.metadata.at || b.created || '').localeCompare(String(a.metadata.at || a.created || '')));
  for (const {metadata: item} of rows) {
    if (item.kind === 'assign' && state.owner === undefined) state.owner = item.owner;
    if (['done', 'reopen', 'snooze'].includes(item.kind) && state.kind === undefined) {
      state.kind = item.kind; state.due = item.due || '';
    }
  }
  return state;
}
export function followupDraft(name, role) {
  return `Hi ${name},\n\nI am following up on your application for ${role}. Please let us know if you are still interested and share your availability for the next conversation.\n\nThank you,\nHiring team`;
}
// Extractive brief: candidate statements, never an automatic capability assessment.
export function transcriptBrief(answers = [], skills = []) {
  const rows = answers.filter(row => row && typeof row.answer === 'string' && row.answer.trim()).map(row => ({
    questionId: String(row.question_id || ''), prompt: String(row.prompt || ''), answer: row.answer.trim(),
  }));
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const references = skill => {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escape(skill)}(?=$|[^\\p{L}\\p{N}])`, 'iu');
    return rows.filter(row => pattern.test(row.answer) || pattern.test(row.prompt));
  };
  return { answers: rows, skills: skills.filter(skill => typeof skill === 'string' && skill.trim()).map(skill => ({
    skill, references: references(skill),
  })) };
}
export function validateDeskEvent(input) {
  const kind = String(input.kind || '');
  if (!['note', 'snooze', 'done', 'reopen', 'assign', 'work-sample'].includes(kind)) throw Error('Choose a valid action.');
  const key = String(input.key || '');
  if (!/^application:[a-zA-Z0-9_-]+$/.test(key)) throw Error('Invalid hiring record.');
  const note = String(input.note || '').trim();
  if (note.length > 4000) throw Error('Keep the note under 4,000 characters.');
  if (['note', 'work-sample'].includes(kind) && note.length < 10) throw Error('Add at least 10 characters of context.');
  const due = String(input.due || '');
  if (kind === 'snooze' && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(Date.parse(due)) || new Date(due).toISOString().slice(0, 10) !== due)) throw Error('Choose a valid reminder date.');
  return { kind, key, note, due: kind === 'snooze' ? due : '', owner: String(input.owner || '').slice(0, 120) };
}
