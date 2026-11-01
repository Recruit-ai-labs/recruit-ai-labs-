import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";

// The DPDP consent notice is mounted once, here, so it can appear on any
// route — landing page, auth screen or a policy — without being repeated.
import CookieConsent from "./_site/CookieConsent";

// The navigation rule: a 2px bar and a corner ring that appear the moment a
// link leaves the current page, on every route, however that navigation was
// started. One client component, mounted once, for the whole site.
import NavProgress from "./_site/NavProgress";

// Two style layers:
//   globals.css  → Tailwind v4 entry + the @theme design tokens
//   globals.scss  → hand-written Sass (keyframes, mixins, responsive tuning)
import "./globals.css";
import "./globals.scss";

// Display serif — the editorial voice. Loaded as a variable font so both
// roman and italic are available for the "human." line and the section numerals.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  style: ["normal", "italic"],
});

// Body sans — everything structural. Variable weight, no extra requests.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Mono — eyebrows, indexes, counters. Only two weights are ever used.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
  weight: ["400", "500"],
});

// Page-level metadata (title, description, social card copy).
export const metadata: Metadata = {
  title: "Recruit AI — Hire the right human. Faster.",
  description:
    "Recruit AI reads the person behind the résumé. Sourcing, screening and ranking built on judgement instead of keywords — a shortlist worth calling, in minutes.",
  openGraph: {
    title: "Recruit AI — Hire the right human. Faster.",
    description:
      "Talent intelligence for teams who refuse to hire keywords.",
    type: "website",
  },
  // Installable as an app on a phone: a standalone window, no browser
  // address bar. The manifest lives at `src/app/manifest.ts`, which Next
  // serves at /manifest.webmanifest and links automatically.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Recruit AI",
  },
};

// Browser chrome colour on mobile — matches the ink curtain.
//
// `viewportFit: cover` is what lets the workspace fill a notched screen and
// then read `env(safe-area-inset-*)` to keep its top bar and bottom tab bar
// clear of the notch and the home indicator. Without it those insets are
// always zero.
export const viewport: Viewport = {
  themeColor: "#050507",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Font variables are attached to <html> so Tailwind's font-display /
// font-sans / font-mono utilities can resolve them from anywhere.
//
// Clerk is NOT mounted here. Only /sign-in and /sign-up use it, so the provider
// lives in the (auth) route group — see src/app/(auth)/layout.tsx. Keeping it
// off the marketing pages means clerk-js is never downloaded to read this page,
// and a Clerk origin error can no longer touch a route that never needs it.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased">
        {children}
        <NavProgress />
        <CookieConsent />
      </body>
    </html>
  );
}
