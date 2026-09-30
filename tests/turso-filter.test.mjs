import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { compileTursoFilter } from '../lib/turso-filter.mjs';

test('SQL filters preserve stage, workspace, status and date boundaries', async () => {
  const db = createClient({ url: ':memory:' });
  try {
    await db.execute('CREATE TABLE records (workspace TEXT, stage TEXT, status TEXT, starts_at TEXT, title TEXT)');
    for (const args of [
      ['mine', 'new', 'active', '', 'React'],
      ['other', 'offer', 'active', '', 'React'],
      ['mine', 'offer', 'withdrawn', '', 'React'],
      ['mine', '', 'completed', '2026-09-12T09:00:00Z', 'Done'],
      ['mine', '', 'scheduled', '2026-09-12T09:00:00Z', 'Past'],
      ['mine', '', 'scheduled', '2026-09-12T14:00:00Z', 'Next'],
    ]) await db.execute({ sql: 'INSERT INTO records VALUES (?, ?, ?, ?, ?)', args });
    const count = async filter => {
      const { where, args } = compileTursoFilter(filter);
      return Number((await db.execute({ sql: 'SELECT COUNT(*) AS n FROM records' + where, args })).rows[0].n);
    };
    for (const stage of ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected']) {
      assert.equal(await count(`workspace = "mine" && (stage = "${stage}" && status != "withdrawn" && status = "active")`), stage === 'new' ? 1 : 0);
    }
    assert.equal(await count('workspace = "mine" && (status = "scheduled" && starts_at >= "2026-09-12 12:00:00.000Z")'), 1);
    assert.equal(await count('workspace = "mine" && (status = "completed")'), 1);
    assert.equal(await count('workspace = "empty" && (status = "active" || status = "scheduled")'), 0);
    assert.equal(await count('workspace = "mine" && (title ~ "rea" || title = "Next")'), 3);
    assert.equal(await count('workspace = "mine" && title ~ "%"'), 0);
  } finally { db.close(); }
});

test('quoted values are bound and invalid filters fail closed', () => {
  const value = 'quote" && workspace = "other\\name';
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const result = compileTursoFilter(`workspace = "${escaped}"`);
  assert.deepEqual(result, { where: ' WHERE "workspace" = ?', args: [value] });
  for (const invalid of ['(status = "open"', 'status = "open")', 'workspace = "mine" && broken', 'title ?= "x"', 'status = "open" trailing']) {
    assert.throws(() => compileTursoFilter(invalid), /invalid database filter/);
  }
});
