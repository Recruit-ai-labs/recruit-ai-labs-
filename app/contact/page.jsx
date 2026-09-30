import AuthShell from '../components/AuthShell';

export const metadata = { title: 'Request access | Recruit AI' };

export default function ContactPage() {
  return <AuthShell type="contact">
    <form className="accessRequestForm">
      <label>Work email<input name="email" type="email" placeholder="you@company.com" autoComplete="email" required /></label>
      <label>Your name<input name="name" type="text" placeholder="Full name" autoComplete="name" required /></label>
      <label>Company<input name="company" type="text" placeholder="Company name" autoComplete="organization" required /></label>
      <label>What are you hiring for?<textarea name="message" rows="3" placeholder="Tell us about the roles or team you’re building." required /></label>
      <button type="submit" className="accessRequestButton">Send request <span>→</span></button>
    </form>
  </AuthShell>;
}
