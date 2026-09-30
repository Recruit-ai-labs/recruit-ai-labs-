export const interviewSchema = [
  `CREATE TABLE IF NOT EXISTS sireen_roles (job TEXT PRIMARY KEY, workspace TEXT NOT NULL, fingerprint TEXT NOT NULL, blueprint TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sireen_links (id TEXT PRIMARY KEY, workspace TEXT NOT NULL, job TEXT NOT NULL, token TEXT UNIQUE NOT NULL, blueprint TEXT NOT NULL, created TEXT NOT NULL, expires TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS sireen_links_job ON sireen_links(workspace,job)`,
  `CREATE TABLE IF NOT EXISTS sireen_sessions (id TEXT PRIMARY KEY, link TEXT NOT NULL, workspace TEXT NOT NULL, candidate TEXT NOT NULL, secret_hash TEXT NOT NULL, email TEXT NOT NULL, resume TEXT NOT NULL, questions TEXT NOT NULL DEFAULT '[]', transcript TEXT NOT NULL DEFAULT '[]', dna TEXT, status TEXT NOT NULL DEFAULT 'ready', revision INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL, updated TEXT NOT NULL, UNIQUE(link,email))`,
  `CREATE INDEX IF NOT EXISTS sireen_candidate ON sireen_sessions(workspace,candidate)`,
  `CREATE TABLE IF NOT EXISTS sireen_events (id TEXT PRIMARY KEY, session TEXT NOT NULL, kind TEXT NOT NULL, created TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS sireen_event_session ON sireen_events(session,created)`,
  `CREATE TABLE IF NOT EXISTS sireen_leases (session TEXT PRIMARY KEY, expires INTEGER NOT NULL)`,
];
