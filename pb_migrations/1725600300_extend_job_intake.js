migrate((app) => {
  const collection = app.findCollectionByNameOrId('jobs');
  const fields = [
    new NumberField({ name: 'openings', min: 1, max: 500 }),
    new TextField({ name: 'hiring_manager_name', max: 120 }),
    new EmailField({ name: 'hiring_manager_email' }),
    new DateField({ name: 'target_hire_date' }),
    new JSONField({ name: 'knockout_criteria' }),
    new JSONField({ name: 'pipeline_stages' }),
    new DateField({ name: 'archived_at' }),
  ];
  fields.forEach((field) => {
    if (!collection.fields.getByName(field.name)) collection.fields.add(field);
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('jobs');
  ['openings', 'hiring_manager_name', 'hiring_manager_email', 'target_hire_date', 'knockout_criteria', 'pipeline_stages', 'archived_at'].forEach((name) => {
    const field = collection.fields.getByName(name);
    if (field) collection.fields.removeById(field.id);
  });
  app.save(collection);
});
