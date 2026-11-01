import ClerkGate from "../_auth/ClerkGate";

// The signed-in side of the product: /choose-account, /onboarding and the job
// seeker workspace. Same gate as the auth screens — same provider, same
// key-mismatch notice — because every page here asks Clerk who is signed in.
export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClerkGate>{children}</ClerkGate>;
}
