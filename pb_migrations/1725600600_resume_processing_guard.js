migrate((app) => {
  const collection = app.findCollectionByNameOrId('resume_extractions');
  collection.indexes.push("CREATE UNIQUE INDEX idx_resume_one_processing ON resume_extractions (candidate) WHERE status = 'processing'");
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('resume_extractions');
  collection.indexes = collection.indexes.filter((index) => !index.includes('idx_resume_one_processing'));
  app.save(collection);
});
