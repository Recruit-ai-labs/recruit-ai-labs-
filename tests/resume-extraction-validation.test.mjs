import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResumeExtraction, parseJsonContent } from '../lib/resume-extraction-validation.mjs';
import { hashResume, normalizeResumeText, ResumeTextError, extractResumeText } from '../lib/resume-text-core.mjs';
import JSZip from 'jszip';
import { buildResumeProfilePatch } from '../lib/resume-review.mjs';

const source = `Aarav Sharma\nSenior Product Engineer at Northstar Labs\nSkills: TypeScript, React, Node.js\nBuilt an applicant tracking platform used by 40 recruiters.\nNorthstar Labs | Senior Product Engineer | Jan 2022 - Present\nB.Tech Computer Science, Pune University, 2021`;

test('parses fenced JSON and normalizes factual resume output', () => {
  const raw = { candidate: { full_name: '  Aarav Sharma ', email: 'AARAV@example.com', phone: null, location: 'Pune', current_title: 'Senior Product Engineer', current_company: 'Northstar Labs', total_experience_years: 4.27, summary: 'Product engineer.' }, skills: [{ name: 'TypeScript', evidence: 'Skills: TypeScript, React, Node.js', confidence: 1.4 }], experience: [{ company: 'Northstar Labs', title: 'Senior Product Engineer', start_date: 'Jan 2022', end_date: null, current: true, location: null, highlights: ['Built an applicant tracking platform'], evidence: 'Northstar Labs | Senior Product Engineer | Jan 2022 - Present' }], education: [], certifications: [], warnings: [], overall_confidence: 0.91 };
  const parsed = parseJsonContent(`\`\`\`json\n${JSON.stringify(raw)}\n\`\`\``);
  const result = normalizeResumeExtraction(parsed, source);
  assert.equal(result.candidate.email, 'aarav@example.com');
  assert.equal(result.candidate.total_experience_years, 4.3);
  assert.equal(result.skills[0].confidence, 1);
  assert.equal(result.skills[0].evidence, 'Skills: TypeScript, React, Node.js');
});

test('drops invented evidence and records a review warning', () => {
  const result = normalizeResumeExtraction({ candidate: { full_name: 'Aarav Sharma' }, skills: [{ name: 'Kubernetes', evidence: 'Certified Kubernetes architect', confidence: .9 }], experience: [], education: [], certifications: [], warnings: [], overall_confidence: .8 }, source);
  assert.equal(result.skills[0].evidence, '');
  assert.match(result.warnings[0], /could not be verified/);
});

test('recovers an exact source line when the model paraphrases evidence', () => {
  const result = normalizeResumeExtraction({ candidate: { full_name: 'Aarav Sharma' }, skills: [{ name: 'React', evidence: 'Experienced with React', confidence: .9 }], experience: [], education: [], certifications: [], warnings: [], overall_confidence: .8 }, source);
  assert.equal(result.skills[0].evidence, 'Skills: TypeScript, React, Node.js');
  assert.equal(result.warnings.length, 0);
});

test('rejects empty or malformed AI output', () => {
  assert.throws(() => parseJsonContent('not json'), /valid JSON/);
  assert.throws(() => normalizeResumeExtraction({ candidate: {}, skills: [], experience: [], education: [], certifications: [] }, source), /usable candidate facts/);
});

test('normalizes text, hashes bytes and rejects unsupported resume files', async () => {
  assert.equal(normalizeResumeText('A\r\n\r\n\r\nB\t C'), 'A\n\nB C');
  assert.equal(hashResume(Buffer.from('resume')).length, 64);
  await assert.rejects(() => extractResumeText(Buffer.from('plain text'), { filename: 'resume.txt' }), (error) => error instanceof ResumeTextError && error.code === 'unsupported_file');
});

test('extracts real text from an in-memory DOCX resume', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.folder('_rels').file('.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder('word').file('document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Aarav Sharma - Senior Product Engineer at Northstar Labs</w:t></w:r></w:p><w:p><w:r><w:t>Skills: TypeScript, React, Node.js. Built reliable recruiting products used by hiring teams.</w:t></w:r></w:p></w:body></w:document>');
  const docx = await zip.generateAsync({ type: 'nodebuffer' });
  const result = await extractResumeText(docx, { filename: 'resume.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  assert.match(result.text, /Aarav Sharma/);
  assert.match(result.text, /TypeScript/);
  assert.equal(result.truncated, false);
});

test('extracts real text from an in-memory PDF resume', async () => {
  const content = 'BT /F1 12 Tf 72 720 Td (Aarav Sharma Senior Product Engineer TypeScript React Node.js PostgreSQL recruiting workflow experience) Tj ET';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (const object of objects) { offsets.push(Buffer.byteLength(pdf)); pdf += object; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const result = await extractResumeText(Buffer.from(pdf, 'binary'), { filename: 'resume.pdf', contentType: 'application/pdf' });
  assert.match(result.text, /Aarav Sharma/);
  assert.match(result.text, /PostgreSQL/);
});

test('applies only recruiter-selected fields and only verified skills', () => {
  const data = { candidate: { current_title: 'Senior Engineer', current_company: 'Northstar', full_name: 'Wrong Name' }, skills: [{ name: 'TypeScript', evidence: 'Skills: TypeScript' }, { name: 'Invented', evidence: '' }] };
  const result = buildResumeProfilePatch({ skills: ['React'] }, data, ['current_title', 'skills', 'full_name', 'email']);
  assert.deepEqual(result.selected, ['current_title', 'skills']);
  assert.deepEqual(result.patch, { current_title: 'Senior Engineer', skills: ['React', 'TypeScript'] });
});
