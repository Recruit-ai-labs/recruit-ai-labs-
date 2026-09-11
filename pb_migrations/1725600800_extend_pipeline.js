migrate((app) => {
  const collection = app.findCollectionByNameOrId('applications');
  const fields = [new TextField({ name: 'owner_clerk_user_id', max: 120 }), new TextField({ name: 'next_action', max: 300 }), new DateField({ name: 'next_action_at' }), new DateField({ name: 'stage_changed_at' }), new JSONField({ name: 'notes' })];
  fields.forEach((field) => { if (!collection.fields.getByName(field.name)) collection.fields.add(field); });
  app.save(collection);
}, (app) => { const c = app.findCollectionByNameOrId('applications'); ['next_action', 'next_action_at', 'stage_changed_at', 'notes'].forEach((name) => { const f = c.fields.getByName(name); if (f) c.fields.removeById(f.id); }); app.save(c); });
