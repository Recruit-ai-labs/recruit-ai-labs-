import AuthShell from '../../components/AuthShell';
import SignInPanel from '../../components/SignInPanel';

export const metadata = { title: 'Sign in | Recruit AI', description: 'Sign in to your Recruit AI hiring workspace.' };

export default function SignInPage() {
  return <AuthShell type="sign-in"><SignInPanel /></AuthShell>;
}
