import 'server-only';

const baseUrl = process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL;
let cachedAuth = null;
let pendingAuth = null;
const requestTimeoutMs = 12000;

function requestSignal(signal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export class PocketBaseError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'PocketBaseError';
    this.status = status;
    this.details = details;
  }
}

function requireConfig() {
  if (!baseUrl) throw new PocketBaseError('POCKETBASE_URL is not configured.');
  if (!process.env.POCKETBASE_ADMIN_EMAIL || !process.env.POCKETBASE_ADMIN_PASSWORD) {
    throw new PocketBaseError('PocketBase server credentials are not configured.');
  }
}

async function authenticateSuperuser() {
  requireConfig();
  if (cachedAuth?.token && cachedAuth.expiresAt > Date.now()) return cachedAuth.token;
  // Concurrent page queries share one authentication request, including failures.
  if (pendingAuth) return pendingAuth;
  pendingAuth = requestSuperuserToken();
  try { return await pendingAuth; } finally { pendingAuth = null; }
}

async function requestSuperuserToken() {
  const response = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: process.env.POCKETBASE_ADMIN_EMAIL, password: process.env.POCKETBASE_ADMIN_PASSWORD }),
    cache: 'no-store',
    signal: requestSignal(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.token) throw new PocketBaseError('Unable to authenticate with PocketBase.', response.status, payload);
  cachedAuth = { token: payload.token, expiresAt: Date.now() + 30 * 60 * 1000 };
  return payload.token;
}

export function pbFilterValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function pbRequest(path, options = {}, retry = true) {
  const token = await authenticateSuperuser();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { Authorization: token, ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    cache: 'no-store',
    signal: requestSignal(options.signal),
  });
  if (response.status === 401 && retry) {
    cachedAuth = null;
    return pbRequest(path, options, false);
  }
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new PocketBaseError(payload?.message || `PocketBase request failed with status ${response.status}.`, response.status, payload);
  return payload;
}

export async function pbRawRequest(path, options = {}, retry = true) {
  const token = await authenticateSuperuser();
  const fileAuth = await pbRequest('/api/files/token', {method:'POST'});
  const protectedPath = `${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(fileAuth.token)}`;
  const response = await fetch(`${baseUrl}${protectedPath}`, {
    ...options,
    headers: { Authorization: token, ...options.headers },
    cache: 'no-store',
    signal: requestSignal(options.signal),
  });
  if (response.status === 401 && retry) {
    cachedAuth = null;
    return pbRawRequest(path, options, false);
  }
  if (!response.ok) throw new PocketBaseError(`PocketBase file request failed with status ${response.status}.`, response.status);
  return response;
}

export async function listRecords(collection, { filter, sort, fields, page = 1, perPage = 30 } = {}) {
  const query = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (filter) query.set('filter', filter);
  if (sort) query.set('sort', sort);
  if (fields) query.set('fields', fields);
  return pbRequest(`/api/collections/${collection}/records?${query}`);
}

export function getRecord(collection, id) {
  return pbRequest(`/api/collections/${collection}/records/${encodeURIComponent(id)}`);
}

export async function listAllRecords(collection, options = {}) {
  const items = [];
  let page = 1, pages = 1;
  do {
    const result = await listRecords(collection, { ...options, page, perPage: 200 });
    items.push(...(result.items || []));
    pages = result.totalPages || 1;
    page++;
  } while (page <= pages);
  return items;
}

export function createRecord(collection, data) {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  return pbRequest(`/api/collections/${collection}/records`, { method: 'POST', body: isFormData ? data : JSON.stringify(data) });
}

export function updateRecord(collection, id, data) {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  return pbRequest(`/api/collections/${collection}/records/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  });
}

export function deleteRecord(collection, id) {
  return pbRequest(`/api/collections/${collection}/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
