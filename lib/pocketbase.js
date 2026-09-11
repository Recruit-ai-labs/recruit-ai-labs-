import 'server-only';
import { createClient } from '@libsql/client';

const baseUrl = process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL;
let cachedAuth = null;
let pendingAuth = null;
const requestTimeoutMs = 12000;
const useTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
const tursoClient = useTurso ? createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }) : null;

function decodeTurso(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}
function encodeTurso(value) {
  if (value === undefined) return null;
  if (value && typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}
function parseTursoFilter(filter = '') {
  return String(filter).split(/\s+&&\s+/).flatMap((part) => {
    const m = part.match(/^([a-zA-Z0-9_]+)\s*(=|!=)\s*"([\s\S]*)"$/);
    return m ? [{ field: m[1], op: m[2], value: m[3].replaceAll('\\"','"') }] : [];
  });
}
function tursoRows(collection, rows) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, decodeTurso(v)])));
}

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
  if (useTurso) {
    const clauses = parseTursoFilter(filter); const where = clauses.length ? ` WHERE ${clauses.map((x) => `"${x.field}" ${x.op} ?`).join(' AND ')}` : '';
    const args = clauses.map((x) => x.value); const order = sort ? ` ORDER BY "${String(sort).replace(/^-/, '')}" ${String(sort).startsWith('-') ? 'DESC' : 'ASC'}` : '';
    const count = await tursoClient.execute({ sql: `SELECT COUNT(*) AS total FROM "${collection.replaceAll('"','""')}"${where}`, args });
    const totalItems = Number(count.rows[0]?.total || 0); const offset = (page - 1) * perPage;
    const result = await tursoClient.execute({ sql: `SELECT ${fields ? fields.split(',').map((x) => `"${x.trim()}"`).join(',') : '*'} FROM "${collection.replaceAll('"','""')}"${where}${order} LIMIT ? OFFSET ?`, args: [...args, perPage, offset] });
    return { items: tursoRows(collection, result.rows), page, perPage, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / perPage)) };
  }
  const query = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (filter) query.set('filter', filter);
  if (sort) query.set('sort', sort);
  if (fields) query.set('fields', fields);
  return pbRequest(`/api/collections/${collection}/records?${query}`);
}

export function getRecord(collection, id) {
  if (useTurso) return tursoClient.execute({ sql: `SELECT * FROM "${collection.replaceAll('"','""')}" WHERE id = ? LIMIT 1`, args: [id] }).then((r) => { if (!r.rows[0]) throw new PocketBaseError('Record not found.', 404); return tursoRows(collection, r.rows)[0]; });
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
  if (useTurso) { if (data instanceof FormData) throw new PocketBaseError('File uploads require storage migration.', 501); const id = data.id || crypto.randomUUID().replaceAll('-','').slice(0,15); const entries = Object.entries({ ...data, id }); return tursoClient.execute({ sql: `INSERT INTO "${collection.replaceAll('"','""')}" (${entries.map(([k]) => `"${k}"`).join(',')}) VALUES (${entries.map(() => '?').join(',')})`, args: entries.map(([,v]) => encodeTurso(v)) }).then(() => getRecord(collection, id)); }
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  return pbRequest(`/api/collections/${collection}/records`, { method: 'POST', body: isFormData ? data : JSON.stringify(data) });
}

export function updateRecord(collection, id, data) {
  if (useTurso) { if (data instanceof FormData) throw new PocketBaseError('File uploads require storage migration.', 501); const entries = Object.entries(data); return tursoClient.execute({ sql: `UPDATE "${collection.replaceAll('"','""')}" SET ${entries.map(([k]) => `"${k}" = ?`).join(',')} WHERE id = ?`, args: [...entries.map(([,v]) => encodeTurso(v)), id] }).then(() => getRecord(collection, id)); }
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  return pbRequest(`/api/collections/${collection}/records/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  });
}

export function deleteRecord(collection, id) {
  if (useTurso) return tursoClient.execute({ sql: `DELETE FROM "${collection.replaceAll('"','""')}" WHERE id = ?`, args: [id] });
  return pbRequest(`/api/collections/${collection}/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
