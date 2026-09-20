import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | RecruitAI',
  description: 'Terms of Service governing the use of RecruitAI recruitment platform, AI screening assessments, candidate rights, and employer obligations under Indian law.',
};

export default function TermsOfServicePage() {
  return (
    <main className="legalLanding legalLandingTerms min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="legalBrand font-extrabold text-xl tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <img src="/recruit-ai-logo.png" alt="" />
            </span>
            Recruit <i>AI</i>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-teal-600 transition-colors">
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <section className="legalHero" aria-labelledby="terms-hero-title">
        <div className="legalHeroGlow" />
        <div className="legalHeroInner">
          <span className="legalHeroKicker">RECRUIT AI / THE AGREEMENT</span>
          <h1 id="terms-hero-title">A fair platform<br /><em>needs fair rules.</em></h1>
          <p>The simple rules for using Recruit AI responsibly—for hiring teams, candidates, and our technology.</p>
          <div className="legalHeroActions"><Link href="/contact">Contact Recruit AI <span>↗</span></Link></div>
        </div>
      </section>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            Terms of Service
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Last Updated: September 2026
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-4">
          Terms of Service & Platform Guidelines
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          Welcome to Recruit AI. By accessing or using our recruitment software, website, AI interview systems, or candidate screening services, you agree to be bound by these Terms of Service.
        </p>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Role of Recruit AI (Technology Platform)</h2>
            <p>
              Recruit AI provides an automated recruitment technology suite assisting employers with resume parsing, candidate discovery, and structured voice screening. Recruit AI is a software provider and does not guarantee employment to candidates nor assume liability for ultimate hiring decisions made by third-party employer organizations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Fair Hiring & Anti-Bias Mandate</h2>
            <p>
              All hiring organizations using Recruit AI agree to comply with applicable non-discrimination laws and the Digital Personal Data Protection Act, 2023. Recruit AI does not permit filtering or ranking candidates based on caste, religion, gender, sexual orientation, disability, or marital status. Any user found using custom prompts or instructions to discriminate against protected classes will face immediate workspace suspension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. AI-Assisted Interviews & Candidate Consent</h2>
            <p>
              Candidates participating in AI voice interviews receive transparent prior notice that their verbal responses will be processed by speech recognition and large language model inference engines to generate structured skill summaries for the employer. Candidates retain the right to request human review of any automated assessment scorecard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Employer Obligations as Data Fiduciary</h2>
            <p>
              Employers importing candidate resumes or sourcing candidate data via the platform warrant that they possess lawful grounds under the DPDP Act, 2023. Employers agree not to retain candidate personal data beyond the period necessary for fulfilling the hiring requirement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Intellectual Property & Acceptable Use</h2>
            <p>
              All proprietary AI models, prompt evaluations, scoring heuristics, and platform interfaces belong exclusively to Recruit AI Inc. Reverse engineering, malicious scraping, or injecting unauthorized prompt injections into AI evaluation models is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the substantive laws of the Republic of India. Any legal disputes arising out of the use of the platform shall be subject to the exclusive jurisdiction of the competent courts in Raipur, Chhattisgarh, India.
            </p>
          </section>
        </div>
      </article>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-500">
        <div className="flex justify-center gap-4 mb-2">
          <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white">Terms of Service</Link>
        </div>
        {/* TODO_LEGAL_ENTITY: confirm the registered legal entity name before adding a suffix. */}
        <p>© 2026 Recruit AI. All rights reserved under Indian Law.</p>
      </footer>
    </main>
  );
}

