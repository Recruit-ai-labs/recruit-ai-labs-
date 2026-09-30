import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('workspace assistant uses NVIDIA NIM instead of OpenRouter', async () => {
  const source = await readFile(new URL('../app/api/workspace-assistant/route.js', import.meta.url), 'utf8');
  assert.match(source, /NVIDIA_NIM_API_KEY_WORKSPACE\|\|process\.env\.NVIDIA_NIM_API_KEY/);
  assert.match(source, /NVIDIA_NIM_BASE_URL/);
  assert.match(source, /NIM_FAST_LLM_MODEL/);
  assert.doesNotMatch(source, /OPENROUTER_API_KEY|openrouter\/free|openrouter\.ai/);
  assert.match(source, /chat_template_kwargs:\{enable_thinking:false\}/);
  assert.doesNotMatch(source, /FINAL ANSWER|gateBuffer/);
});
