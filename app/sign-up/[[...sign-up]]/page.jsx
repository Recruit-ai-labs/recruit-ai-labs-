import { SignUp } from '@clerk/nextjs';
import AuthShell from '../../components/AuthShell';

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
  return <AuthShell type="sign-up"><SignUp fallbackRedirectUrl="/dashboard" appearance={appearance} /></AuthShell>;
}
