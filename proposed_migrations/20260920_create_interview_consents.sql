-- DRAFT - NEEDS LEGAL REVIEW
-- PROPOSED ONLY: this migration is intentionally outside the active migration folder.
-- DO NOT EXECUTE until the consent policy and protected integration are approved.

-- migrate:up
CREATE TABLE interview_consents (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  text_version TEXT NOT NULL
);

CREATE INDEX interview_consents_candidate_id_idx
  ON interview_consents (candidate_id);

-- migrate:down
DROP INDEX IF EXISTS interview_consents_candidate_id_idx;
DROP TABLE IF EXISTS interview_consents;
