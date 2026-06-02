# RecruitAI - AI-Powered Recruitment Platform

A modern, full-stack SaaS recruitment platform powered by **NVIDIA NIM APIs** for intelligent resume parsing, semantic candidate matching, automated job description generation, and AI-driven interviews. Built with Next.js, TypeScript, and PocketBase.

## 🚀 Features

### AI-Powered (NVIDIA NIM)
- **Resume Parsing** - Extract structured data from PDF/DOCX using LLM
- **Semantic Search** - 1024-dim vector embeddings with cosine similarity search
- **Job Description Generator** - AI-generated compelling JDs
- **Candidate Matching** - NIM-powered ranking with justifications
- **Interview AI** - Auto-generate questions and analyze answers

### Core Platform
- **Multi-tenant Architecture** - Organization-based data isolation
- **Role-based Access** - Admin, Recruiter, Hiring Manager, Candidate
- **Real-time Pipeline** - Kanban view with drag-and-drop stages
- **Email & SMS** - SendGrid + Twilio integration
- **Calendar Integration** - Google Calendar for interview scheduling
- **Job Board Aggregation** - Adzuna + JSearch live listings
- **Stripe Billing** - Subscription management with usage-based pricing
- **Analytics Dashboard** - NIM usage tracking and pipeline metrics

## 📋 Tech Stack

- **Frontend**: Next.js 16+, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Database**: PocketBase (SQLite-based, self-hosted)
- **Auth**: Clerk with RBAC
- **AI**: NVIDIA NIM APIs exclusively (no OpenAI/Anthropic)
- **Storage**: PocketBase built-in file storage
- **Background Jobs**: Inngest
- **Payments**: Stripe
- **Email**: SendGrid
- **SMS/Voice**: Twilio
- **Analytics**: PostHog

## 🛠️ Setup

### Prerequisites
- Node.js 20+
- PocketBase (self-hosted, included in repo)
- NVIDIA NIM API key
- Clerk account
- Stripe account (for billing)

### 1. Clone & Install

```bash
cd recruit
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in your credentials:

```env
# NVIDIA NIM (Required - ALL AI uses NIM)
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_API_KEY=your_key_here
NIM_LLM_MODEL=meta/llama-3.1-70b-instruct
NIM_EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5

# Auth
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Database - PocketBase
POCKETBASE_URL=http://127.0.0.1:8090
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=your@email.com
POCKETBASE_ADMIN_PASSWORD=your_password

# Optional Integrations
STRIPE_SECRET_KEY=
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
GOOGLE_CLIENT_ID=
ADZUNA_APP_ID=
JSEARCH_API_KEY=
PROXYCURL_API_KEY=
```

### 3. PocketBase Setup

PocketBase is included in the `pocketbase/` directory. Start it and create collections:

```bash
# Start PocketBase (Windows)
.\pocketbase\pocketbase.exe serve --http=127.0.0.1:8090

# Start PocketBase (macOS/Linux)
./pocketbase/pocketbase serve --http=127.0.0.1:8090
```

Then run the setup script to create all collections:

```bash
npx tsx scripts/setup-pocketbase.ts
```

This creates:
- 10 collections: organizations, users, jobs, candidates, applications, interviews, cheating_events, nim_logs, activities, subscriptions
- Proper indexes for fast queries
- Relation fields for data integrity
- File storage support for resumes

Access the admin UI at: http://127.0.0.1:8090/_/

### 4. Clerk Setup

1. Create a Clerk application at https://clerk.com
2. Add these redirect URLs:
   - Sign In: `/sign-in`
   - Sign Up: `/sign-up`
3. Configure organization support
4. Add webhook endpoint: `https://your-domain.com/api/webhooks/clerk`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/          # Sign-in, Sign-up pages
│   ├── (dashboard)/     # Protected dashboard pages
│   │   ├── page.tsx     # Dashboard home
│   │   ├── jobs/        # Jobs module
│   │   ├── candidates/  # Candidates module
│   │   ├── interviews/  # Interviews module
│   │   ├── analytics/   # Analytics & NIM usage
│   │   └── settings/    # Organization settings
│   ├── api/
│   │   ├── nim/         # NIM AI proxy routes
│   │   ├── jobs/        # Jobs CRUD
│   │   ├── candidates/  # Candidates CRUD
│   │   ├── webhooks/    # Stripe, Clerk webhooks
│   │   └── inngest/     # Background jobs
│   ├── jobs/            # Public job board
│   └── page.tsx         # Landing page
├── lib/
│   ├── pocketbase-server.ts  # PocketBase server client
│   ├── pocketbase-browser.ts # PocketBase browser client
│   ├── nim.ts                # NVIDIA NIM client
│   ├── resume-parser.ts      # Resume extraction + NIM parsing
│   ├── semantic-search.ts    # Vector search with embeddings
│   ├── jd-generator.ts       # AI job description generation
│   ├── interview-ai.ts       # Interview question generation
│   ├── stripe.ts             # Stripe integration
│   ├── sendgrid.ts           # Email service
│   ├── twilio.ts             # SMS/Voice service
│   ├── calendar.ts           # Google Calendar
│   ├── job-boards.ts         # Adzuna + JSearch
│   ├── sourcing.ts           # Proxycurl + GitHub
│   ├── analytics.ts          # PostHog + NIM usage
│   └── inngest.ts            # Background job functions
├── config/
│   ├── site.ts          # App configuration
│   ├── nim-models.ts    # NIM model definitions
│   └── plans.ts         # Subscription plans
└── types/
    └── database.ts      # TypeScript types + Zod schemas

