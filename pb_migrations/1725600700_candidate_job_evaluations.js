migrate((app) => {
  const workspaces = app.findCollectionByNameOrId('workspaces');
  const jobs = app.findCollectionByNameOrId('jobs');
  const candidates = app.findCollectionByNameOrId('candidates');
  const applications = app.findCollectionByNameOrId('applications');
  const relation = (name, collectionId) => ({ type: 'relation', name, collectionId, required: true, cascadeDelete: true, maxSelect: 1 });
  const collection = new Collection({
    type: 'base', name: 'candidate_job_evaluations', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      relation('workspace', workspaces.id), relation('job', jobs.id), relation('candidate', candidates.id), relation('application', applications.id),
      { type: 'text', name: 'requested_by_clerk_id', required: true, max: 120 }, { type: 'text', name: 'provider', required: true, max: 40 },
      { type: 'text', name: 'model', required: true, max: 160 }, { type: 'text', name: 'job_fingerprint', required: true, max: 64 },
      { type: 'text', name: 'candidate_fingerprint', required: true, max: 64 },
      { type: 'select', name: 'status', required: true, maxSelect: 1, values: ['processing', 'completed', 'failed'] },
      { type: 'json', name: 'evaluation_data' }, { type: 'number', name: 'overall_score', min: 0, max: 100 },
      { type: 'select', name: 'recommendation', maxSelect: 1, values: ['strong-match', 'match', 'review', 'not-match'] },
      { type: 'number', name: 'confidence', min: 0, max: 1 }, { type: 'json', name: 'warnings' },
      { type: 'text', name: 'error_code', max: 80 }, { type: 'text', name: 'error_message', max: 500 },
      { type: 'select', name: 'review_decision', maxSelect: 1, values: ['pending', 'advance', 'hold', 'reject'] },
      { type: 'text', name: 'review_note', max: 1000 }, { type: 'text', name: 'reviewed_by_clerk_id', max: 120 }, { type: 'date', name: 'reviewed_at' },
      { type: 'number', name: 'prompt_tokens', min: 0 }, { type: 'number', name: 'completion_tokens', min: 0 },
      { type: 'autodate', name: 'created', onCreate: true }, { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE INDEX idx_candidate_job_eval_lookup ON candidate_job_evaluations (workspace, job, candidate)',
      "CREATE UNIQUE INDEX idx_candidate_job_one_processing ON candidate_job_evaluations (application) WHERE status = 'processing'",
    ],
  });
  app.save(collection);
}, (app) => { try { app.delete(app.findCollectionByNameOrId('candidate_job_evaluations')); } catch (_) {} });
