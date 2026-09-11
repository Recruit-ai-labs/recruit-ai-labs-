migrate((app) => {
  const locked = {
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  };
  const relation = (name, collectionId, required = true) => ({
    type: 'relation', name, collectionId, required, cascadeDelete: true, maxSelect: 1,
  });
  const select = (name, values, required = true) => ({
    type: 'select', name, values, required, maxSelect: 1,
  });
  const text = (name, required = false, max = 0) => ({ type: 'text', name, required, max });
  const audit = () => [
    { type: 'autodate', name: 'created', onCreate: true },
    { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
  ];

  const workspaces = new Collection({
    type: 'base', name: 'workspaces', ...locked,
    fields: [
      text('name', true, 120), text('slug', true, 80), { type: 'url', name: 'website' },
      select('company_size', ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']),
      select('hiring_goal', ['build-team', 'hire-faster', 'improve-quality', 'organize-pipeline', 'agency-delivery']),
      text('created_by_clerk_id', true, 120), ...audit(),
    ],
    indexes: ['CREATE UNIQUE INDEX idx_workspaces_slug ON workspaces (slug)'],
  });
  app.save(workspaces);

  const memberships = new Collection({
    type: 'base', name: 'memberships', ...locked,
    fields: [
      relation('workspace', workspaces.id), text('clerk_user_id', true, 120),
      { type: 'email', name: 'email', required: true }, text('name', true, 120),
      select('role', ['owner', 'admin', 'recruiter', 'hiring-manager', 'interviewer']),
      select('job_function', ['founder-owner', 'talent-leader', 'recruiter', 'hiring-manager', 'interviewer', 'operations']),
      select('status', ['invited', 'active', 'disabled']), ...audit(),
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_memberships_user_workspace ON memberships (clerk_user_id, workspace)',
      'CREATE INDEX idx_memberships_workspace ON memberships (workspace)',
    ],
  });
  app.save(memberships);

  const jobs = new Collection({
    type: 'base', name: 'jobs', ...locked,
    fields: [
      relation('workspace', workspaces.id), text('created_by_clerk_id', true, 120), text('title', true, 160),
      text('department', false, 100), text('location', false, 160),
      select('workplace_type', ['remote', 'hybrid', 'onsite'], false),
      select('employment_type', ['full-time', 'part-time', 'contract', 'internship', 'temporary'], false),
      { type: 'number', name: 'openings', min: 1, max: 500 }, text('hiring_manager_name', false, 120),
      { type: 'email', name: 'hiring_manager_email' }, { type: 'date', name: 'target_hire_date' },
      { type: 'number', name: 'experience_min', min: 0, max: 60 }, { type: 'number', name: 'experience_max', min: 0, max: 60 },
      { type: 'json', name: 'must_have_skills' }, { type: 'json', name: 'nice_to_have_skills' },
      { type: 'json', name: 'knockout_criteria' }, { type: 'json', name: 'pipeline_stages' },
      select('priority', ['low', 'normal', 'high', 'urgent'], false), text('description', false, 0), text('responsibilities', false, 0),
      { type: 'number', name: 'salary_min', min: 0 }, { type: 'number', name: 'salary_max', min: 0 },
      text('currency', false, 3), select('status', ['draft', 'open', 'paused', 'closed', 'archived']),
      { type: 'date', name: 'published_at' }, { type: 'date', name: 'archived_at' }, ...audit(),
    ],
    indexes: ['CREATE INDEX idx_jobs_workspace_status ON jobs (workspace, status)'],
  });
  app.save(jobs);

  const candidates = new Collection({
    type: 'base', name: 'candidates', ...locked,
    fields: [
      relation('workspace', workspaces.id), text('created_by_clerk_id', true, 120), text('first_name', true, 100), text('last_name', false, 100),
      { type: 'email', name: 'email', required: true }, text('phone', false, 40), text('location', false, 160), text('current_title', false, 160),
      text('current_company', false, 160), select('source', ['manual', 'referral', 'career-site', 'import', 'sourced'], false),
      text('preferred_name', false, 100), { type: 'url', name: 'linkedin_url' }, { type: 'url', name: 'portfolio_url' },
      { type: 'number', name: 'total_experience', min: 0, max: 60 }, { type: 'number', name: 'notice_period_days', min: 0, max: 365 },
      text('summary', false, 3000), text('owner_clerk_user_id', false, 120),
      select('consent_status', ['not-recorded', 'obtained', 'withdrawn'], false), { type: 'date', name: 'consent_at' },
      select('resume_parse_status', ['not-started', 'pending', 'completed', 'failed'], false),
      { type: 'file', name: 'resume', maxSelect: 1, maxSize: 10485760, mimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
      { type: 'json', name: 'skills' }, select('status', ['active', 'do-not-contact', 'archived'], false), ...audit(),
    ],
    indexes: ['CREATE UNIQUE INDEX idx_candidates_workspace_email ON candidates (workspace, email)'],
  });
  app.save(candidates);

  const applications = new Collection({
    type: 'base', name: 'applications', ...locked,
    fields: [
      relation('workspace', workspaces.id), relation('job', jobs.id), relation('candidate', candidates.id),
      select('stage', ['new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected']),
      select('status', ['active', 'withdrawn', 'hired', 'rejected']), text('owner_clerk_user_id', false, 120),
      { type: 'date', name: 'applied_at' }, { type: 'date', name: 'last_activity_at' }, ...audit(),
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_applications_job_candidate ON applications (job, candidate)',
      'CREATE INDEX idx_applications_workspace_stage ON applications (workspace, stage)',
    ],
  });
  app.save(applications);

  const interviews = new Collection({
    type: 'base', name: 'interviews', ...locked,
    fields: [
      relation('workspace', workspaces.id), relation('job', jobs.id), relation('candidate', candidates.id),
      relation('application', applications.id), text('title', true, 160),
      select('interview_type', ['screening', 'technical', 'behavioral', 'case-study', 'final', 'other']),
      { type: 'date', name: 'starts_at' }, { type: 'date', name: 'ends_at' }, text('timezone', false, 80),
      { type: 'url', name: 'meeting_url' }, { type: 'json', name: 'interviewers' },
      select('status', ['scheduled', 'completed', 'cancelled', 'no-show']), ...audit(),
    ],
    indexes: ['CREATE INDEX idx_interviews_workspace_start ON interviews (workspace, starts_at)'],
  });
  app.save(interviews);

  const scorecards = new Collection({
    type: 'base', name: 'scorecards', ...locked,
    fields: [
      relation('workspace', workspaces.id), relation('interview', interviews.id), relation('application', applications.id),
      text('reviewer_clerk_user_id', true, 120), select('recommendation', ['strong-no', 'no', 'mixed', 'yes', 'strong-yes'], false),
      { type: 'json', name: 'ratings' }, text('notes', false, 0), { type: 'date', name: 'submitted_at' }, ...audit(),
    ],
    indexes: ['CREATE UNIQUE INDEX idx_scorecards_interview_reviewer ON scorecards (interview, reviewer_clerk_user_id)'],
  });
  app.save(scorecards);

  const talentPools = new Collection({
    type: 'base', name: 'talent_pools', ...locked,
    fields: [relation('workspace', workspaces.id), text('name', true, 120), text('description', false, 500), text('created_by_clerk_id', true, 120), ...audit()],
    indexes: ['CREATE INDEX idx_talent_pools_workspace ON talent_pools (workspace)'],
  });
  app.save(talentPools);

  const talentPoolMembers = new Collection({
    type: 'base', name: 'talent_pool_members', ...locked,
    fields: [relation('workspace', workspaces.id), relation('talent_pool', talentPools.id), relation('candidate', candidates.id), text('added_by_clerk_id', true, 120), ...audit()],
    indexes: ['CREATE UNIQUE INDEX idx_pool_candidate ON talent_pool_members (talent_pool, candidate)'],
  });
  app.save(talentPoolMembers);

  const activities = new Collection({
    type: 'base', name: 'activities', ...locked,
    fields: [
      relation('workspace', workspaces.id), text('actor_clerk_user_id', true, 120),
      select('entity_type', ['workspace', 'job', 'candidate', 'application', 'interview', 'scorecard', 'talent-pool']),
      text('entity_id', true, 40), text('action', true, 100), { type: 'json', name: 'metadata' }, ...audit(),
    ],
    indexes: ['CREATE INDEX idx_activities_workspace ON activities (workspace)'],
  });
  app.save(activities);
}, (app) => {
  ['activities', 'talent_pool_members', 'talent_pools', 'scorecards', 'interviews', 'applications', 'candidates', 'jobs', 'memberships', 'workspaces'].forEach((name) => {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) { /* already removed */ }
  });
});
