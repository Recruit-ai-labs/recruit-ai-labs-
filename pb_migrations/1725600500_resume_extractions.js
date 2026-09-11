migrate((app) => {
  const workspaces = app.findCollectionByNameOrId('workspaces');
  const candidates = app.findCollectionByNameOrId('candidates');
  const collection = new Collection({
    type: 'base',
    name: 'resume_extractions',
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: 'relation', name: 'workspace', collectionId: workspaces.id, required: true, cascadeDelete: true, maxSelect: 1 },
      { type: 'relation', name: 'candidate', collectionId: candidates.id, required: true, cascadeDelete: true, maxSelect: 1 },
      { type: 'text', name: 'requested_by_clerk_id', required: true, max: 120 },
      { type: 'text', name: 'provider', required: true, max: 40 },
      { type: 'text', name: 'model', required: true, max: 160 },
      { type: 'text', name: 'source_filename', required: true, max: 255 },
      { type: 'text', name: 'source_sha256', required: true, max: 64 },
      { type: 'select', name: 'status', required: true, maxSelect: 1, values: ['processing', 'completed', 'failed', 'approved', 'rejected'] },
      { type: 'json', name: 'structured_data' },
      { type: 'json', name: 'warnings' },
      { type: 'text', name: 'error_code', max: 80 },
      { type: 'text', name: 'error_message', max: 500 },
      { type: 'number', name: 'input_characters', min: 0, max: 100000 },
      { type: 'number', name: 'prompt_tokens', min: 0 },
      { type: 'number', name: 'completion_tokens', min: 0 },
      { type: 'text', name: 'reviewed_by_clerk_id', max: 120 },
      { type: 'date', name: 'reviewed_at' },
      { type: 'json', name: 'applied_fields' },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
    ],
    indexes: [
      'CREATE INDEX idx_resume_extractions_workspace_candidate ON resume_extractions (workspace, candidate)',
      'CREATE INDEX idx_resume_extractions_candidate_status ON resume_extractions (candidate, status)',
    ],
  });
  app.save(collection);
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId('resume_extractions')); } catch (_) { /* already removed */ }
});
