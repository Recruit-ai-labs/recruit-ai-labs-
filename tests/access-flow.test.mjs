import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { createAccessService, migrateAccess, APPROVAL_ADMIN, validateWaitlist, provisionApprovedWorkspace } from '../lib/access-core.mjs';

const details = { name: 'Test Applicant', company: 'Example Team', phone: '', volume: '6-20 hires / month', message: 'We need help screening engineering candidates.', consent: 'yes', website: '' };
async function setup() {
  const db = createClient({ url: ':memory:' }); await migrateAccess(db);
  let time = 1900000000000, failMail = false; const mail = [];
  const service = createAccessService({ db, secret: 'test-secret-with-no-production-access', now: () => time, sendMail: async (message) => { if (failMail) throw new Error('offline'); mail.push(message); } });
  return { db, service, mail, advance: (ms) => { time += ms; }, fail: (value) => { failMail = value; }, code: () => mail.at(-1).text.match(/code is (\d{6})/)[1] };
}
test('OTP creates no account or application until verified; stable waitlist, approval, notification retry', async () => {
  const t = await setup();
  try {
    const challenge = await t.service.requestOtp(' New@Example.COM ', 'ip1');
    assert.equal(await t.service.getRequest('new@example.com'), null);
    assert.equal((await t.db.execute('SELECT * FROM access_sessions')).rows.length, 0);
    const verified = await t.service.verifyOtp(challenge.challengeId, t.code());
    assert.equal(verified.email, 'new@example.com');
    assert.equal((await t.service.session(verified.token)).email, verified.email);
    const first = await t.service.ensureRequest(verified.email);
    assert.equal(first.status, 'pending');
    assert.equal(Number((await t.service.ensureRequest('NEW@example.com')).number), Number(first.number));
    const second = await t.service.ensureRequest('second@example.com');
    assert.equal(Number(second.number), Number(first.number) + 1, 'return visits do not consume queue numbers');
    await assert.rejects(t.service.verifyOtp(challenge.challengeId, t.code()), /Invalid or expired/);
    await t.service.submit(verified.email, { ...details, email: APPROVAL_ADMIN });
    assert.equal(await t.service.getRequest(APPROVAL_ADMIN), null, 'submitted email cannot change verified identity');
    await assert.rejects(t.service.approve('attacker@example.com', Number(first.number), 'https://test.example/sign-in'), /portal access/);
    t.fail(true);
    assert.deepEqual(await t.service.approve(APPROVAL_ADMIN, Number(first.number), 'https://test.example/sign-in'), { approved: true, notified: false });
    assert.equal((await t.service.getRequest(verified.email)).status, 'approved');
    t.fail(false);
    assert.deepEqual(await t.service.approve(APPROVAL_ADMIN, Number(first.number), 'https://test.example/sign-in'), { approved: true, notified: true });
    assert.match(t.mail.at(-1).text, /https:\/\/test.example\/sign-in/);
    const count = t.mail.length;
    await t.service.approve(APPROVAL_ADMIN, Number(first.number), 'https://test.example/sign-in');
    assert.equal(t.mail.length, count, 'repeat approval does not resend successful email');
    t.advance(61000);
    const next = await t.service.requestOtp(verified.email, 'ip1');
    const returning = await t.service.verifyOtp(next.challengeId, t.code());
    assert.equal((await t.service.getRequest(returning.email)).status, 'approved');
    assert.equal((await t.db.execute('SELECT * FROM access_requests')).rows.length, 2);
  } finally { t.db.close(); }
});
test('admin can approve a verified email before application details are submitted', async () => {
  const t = await setup();
  try {
    const challenge = await t.service.requestOtp('early@example.com', 'ip-early');
    const identity = await t.service.verifyOtp(challenge.challengeId, t.code());
    const row = await t.service.ensureRequest(identity.email);
    assert.equal(row.submitted_at, null);
    assert.deepEqual(await t.service.approve(APPROVAL_ADMIN, Number(row.number), 'https://test.example/sign-in'), { approved: true, notified: true });
    assert.equal((await t.service.getRequest(identity.email)).status, 'approved');
  } finally { t.db.close(); }
});
test('OTP attempts, expiry, resend, rate limiting, hashed secrets and session expiry', async () => {
  const t = await setup();
  try {
    const first = await t.service.requestOtp('secure@example.com', 'ip1'), originalCode = t.code();
    const stored = (await t.db.execute('SELECT digest FROM access_otp')).rows[0];
    assert.notEqual(stored.digest, originalCode);
    await assert.rejects(t.service.requestOtp('SECURE@example.com', 'ip2'), /Too many/);
    const wrong = originalCode === '000000' ? '999999' : '000000';
    for (let i = 0; i < 5; i++) await assert.rejects(t.service.verifyOtp(first.challengeId, wrong), /Invalid or expired/);
    await assert.rejects(t.service.verifyOtp(first.challengeId, originalCode), /Invalid or expired/);
    t.advance(61000);
    const second = await t.service.requestOtp('secure@example.com', 'ip1');
    t.advance(600001);
    await assert.rejects(t.service.verifyOtp(second.challengeId, t.code()), /Invalid or expired/);
    const third = await t.service.requestOtp('secure@example.com', 'ip1');
    const identity = await t.service.verifyOtp(third.challengeId, t.code());
    assert.equal(await t.service.session('f'.repeat(64)), null);
    t.advance(8 * 3600000 + 1);
    assert.equal(await t.service.session(identity.token), null);
    await assert.rejects(t.service.ensureRequest(APPROVAL_ADMIN), /cannot join/);
  } finally { t.db.close(); }
});
test('validation and failed email do not allow access; new OTP invalidates old code', async () => {
  const t = await setup();
  try {
    for (const data of [null, { ...details, consent: '' }, { ...details, company: '' }, { ...details, message: 'short' }, { ...details, volume: 'invalid' }, { ...details, website: 'spam' }]) assert.throws(() => validateWaitlist(data));
    t.fail(true); await assert.rejects(t.service.requestOtp('delivery@example.com', 'ip1'), /could not be sent/);
    assert.equal((await t.db.execute('SELECT * FROM access_otp')).rows.length, 0);
    t.fail(false); t.advance(61000);
    const old = await t.service.requestOtp('delivery@example.com', 'ip1'), oldCode = t.code();
    t.advance(61000);
    const fresh = await t.service.requestOtp('delivery@example.com', 'ip1');
    await assert.rejects(t.service.verifyOtp(old.challengeId, oldCode), /Invalid or expired/);
    assert.equal((await t.service.verifyOtp(fresh.challengeId, t.code())).email, 'delivery@example.com');
  } finally { t.db.close(); }
});
test('workspace creation requires approval and reuses existing accounts without duplicating or reactivating memberships', async () => {
  const t = await setup();
  try {
    await t.db.batch([
      'CREATE TABLE workspaces(id TEXT PRIMARY KEY,name TEXT,slug TEXT,website TEXT,company_size TEXT,hiring_goal TEXT,created_by_clerk_id TEXT)',
      'CREATE TABLE memberships(id TEXT PRIMARY KEY,workspace TEXT,clerk_user_id TEXT,email TEXT,name TEXT,role TEXT,job_function TEXT,status TEXT)',
    ], 'write');
    await assert.rejects(provisionApprovedWorkspace(t.db, 'new@example.com', 'user-new'), /Approval/);
    const row = await t.service.submit('new@example.com', details);
    await assert.rejects(provisionApprovedWorkspace(t.db, 'new@example.com', 'user-new'), /Approval/);
    assert.equal((await t.db.execute('SELECT * FROM workspaces')).rows.length, 0);
    await t.service.approve(APPROVAL_ADMIN, Number(row.number), 'https://test.example/sign-in');
    await provisionApprovedWorkspace(t.db, 'new@example.com', 'user-new');
    await provisionApprovedWorkspace(t.db, 'new@example.com', 'user-new');
    assert.equal((await t.db.execute('SELECT * FROM workspaces')).rows.length, 1);
    const member = (await t.db.execute('SELECT * FROM memberships')).rows[0];
    assert.equal(member.email, 'new@example.com'); assert.equal(member.name, details.name); assert.equal(member.role, 'owner');
    await t.db.execute("UPDATE memberships SET status='disabled'");
    await provisionApprovedWorkspace(t.db, 'new@example.com', 'user-new');
    assert.equal((await t.db.execute('SELECT status FROM memberships')).rows[0].status, 'disabled');
    await assert.rejects(provisionApprovedWorkspace(t.db, APPROVAL_ADMIN, 'admin-user'), /Approval/);
  } finally { t.db.close(); }
});
