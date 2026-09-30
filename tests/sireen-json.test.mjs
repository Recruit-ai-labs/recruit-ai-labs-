import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSireenCompletion, SireenResponseError } from '../lib/sireen-json.mjs';
const completion = (content, finish_reason = 'stop') => ({ choices: [{ message: { content }, finish_reason }] });
test('Sireen accepts complete JSON and fenced provider responses', () => {
  const question = { prompt: 'Describe the trade-offs in your recent project.', criterion_id: 'c1' };
  for (const content of [JSON.stringify(question), '```json\n' + JSON.stringify(question) + '\n```', [{ type: 'text', text: JSON.stringify(question) }]]) assert.deepEqual(parseSireenCompletion(completion(content)), question);
});
test('truncated, missing, non-object and refusal responses are recoverable provider errors', () => {
  for (const payload of [null, {}, completion(''), completion('{"prompt":"unfinished'), completion('null'), completion('[]'), completion('{}', 'length'), completion('{}', 'content_filter')]) {
    assert.throws(() => parseSireenCompletion(payload), error => error instanceof SireenResponseError && error.status === 502);
  }
});
