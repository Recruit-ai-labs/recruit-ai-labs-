import { SignIn } from '@clerk/nextjs';
import AuthShell from '../../components/AuthShell';

const appearance = {
  elements: {
    rootBox: 'clerkRoot', cardBox: 'clerkCardBox', card: 'clerkCard', main: 'clerkMain', header: 'clerkHide', footer: 'clerkHide',
    socialButtons: 'clerkSocialGroup', form: 'clerkForm', formFieldRow: 'clerkFieldRow',
    socialButtonsBlockButton: 'clerkSocial', formButtonPrimary: 'clerkPrimary',
    formFieldInput: 'clerkInput', formFieldLabel: 'clerkLabel', formFieldErrorText: 'clerkError',
    dividerLine: 'clerkDivider', dividerText: 'clerkDividerText', identityPreviewEditButton: 'clerkLink',
    formResendCodeLink: 'clerkLink', alert: 'clerkAlert',
  },
};

export default function SignInPage() {
  return <AuthShell type="sign-in"><SignIn fallbackRedirectUrl="/dashboard" appearance={appearance} /></AuthShell>;
}
