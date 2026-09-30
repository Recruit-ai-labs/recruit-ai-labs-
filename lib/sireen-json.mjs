export class SireenResponseError extends Error {
  constructor() {
    super('Sireen could not prepare a complete response. Your saved answers are safe. Please retry.');
    this.name = 'SireenResponseError';
    this.code = 'sireen_invalid_response';
    this.status = 502;
  }
}

// Accept transport wrappers, but never repair truncated JSON or invent content.
export function parseSireenCompletion(result) {
  const choice = result?.choices?.[0];
  if (!choice || ['length', 'content_filter'].includes(choice.finish_reason) || choice.message?.refusal) throw new SireenResponseError();
  const content = choice.message?.content;
  const text = (Array.isArray(content) ? content.filter(part => part.type === 'text').map(part => part.text).join('') : content);
  if (typeof text !== 'string' || !text.trim()) throw new SireenResponseError();
  const clean = text.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, '$1').trim();
  try {
    const value = JSON.parse(clean);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new SireenResponseError(); }
}
