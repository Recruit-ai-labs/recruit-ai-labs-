import assert from 'node:assert/strict';
import { extractStructuredResume } from '../lib/nim-resume.js';

const resume = `Aarav Sharma
Email: aarav.sharma@example.com
Location: Pune, India
Senior Product Engineer at Northstar Labs
January 2022 - Present
Skills: TypeScript, React, Node.js, PostgreSQL
Built an applicant tracking workflow used by 40 recruiters.
Reduced candidate intake processing time by 35 percent.

Software Engineer at Cedar Systems
July 2019 - December 2021
Developed internal workflow applications using JavaScript and PostgreSQL.

B.Tech in Computer Science, Pune University, 2019`;

const result = await extractStructuredResume(resume);
assert.equal(typeof result.model, 'string');
assert.ok(result.structured.candidate.full_name);
assert.ok(result.structured.skills.length > 0);
assert.ok(result.structured.skills.some((skill) => skill.evidence));
assert.ok(result.structured.experience.length > 0);
assert.ok(result.structured.experience.some((item) => item.evidence));
console.log(JSON.stringify({ ok: true, model: result.model, skills: result.structured.skills.length, experience: result.structured.experience.length, confidence: result.structured.overall_confidence }));
