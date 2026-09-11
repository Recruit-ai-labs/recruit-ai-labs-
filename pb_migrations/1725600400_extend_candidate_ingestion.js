migrate((app) => {
  const collection = app.findCollectionByNameOrId('candidates');
  const fields = [
    new TextField({ name: 'preferred_name', max: 100 }),
    new URLField({ name: 'linkedin_url' }),
    new URLField({ name: 'portfolio_url' }),
    new NumberField({ name: 'total_experience', min: 0, max: 60 }),
    new NumberField({ name: 'notice_period_days', min: 0, max: 365 }),
    new TextField({ name: 'summary', max: 3000 }),
    new TextField({ name: 'owner_clerk_user_id', max: 120 }),
    new SelectField({ name: 'consent_status', values: ['not-recorded', 'obtained', 'withdrawn'], maxSelect: 1 }),
    new DateField({ name: 'consent_at' }),
    new SelectField({ name: 'resume_parse_status', values: ['not-started', 'pending', 'completed', 'failed'], maxSelect: 1 }),
  ];
  fields.forEach((field) => { if (!collection.fields.getByName(field.name)) collection.fields.add(field); });
  collection.fields.getByName('email').required = true;
  collection.indexes = collection.indexes.filter((index) => !index.includes('idx_candidates_workspace_email'));
  collection.indexes.push('CREATE UNIQUE INDEX idx_candidates_workspace_email ON candidates (workspace, email)');
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('candidates');
  collection.fields.getByName('email').required = false;
  ['preferred_name', 'linkedin_url', 'portfolio_url', 'total_experience', 'notice_period_days', 'summary', 'owner_clerk_user_id', 'consent_status', 'consent_at', 'resume_parse_status'].forEach((name) => {
    const field = collection.fields.getByName(name);
    if (field) collection.fields.removeById(field.id);
  });
  collection.indexes = collection.indexes.filter((index) => !index.includes('idx_candidates_workspace_email'));
  collection.indexes.push('CREATE INDEX idx_candidates_workspace_email ON candidates (workspace, email)');
  app.save(collection);
});
