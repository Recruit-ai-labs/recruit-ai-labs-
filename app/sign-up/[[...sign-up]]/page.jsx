import { SignUp } from '@clerk/nextjs';
import AuthShell from '../../components/AuthShell';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Create an account | Recruit AI', description: 'Create your Recruit AI hiring workspace.' };

const appearance = {
  elements: {
    rootBox: 'clerkRoot', cardBox: 'clerkCardBox', card: 'clerkCard', main: 'clerkMain', header: 'clerkHide', footer: 'clerkHide',
    socialButtons: 'clerkSocialGroup', form: 'clerkForm', formFieldRow: 'clerkFieldRow',
    socialButtonsBlockButton: 'clerkSocial', formButtonPrimary: 'clerkPrimary',
    formFieldInput: 'clerkInput', formFieldLabel: 'clerkLabel', formFieldErrorText: 'clerkError',
    dividerLine: 'clerkDivider', dividerText: 'clerkDividerText', formResendCodeLink: 'clerkLink',
    alert: 'clerkAlert',
  },
};

export default function SignUpPage() {
  redirect('/sign-in');
}
