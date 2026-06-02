import PocketBase from 'pocketbase'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || 'aadilhussainkhan7@gmail.com'
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || 'Aadilhussain@786'

const pb = new PocketBase(POCKETBASE_URL)

async function setupPocketBase() {
  console.log('🚀 Starting PocketBase setup...\n')

  try {
    // Step 1: Try to authenticate (admin account should already exist via web UI)
    console.log('🔐 Step 1: Authenticating as admin...')
    console.log('ℹ️  If this fails, please create admin account first at: http://127.0.0.1:8090/_/')
    console.log(`📧 Email: ${ADMIN_EMAIL}`)
    console.log(`🔑 Password: ${ADMIN_PASSWORD}\n`)
    
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
    console.log('✅ Authenticated successfully\n')

    // Step 3: Create collections
    console.log('📊 Step 3: Creating collections...')

    const collections = [
      // Organizations
      {
        name: 'organizations',
        type: 'base' as const,
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'stripe_customer_id', type: 'text' },
          { name: 'plan', type: 'select', options: { values: ['free', 'pro', 'enterprise'] }, default: 'free' },
          { name: 'seats', type: 'number', default: 1 },
          { name: 'nim_credits_used', type: 'number', default: 0 },
        ],
        indexes: ['CREATE INDEX idx_org_name ON organizations (name)'],
      },

      // Users (linked to Clerk)
      {
        name: 'users',
        type: 'base' as const,
        fields: [
          { name: 'email', type: 'email', required: true },
          { name: 'role', type: 'select', options: { values: ['admin', 'recruiter', 'hiring_manager', 'candidate'] }, default: 'recruiter' },
          { name: 'org_id', type: 'relation', required: true, options: { collectionId: 'organizations', cascadeDelete: true } },
          { name: 'clerk_id', type: 'text', required: true, unique: true },
        ],
        indexes: [
          'CREATE INDEX idx_users_email ON users (email)',
          'CREATE INDEX idx_users_org ON users (org_id)',
          'CREATE INDEX idx_users_clerk ON users (clerk_id)',
        ],
      },

      // Jobs
      {
        name: 'jobs',
        type: 'base' as const,
        fields: [
          { name: 'org_id', type: 'relation', required: true, options: { collectionId: 'organizations', cascadeDelete: true } },
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text', required: true },
          { name: 'requirements', type: 'text', required: true },
          { name: 'location', type: 'text', default: 'Remote' },
          { name: 'salary_min', type: 'number' },
          { name: 'salary_max', type: 'number' },
          { name: 'status', type: 'select', options: { values: ['draft', 'active', 'closed', 'paused'] }, default: 'draft' },
          { name: 'embedding', type: 'json' },
          { name: 'adzuna_id', type: 'text' },
          { name: 'jsearch_id', type: 'text' },
          { name: 'posted_at', type: 'date' },
        ],
        indexes: [
          'CREATE INDEX idx_jobs_org ON jobs (org_id)',
          'CREATE INDEX idx_jobs_status ON jobs (status)',
        ],
      },

      // Candidates
      {
        name: 'candidates',
        type: 'base' as const,
        fields: [
          { name: 'org_id', type: 'relation', required: true, options: { collectionId: 'organizations', cascadeDelete: true } },
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'email', required: true },
          { name: 'phone', type: 'text' },
          { name: 'linkedin_url', type: 'text' },
          { name: 'github_url', type: 'text' },
          { name: 'resume', type: 'file', options: { maxSelect: 1, maxSize: 10485760 } },
          { name: 'resume_text', type: 'text' },
          { name: 'parsed_skills', type: 'json' },
          { name: 'parsed_experience', type: 'json' },
          { name: 'parsed_education', type: 'json' },
          { name: 'ai_summary', type: 'text' },
          { name: 'ai_match_score', type: 'number' },
          { name: 'embedding', type: 'json' },
        ],
        indexes: [
          'CREATE INDEX idx_candidates_org ON candidates (org_id)',
          'CREATE INDEX idx_candidates_email ON candidates (email)',
        ],
      },

      // Applications
      {
        name: 'applications',
        type: 'base' as const,
        fields: [
          { name: 'job_id', type: 'relation', required: true, options: { collectionId: 'jobs', cascadeDelete: true } },
          { name: 'candidate_id', type: 'relation', required: true, options: { collectionId: 'candidates', cascadeDelete: true } },
          { name: 'stage', type: 'select', options: { values: ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] }, default: 'new' },
          { name: 'ai_match_score', type: 'number' },
          { name: 'source', type: 'select', options: { values: ['direct', 'job_board', 'sourcing', 'referral'] }, default: 'direct' },
          { name: 'applied_at', type: 'date' },
          { name: 'last_activity_at', type: 'date' },
        ],
        indexes: [
          'CREATE INDEX idx_applications_job ON applications (job_id)',
          'CREATE INDEX idx_applications_candidate ON applications (candidate_id)',
          'CREATE INDEX idx_applications_stage ON applications (stage)',
        ],
      },

      // Interviews
      {
        name: 'interviews',
        type: 'base' as const,
        fields: [
          { name: 'application_id', type: 'relation', required: true, options: { collectionId: 'applications', cascadeDelete: true } },
          { name: 'scheduled_at', type: 'date', required: true },
          { name: 'calendar_event_id', type: 'text' },
          { name: 'video_link', type: 'text' },
          { name: 'interviewer_id', type: 'text', required: true },
          { name: 'feedback', type: 'text' },
          { name: 'rating', type: 'number' },
          { name: 'questions', type: 'json' },
          { name: 'answers', type: 'json' },
          { name: 'tech_dna', type: 'json' },
          { name: 'status', type: 'select', options: { values: ['scheduled', 'in_progress', 'completed', 'cancelled', 'redlisted'] }, default: 'scheduled' },
          { name: 'cheating_warnings', type: 'number', default: 0 },
          { name: 'confidence_score', type: 'number' },
          { name: 'body_language_score', type: 'number' },
          { name: 'communication_score', type: 'number' },
          { name: 'technical_score', type: 'number' },
          { name: 'overall_recommendation', type: 'select', options: { values: ['hire', 'consider', 'reject'] } },
          { name: 'public_token', type: 'text', unique: true },
        ],
        indexes: [
          'CREATE INDEX idx_interviews_application ON interviews (application_id)',
          'CREATE INDEX idx_interviews_status ON interviews (status)',
          'CREATE INDEX idx_interviews_token ON interviews (public_token)',
        ],
      },

      // Cheating Events
      {
        name: 'cheating_events',
        type: 'base' as const,
        fields: [
          { name: 'interview_id', type: 'relation', required: true, options: { collectionId: 'interviews', cascadeDelete: true } },
          { name: 'event_type', type: 'select', options: { values: ['tab_switch', 'face_missing', 'multiple_faces', 'phone_detected', 'no_speaking'] }, required: true },
          { name: 'timestamp', type: 'date', required: true },
          { name: 'screenshot', type: 'file', options: { maxSelect: 1, maxSize: 5242880 } },
          { name: 'warning_issued', type: 'bool', default: false },
        ],
        indexes: [
          'CREATE INDEX idx_cheating_events_interview ON cheating_events (interview_id)',
        ],
      },

      // NIM Logs
      {
        name: 'nim_logs',
        type: 'base' as const,
        fields: [
          { name: 'org_id', type: 'relation', required: true, options: { collectionId: 'organizations', cascadeDelete: true } },
          { name: 'model', type: 'text', required: true },
          { name: 'endpoint', type: 'text', required: true },
          { name: 'tokens_input', type: 'number', default: 0 },
          { name: 'tokens_output', type: 'number', default: 0 },
          { name: 'latency_ms', type: 'number', default: 0 },
          { name: 'cost_usd', type: 'number', default: 0 },
        ],
        indexes: [
          'CREATE INDEX idx_nim_logs_org ON nim_logs (org_id)',
          'CREATE INDEX idx_nim_logs_model ON nim_logs (model)',
        ],
      },

      // Activities
      {
        name: 'activities',
        type: 'base' as const,
        fields: [
          { name: 'org_id', type: 'relation', required: true, options: { collectionId: 'organizations', cascadeDelete: true } },
          { name: 'actor_id', type: 'text', required: true },
          { name: 'action', type: 'text', required: true },
          { name: 'entity_type', type: 'text', required: true },
          { name: 'entity_id', type: 'text', required: true },
          { name: 'metadata', type: 'json' },
        ],
        indexes: [
          'CREATE INDEX idx_activities_org ON activities (org_id)',
          'CREATE INDEX idx_activities_actor ON activities (actor_id)',
        ],
      },

      // Subscriptions
      {
        name: 'subscriptions',
        type: 'base' as const,
        fields: [
          { name: 'org_id', type: 'relation', required: true, options: { collectionId: 'organizations', cascadeDelete: true } },
          { name: 'stripe_subscription_id', type: 'text', unique: true },
          { name: 'status', type: 'text', required: true },
          { name: 'current_period_end', type: 'date' },
        ],
        indexes: [
          'CREATE INDEX idx_subscriptions_org ON subscriptions (org_id)',
          'CREATE INDEX idx_subscriptions_stripe ON subscriptions (stripe_subscription_id)',
        ],
      },
    ]

    for (const collection of collections) {
      try {
        // Check if collection already exists
        const existingCollections = await pb.collections.getList(1, 1, {
          filter: `name="${collection.name}"`,
        })

        if (existingCollections.items.length > 0) {
          console.log(`ℹ️  Collection "${collection.name}" already exists, skipping...`)
          continue
        }

        await pb.collections.create(collection)
        console.log(`✅ Created collection: ${collection.name}`)
      } catch (error: any) {
        console.error(`❌ Error creating collection ${collection.name}:`, error.message)
      }
    }

    console.log('\n✨ PocketBase setup completed successfully!')
    console.log(`\n📍 Admin UI: ${POCKETBASE_URL}/_/`)
    console.log(`📧 Admin Email: ${ADMIN_EMAIL}`)
    console.log(`🔑 Admin Password: ${ADMIN_PASSWORD}`)
    console.log('\n⚠️  Please keep your credentials secure!')

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

setupPocketBase()
