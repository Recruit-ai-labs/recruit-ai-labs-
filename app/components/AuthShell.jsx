import Image from 'next/image';
import Link from 'next/link';

export default function AuthShell({ children, type }) {
  const isSignUp = type === 'sign-up';
  const isContact = type === 'contact';

  return (
    <main className={`authPage ${isContact ? 'authContact' : isSignUp ? 'authSignUp' : 'authSignIn'}`}>
      <div className="authGrid" aria-hidden="true" />
      <div className="authFlock" aria-hidden="true">
        {[
          { species: 'eagle', wing: 'M48 43 C37 35 26 20 9 12 L13 21 5 17 12 27 5 25 16 35 10 34 Q26 48 48 48Z', body: 'M13 47 L2 39 5 48 2 54 22 50 Q40 58 60 48 L70 42 82 43 77 39 Q80 35 75 33 Q68 30 63 37 L54 41 Q34 39 22 45Z' },
          { species: 'gull', wing: 'M48 43 Q32 21 4 8 Q18 30 30 37 L20 34 Q31 46 48 48Z', body: 'M21 45 L7 42 12 49 8 52 27 49 Q45 55 61 45 L70 40 81 39 74 36 Q68 31 63 37 L55 42 Q39 40 21 45Z' },
          { species: 'swallow', wing: 'M48 43 Q27 19 2 5 Q20 35 35 40 L28 40 Q39 48 48 48Z', body: 'M25 44 L1 34 14 47 1 60 28 49 Q45 54 61 44 L68 39 78 37 71 35 Q64 31 60 39 L52 43Z' },
        ].map(({ species, wing, body }) => <div key={species} className={`authFlyingBird authFlyingBird-${species}`}>
          <svg viewBox="0 0 86 86" focusable="false">
            <path className="authBirdWing authBirdWingFar" d={wing} />
            <path className="authBirdBody" d={body} />
            <path className="authBirdWing authBirdWingNear" d={wing} />
          </svg>
        </div>)}
      </div>
      <header className="authNav">
        {isSignUp && <Link href="/" className="authLogo" aria-label="Recruit AI home">
          <Image src="/recruit-ai-logo.png" width={30} height={30} alt="" />
          Recruit <i>AI</i>
        </Link>}
        <Link href="/" className="backHome">&larr; Back to website</Link>
      </header>
      <section className="authContent">
        <aside className="authStory">
          <Link href="/" className="authSceneBrand"><Image src="/recruit-ai-logo.png" width={36} height={36} alt="" /><span>Recruit <b>AI</b></span></Link>
          <span className="authKicker"><b /> {isContact ? 'RECRUIT AI WORKSPACE' : 'ADMIN-APPROVED ACCESS ONLY'}</span>
          <h1>Hire with <em>clarity,</em><br />not guesswork.</h1>
          <p>One accountable workspace for every role, candidate, application and hiring decision.</p>
          <div className="authEvidence">
            <span aria-hidden="true">&#10003;</span>
            <div><b>Evidence before every decision</b><small>Skills, signals and context stay reviewable.</small></div>
          </div>
        </aside>
        <div className="authCard">
          {isSignUp && <div className="authMobileLogo"><Image src="/recruit-ai-logo.png" width={31} height={31} alt="Recruit AI" /></div>}
          <p className="authOverline">{isContact ? 'REQUEST ACCESS' : isSignUp ? 'START YOUR WORKSPACE' : 'WELCOME BACK'}</p>
          <h2>{isContact ? 'Tell us about your hiring.' : isSignUp ? 'Create your hiring workspace.' : 'Sign in to Recruit AI.'}</h2>
          <p className="authSub">{isContact ? 'Share a few details and we’ll get back to you with the right next step.' : isSignUp ? 'Set up your team and build your first hiring workflow.' : 'Continue where your hiring team left off.'}</p>
          {type === 'sign-in' ? children : <div className="authForm">{children}</div>}
          <p className="authSwitch">{isContact ? <>Already have an invitation? <Link href="/sign-in">Sign in</Link></> : <>{isSignUp ? 'Already have an account?' : 'New to Recruit AI?'} <Link href={isSignUp ? '/sign-in' : '/contact'}>{isSignUp ? 'Sign in' : 'Request access'} &rarr;</Link></>}</p>
          <p className="authTrust">Private workspace &middot; Human-led decisions</p>
        </div>
      </section>
    </main>
  );
}
