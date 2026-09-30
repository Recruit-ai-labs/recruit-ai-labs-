import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { APPROVAL_ADMIN, ACCESS_COOKIE, SESSION_SECONDS, AccessError, normalizeEmail } from '../lib/access-core.mjs';
const { transformSync } = createRequire(import.meta.url)('next/dist/build/swc');
function load(file, dependencies) {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const code = transformSync(source, { jsc: { target: 'es2020', parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => dependencies, module, module.exports);
  return module.exports;
}
const user = (email, verified = true) => ({ id: 'user-fixture', primaryEmailAddress: { emailAddress: email, verification: { status: verified ? 'verified' : 'unverified' } } });
function accessFixture({ clerkUser = null, session = null, status = 'pending' } = {}) {
  return load('lib/access.js', {
    APPROVAL_ADMIN, ACCESS_COOKIE, AccessError, normalizeEmail,
    cookies: async () => ({ get: () => ({ value: 'fixture-session' }) }), currentUser: async () => clerkUser,
    getTursoClient: () => ({}), createAccessService: () => ({ session: async () => session, getRequest: async () => ({ status }) }),
    redirect: (path) => { throw new Error('REDIRECT:' + path); },
  });
}
test('dashboard guards reject anonymous, unverified, unapproved and admin identities; accept only approved verified primary email', async () => {
  const scenarios = [
    [{}, '/sign-in'],
    [{ clerkUser: user('person@example.com', false), status: 'approved' }, '/sign-in'],
    [{ clerkUser: user('person@example.com') }, '/waiting-list'],
    [{ session: { email: 'person@example.com' }, status: 'approved' }, '/waiting-list'],
    [{ clerkUser: user(APPROVAL_ADMIN), status: 'approved' }, '/approval-portal'],
    [{ clerkUser: user('person@example.com'), session: { email: APPROVAL_ADMIN }, status: 'approved' }, '/approval-portal'],
  ];
  for (const [input, path] of scenarios) await assert.rejects(accessFixture(input).requireApprovedAccount(), error => error.message === 'REDIRECT:' + path);
  assert.equal((await accessFixture({ clerkUser: user('PERSON@example.com'), status: 'approved' }).requireApprovedAccount()).userId, 'user-fixture');
  await assert.rejects(accessFixture({ session: { email: 'attacker@example.com' } }).requireApprovalAdmin(), /REDIRECT:\/waiting-list/);
  assert.equal((await accessFixture({ session: { email: APPROVAL_ADMIN } }).requireApprovalAdmin()).email, APPROVAL_ADMIN);
});
test('OTP route sends admin to portal and unapproved to waitlist without calling account creation; approved receives a ticket', async () => {
  for (const [email, status, expected] of [[APPROVAL_ADMIN, 'pending', '/approval-portal'], ['new@example.com', 'pending', '/waiting-list'], ['approved@example.com', 'approved', '/dashboard']]) {
    let accounts = 0, applicationWrites = 0, savedCookie, removedCookie = false;
    const route = load('app/api/access/verify/route.js', {
      APPROVAL_ADMIN, ACCESS_COOKIE, SESSION_SECONDS,
      readAccessBody: async () => ({ challengeId: 'fixture', code: '123456' }),
      cookies: async () => ({ set: (...args) => { savedCookie = args; }, delete: () => { removedCookie = true; } }),
      accessService: () => ({ verifyOtp: async () => ({ email, token: 'opaque-test-token' }), revokeSession: async () => {}, ensureRequest: async () => { applicationWrites++; return { status }; } }),
      createApprovedTicket: async () => { accounts++; return 'short-lived-ticket'; },
      accessFailure: error => { throw error; },
    });
    const response = await route.POST(new Request('https://test.example/api/access/verify', { method: 'POST' }));
    const body = await response.json();
    assert.equal(body.redirect, expected); assert.equal(accounts, expected === '/dashboard' ? 1 : 0);
    assert.equal(applicationWrites, email === APPROVAL_ADMIN ? 0 : 1);
    assert.equal(savedCookie[2].httpOnly, true); assert.equal(savedCookie[2].sameSite, 'lax');
    assert.equal(removedCookie, expected === '/dashboard', 'approved login must not leave a second session after Clerk sign-out');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});
test('social sign-in sends admin, approved and unapproved emails to the correct destination', async () => {
  for (const [email, verified, status, destination, provisions] of [
    [null, false, 'pending', '/sign-in', 0],
    [APPROVAL_ADMIN, true, 'pending', '/approval-portal', 0],
    ['new@example.com', true, 'pending', '/waiting-list', 0],
    ['approved@example.com', true, 'approved', '/dashboard', 1],
  ]) {
    let provisioned = 0;
    const module = load('lib/access.js', {
      APPROVAL_ADMIN, ACCESS_COOKIE, AccessError, normalizeEmail,
      currentUser: async () => email ? user(email, verified) : null,
      getTursoClient: () => ({ fixture: true }),
      createAccessService: () => ({ getRequest: async () => ({ status }) }),
      provisionApprovedWorkspace: async (_db, approvedEmail, userId) => {
        provisioned++;
        assert.equal(approvedEmail, 'approved@example.com');
        assert.equal(userId, 'user-fixture');
      },
    });
    assert.equal(await module.resolveSocialAccess(), destination);
    assert.equal(provisioned, provisions);
  }
});
test('approval endpoint checks authenticated actor before touching a requested application', async () => {
  for (const identity of [null, { email: 'attacker@example.com' }]) {
    let calls = 0;
    const route = load('app/api/approvals/route.js', { APPROVAL_ADMIN, AccessError, readAccessBody: async () => ({ number: 1 }), accessIdentity: async () => identity, accessService: () => ({ approve: async () => { calls++; } }), accessFailure: error => Response.json({ error: error.message }, { status: error.status }) });
    assert.equal((await route.POST(new Request('https://test.example/api/approvals'))).status, 403);
    assert.equal(calls, 0);
  }
});
test('onboarding, invitations and workspace switching cannot bypass account approval', async () => {
  for (const [file, action] of [['app/dashboard/onboarding/actions.js', 'completeOnboarding'], ['app/dashboard/join/[token]/actions.js', 'acceptInviteAction'], ['app/dashboard/settings/actions.js', 'switchWorkspaceAction']]) {
    let writes = 0;
    const module = load(file, { requireApprovedAccount: async () => { throw new Error('DENIED'); }, createWorkspaceForUser: async () => { writes++; }, updateRecord: async () => { writes++; } });
    await assert.rejects(module[action]({}, new FormData()), /DENIED/); assert.equal(writes, 0);
  }
});
test('cross-origin, malformed and oversized mutations are rejected', async () => {
  const module = accessFixture();
  const request = (origin, body = '{}') => new Request('https://test.example/api/access/request', { method: 'POST', headers: origin ? { origin } : {}, body });
  for (const origin of [null, 'https://attacker.example']) await assert.rejects(module.readAccessBody(request(origin)), error => error.status === 403);
  await assert.rejects(module.readAccessBody(request('https://test.example', 'x'.repeat(12001))), error => error.status === 413);
  for (const body of ['invalid', 'null', '[]']) await assert.rejects(module.readAccessBody(request('https://test.example', body)), error => error.status === 400);
  assert.deepEqual(await module.readAccessBody(request('https://test.example')), {});
});

test('history session checks reject logged-out visitors and enforce admin/workspace scope without caching', async () => {
  for (const [scope, identity, approved, allowed] of [
    ['admin', null, null, false],
    ['admin', { email: 'other@example.com' }, null, false],
    ['admin', { email: APPROVAL_ADMIN }, null, true],
    ['dashboard', { email: APPROVAL_ADMIN }, null, false],
    ['dashboard', null, { userId: 'approved-user' }, true],
    ['identity', null, null, false],
  ]) {
    const route = load('app/api/access/session/route.js', {
      APPROVAL_ADMIN, accessIdentity: async () => identity, approvedClerkIdentity: async () => approved,
      accessFailure: error => { throw error; },
    });
    const response = await route.GET(new Request(`https://test.example/api/access/session?scope=${scope}`));
    assert.equal(response.status, allowed ? 200 : 401);
    assert.equal((await response.json()).allowed, allowed);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
});
