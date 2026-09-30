migrate((app) => {
  const collection=app.findCollectionByNameOrId('candidate_vetting');
  [new DateField({name:'consent_confirmed_at'}),new TextField({name:'consent_confirmed_by',max:120})].forEach((field)=>{if(!collection.fields.getByName(field.name))collection.fields.add(field);});
  app.save(collection);
}, (app) => {
  const collection=app.findCollectionByNameOrId('candidate_vetting');
  ['consent_confirmed_at','consent_confirmed_by'].forEach((name)=>{const field=collection.fields.getByName(name);if(field)collection.fields.removeById(field.id);});
  app.save(collection);
});
