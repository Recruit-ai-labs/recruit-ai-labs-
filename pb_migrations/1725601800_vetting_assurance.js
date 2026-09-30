migrate((app) => {
  const collection = app.findCollectionByNameOrId('candidate_vetting');
  const fields = [new SelectField({name:'risk_level',maxSelect:1,values:['none','low','medium','high']}),new DateField({name:'due_at'}),new TextField({name:'source_url',max:2048}),new JSONField({name:'status_history'})];
  fields.forEach((field) => { if (!collection.fields.getByName(field.name)) collection.fields.add(field); });
  collection.indexes.push('CREATE INDEX idx_candidate_vetting_due ON candidate_vetting (workspace,due_at)');
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('candidate_vetting');
  ['risk_level','due_at','source_url','status_history'].forEach((name) => { const field=collection.fields.getByName(name); if(field) collection.fields.removeById(field.id); });
  collection.indexes=collection.indexes.filter((index) => !index.includes('idx_candidate_vetting_due'));
  app.save(collection);
});
