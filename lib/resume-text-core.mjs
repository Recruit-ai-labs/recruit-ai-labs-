import { createHash } from 'node:crypto';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

const MAX_EXTRACTED_CHARACTERS = 60000;

export class ResumeTextError extends Error {
  constructor(code, message) { super(message); this.name = 'ResumeTextError'; this.code = code; }
}

export function normalizeResumeText(value) {
  return String(value || '').replace(/\u0000/g, '').replace(/\r\n?/g, '\n').replace(/[\t\f\v]+/g, ' ').replace(/[ ]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function hashResume(bytes) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

export async function extractResumeText(bytes, { filename = '', contentType = '' } = {}) {
  const buffer = Buffer.from(bytes);
  const lower = filename.toLowerCase();
  let raw = ''; const warnings = [];
  if (contentType.includes('pdf') || lower.endsWith('.pdf')) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try { raw = (await parser.getText()).text || ''; } finally { await parser.destroy().catch(() => null); }
  } else if (contentType.includes('wordprocessingml') || lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    raw = result.value || '';
    warnings.push(...(result.messages || []).map((item) => String(item.message || item)).filter(Boolean).slice(0, 10));
  } else {
    throw new ResumeTextError('unsupported_file', 'Only PDF and DOCX resumes can be analyzed.');
  }
  const normalized = normalizeResumeText(raw);
  if (normalized.length < 80) throw new ResumeTextError('no_extractable_text', 'This resume has too little selectable text. Upload a text-based PDF or DOCX file.');
  const truncated = normalized.length > MAX_EXTRACTED_CHARACTERS;
  if (truncated) warnings.push(`Only the first ${MAX_EXTRACTED_CHARACTERS.toLocaleString('en-US')} characters were analyzed.`);
  return { text: normalized.slice(0, MAX_EXTRACTED_CHARACTERS), warnings, truncated };
}
