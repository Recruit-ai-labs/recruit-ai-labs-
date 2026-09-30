const DEFAULT_MODEL = 'openrouter/free';
const BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = 'OpenRouterError';
    this.code = code;
    this.status = status;
  }
}

export function openRouterConfig(model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new OpenRouterError('openrouter_not_configured', 'OpenRouter AI is not configured on this server.');
  return { apiKey, model, base: BASE_URL };
}

export async function openRouterCompletion({ messages, model, timeout = 120000, ...options }) {
  const settings = openRouterConfig(model);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${settings.base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
        ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
        ...(process.env.OPENROUTER_APP_NAME ? { 'X-Title': process.env.OPENROUTER_APP_NAME } : {}),
      },
      body: JSON.stringify({ model: settings.model, temperature: 0, ...options, messages }),
      signal: controller.signal,
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new OpenRouterError('openrouter_request_failed', payload?.error?.message || `OpenRouter request failed with status ${response.status}.`, response.status);
    return { ...payload, model: payload?.model || settings.model };
  } catch (error) {
    if (error?.name === 'AbortError') throw new OpenRouterError('openrouter_timeout', 'OpenRouter AI timed out. Please retry.');
    throw error;
  } finally { clearTimeout(timer); }
}
