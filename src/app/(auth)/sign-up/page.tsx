import type { Metadata } from "next";

import AuthShell from "../../_auth/AuthShell";

export const metadata: Metadata = {
  title: "Create an account | Recruit AI",
  description:
    "Create a free job seeker account or request an employer workspace.",
};

export default function SignUpPage() {
  return <AuthShell type="sign-up" />;
}