pocketbase/
├── pocketbase.exe       # PocketBase binary (Windows)
└── schema.ts            # Collection schema definitions

scripts/
└── setup-pocketbase.ts  # Automated collection setup
```

## 🎯 Key AI Workflows

### Resume Parsing Pipeline
1. User uploads PDF/DOCX
2. Extract text via `pdf-parse` or `mammoth`
3. Send to NIM LLM (`meta/llama-3.1-70b-instruct`) with structured prompt
4. Parse JSON response with Zod validation
5. Generate embedding via NIM (`nvidia/nv-embedqa-e5-v5`)
6. Store in PocketBase with vector data
7. Calculate AI match score against job requirements

### Semantic Candidate Matching
1. Input: Job requirements or natural language query
2. Generate embedding via NIM
3. Query candidates with vector similarity search
4. Retrieve top candidates by cosine similarity
5. Send to NIM LLM for ranked scoring with justification
6. Display ranked results with AI explanations

### Job Description Generation
1. Input: Role title, seniority, skills, location
2. NIM LLM generates compelling, SEO-optimized JD
3. Include: About the Role, Responsibilities, Requirements, Benefits
4. Auto-generate embedding for semantic job search
5. Store in database and syndicate to job boards

## 💰 Pricing Plans

| Feature | Free | Pro ($99/mo) | Enterprise ($499/mo) |
|---------|------|--------------|---------------------|
| Job Postings | 5 | Unlimited | Unlimited |
| NIM Credits | 100/mo | 5,000/mo | 50,000/mo |
| AI Parsing | Basic | Advanced | Advanced |
| Semantic Search | ❌ | ✅ | ✅ |
| Team Members | 1 | 10 | Unlimited |
| Self-hosted NIM | ❌ | ❌ | ✅ |

## 🔒 Security

- **Organization-based Access** - All queries scoped to organization
- **Clerk Auth** - Secure authentication with RBAC
- **NIM API Logging** - Every AI call tracked for audit
- **Input Validation** - Zod schemas on all endpoints
- **Rate Limiting** - Exponential backoff on NIM 429 errors
- **API Rules** - PocketBase collection-level access control

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel deploy
```

### Environment Variables on Vercel
Add all variables from `.env.local.example` in Vercel dashboard.

### PocketBase
- PocketBase binary included in `pocketbase/` directory
- Run locally or deploy to any VPS
- Automatic backups built-in
- Admin UI at `/_/` endpoint

### Stripe Webhooks
Configure webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
Events: `checkout.session.completed`, `customer.subscription.*`

## 📊 NIM Usage Tracking

All NIM API calls are logged to `nim_logs` table:
- Model used
- Endpoint called
- Input/output tokens
- Latency (ms)
- Cost (USD)

View usage in `/dashboard/analytics` under "NIM Usage" tab.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- Documentation: [Link to docs]
- Issues: [GitHub Issues]
- Email: support@recruitai.com

---

**Powered by NVIDIA NIM** - No OpenAI, no Anthropic, pure GPU-accelerated AI inference.
