migrate((app) => {
  const names = ['workspaces', 'memberships', 'jobs', 'candidates', 'applications', 'interviews', 'scorecards', 'talent_pools', 'talent_pool_members', 'activities'];
  names.forEach((name) => {
    const collection = app.findCollectionByNameOrId(name);
    if (!collection.fields.getByName('created')) {
      collection.fields.add(new AutodateField({ name: 'created', onCreate: true }));
    }
    if (!collection.fields.getByName('updated')) {
      collection.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }));
    }
    app.save(collection);
  });
}, (app) => {
  const names = ['activities', 'talent_pool_members', 'talent_pools', 'scorecards', 'interviews', 'applications', 'candidates', 'jobs', 'memberships', 'workspaces'];
  names.forEach((name) => {
    const collection = app.findCollectionByNameOrId(name);
    const created = collection.fields.getByName('created');
    const updated = collection.fields.getByName('updated');
    if (created) collection.fields.removeById(created.id);
    if (updated) collection.fields.removeById(updated.id);
    app.save(collection);
  });
});
