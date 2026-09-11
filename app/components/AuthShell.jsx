import Image from 'next/image';
import Link from 'next/link';

export default function AuthShell({ children, type }) {
  const isSignUp = type === 'sign-up';

  return (
    <main className={`authPage ${isSignUp ? 'authSignUp' : 'authSignIn'}`}>
      <div className="authGrid" aria-hidden="true" />
      <header className="authNav">
        {isSignUp && <Link href="/" className="authLogo" aria-label="Recruit AI home">
          <Image src="/recruit-ai-logo.png" width={30} height={30} alt="" />
          Recruit <i>AI</i>
        </Link>}
        <Link href="/" className="backHome">&larr; Back to website</Link>
      </header>
      <section className="authContent">
        <aside className="authStory">
          <span className="authKicker"><b /> RECRUIT AI WORKSPACE</span>
          <h1>Hire with <em>clarity,</em><br />not guesswork.</h1>
          <p>One accountable workspace for every role, candidate, interview and hiring decision.</p>
          <div className="authEvidence">
            <span aria-hidden="true">&#10003;</span>
            <div><b>Evidence before every decision</b><small>Skills, signals and context stay reviewable.</small></div>
          </div>
        </aside>
        <div className="authCard">
          {isSignUp && <div className="authMobileLogo"><Image src="/recruit-ai-logo.png" width={31} height={31} alt="Recruit AI" /></div>}
          <p className="authOverline">{isSignUp ? 'START YOUR WORKSPACE' : 'WELCOME BACK'}</p>
          <h2>{isSignUp ? 'Create your hiring workspace.' : 'Sign in to Recruit AI.'}</h2>
          <p className="authSub">{isSignUp ? 'Set up your team and build your first hiring workflow.' : 'Continue where your hiring team left off.'}</p>
          <div className="authForm">{children}</div>
          <p className="authSwitch">
            {isSignUp ? 'Already have an account?' : 'New to Recruit AI?'}{' '}
            <Link href={isSignUp ? '/sign-in' : '/sign-up'}>{isSignUp ? 'Sign in' : 'Create an account'} &rarr;</Link>
          </p>
          <p className="authTrust">Private workspace &middot; Human-led decisions</p>
        </div>
      </section>
    </main>
  );
}
