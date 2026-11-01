import type { Metadata } from "next";

import AuthShell from "../../_auth/AuthShell";

export const metadata: Metadata = {
  title: "Sign in | Recruit AI",
  description: "Sign in to your Recruit AI hiring workspace.",
};

export default function SignInPage() {
  return <AuthShell type="sign-in" />;
}
