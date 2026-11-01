import ClerkGate from "../_auth/ClerkGate";

// Only /sign-in and /sign-up live in this group, so clerk-js reaches nobody
// else. The provider and the key-mismatch notice both live in ClerkGate — the
// (account) group mounts the same gate for its signed-in pages.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClerkGate>{children}</ClerkGate>;
}
