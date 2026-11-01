"use client";

import Link from "next/link";
import { SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/nextjs";

import PendingLink, { ButtonSpinner } from "../_site/PendingLink";
import styles from "./auth.module.scss";

type AuthType = "sign-in" | "sign-up";

type Appearance = NonNullable<
  React.ComponentProps<typeof SignIn>["appearance"]
>;

// The skin. Clerk's own component does the work — provider hand-off, the
// six-digit code, resend, the retry states — and these overrides bring it onto
// this page's paper: ink on white, a two-pixel radius, mono for anything that
// behaves like a label.
//
// The provider row is deliberately not written here. Clerk renders whatever
// the instance has enabled, so removing Facebook and Apple and adding GitHub
// and LinkedIn happened in the dashboard, not in this file — which is also why
// this file cannot fall out of step with it.
const APPEARANCE: Appearance = {
  options: {
    logoPlacement: "none",
    // Three enabled providers would otherwise collapse into three small icon
    // squares; the panel has always shown labelled buttons.
    socialButtonsVariant: "blockButton",
    socialButtonsPlacement: "top",
  },
  variables: {
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-jetbrains), ui-monospace, monospace",
    fontFamilyMono: "var(--font-jetbrains), ui-monospace, monospace",
    fontSize: "13.5px",
    fontWeight: { normal: 400, medium: 500, semibold: 500, bold: 600 },
    // The page's ink, not #000: the rest of the site is printed in this tone.
    colorPrimary: "#171714",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#171714",
    colorMutedForeground: "#6f7078",
    colorBackground: "transparent",
    colorInput: "#ffffff",
    colorInputForeground: "#171714",
    colorBorder: "#dedfe3",
    borderRadius: "2px",
    spacing: "15px",
  },
  elements: {
    rootBox: { width: "100%" },
    // the card is the page itself — no second sheet inside the panel
    card: {
      width: "100%",
      padding: 0,
      gap: "0",
      background: "transparent",
      boxShadow: "none",
      border: "none",
    },
    cardBox: { width: "100%", boxShadow: "none", border: "none" },
    // the page already says "Find your next beginning." above this
    header: { display: "none" },
    headerTitle: { display: "none" },
    headerSubtitle: { display: "none" },

    socialButtons: { gap: "9px", width: "100%" },
    socialButtonsBlockButton: {
      minHeight: "50px",
      padding: "0 12px",
      border: "1px solid #dedfe3",
      borderRadius: "2px",
      background: "#ffffff",
      boxShadow: "none",
      transition: "border-color .25s ease, background-color .25s ease",
    },
    socialButtonsBlockButtonText: {
      fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
      fontSize: "9px",
      fontWeight: "500",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#171714",
    },

    dividerRow: { margin: "20px 0 0" },
    dividerLine: { background: "#ececea" },
    dividerText: {
      fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
      fontSize: "8px",
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: "#8d8e94",
    },

    formFieldLabel: {
      fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
      fontSize: "8px",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#6f7078",
      marginBottom: "7px",
    },
    formFieldInput: {
      minHeight: "56px",
      padding: "0 16px",
      border: "1px solid #dedfe3",
      borderRadius: "2px",
      background: "#ffffff",
      fontSize: "15px",
      color: "#171714",
      boxShadow: "none",
    },
    formFieldHintText: { fontSize: "12px", color: "#8d8e94" },
    formFieldErrorText: { fontSize: "12px" },
    formButtonPrimary: {
      minHeight: "56px",
      borderRadius: "2px",
      background: "#171714",
      boxShadow: "none",
      fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
      fontSize: "9px",
      fontWeight: "500",
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      color: "#ffffff",
    },
    formButtonReset: {
      fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
      fontSize: "8px",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#6f7078",
    },

    otpCodeFieldInput: {
      minHeight: "58px",
      border: "1px solid #dedfe3",
      borderRadius: "2px",
      fontSize: "18px",
    },
    formResendCodeLink: { color: "#171714" },
    identityPreview: {
      border: "1px solid #dedfe3",
      borderRadius: "2px",
      background: "#ffffff",
    },
    alert: { borderRadius: "2px", fontSize: "12.5px" },

    // the switch line lives under the panel in the page, not in here
    footer: { display: "none" },
    footerAction: { display: "none" },
    footerActionText: { display: "none" },
  },
};

/**
 * The two ways in: a provider, or an email that becomes a code.
 *
 * `routing="hash"` keeps every step — code entry, resend, the provider
 * hand-off, the retry after a wrong digit — on this one URL. The auth screen
 * is a single panel of a marketing page, not a section with a router of its
 * own, and a half-finished sign-in should never end on a 404 because a step
 * path was not mounted.
 */
export default function AccessPanel({ type = "sign-in" }: { type?: AuthType }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  // Why this branch exists: with a session already on the browser, Clerk's
  // widget mounts, sees `isSignedIn`, and sends the visitor to
  // `fallbackRedirectUrl` a moment later. Nothing was drawn in between, so the
  // page read as broken: arrive, empty panel, thrown back out. The state is
  // explicit now: who is signed in, and the two ways on.
  //
  // "Continue" opens /choose-account rather than the landing page: that page
  // reads the role stored on the account and forwards a job seeker who already
  // finished onboarding to their home.
  if (isLoaded && isSignedIn) {
    const email = user?.primaryEmailAddress?.emailAddress;

    return (
      <div className={styles.session}>
        <span className={styles.sessionLabel}>Session active</span>
        <p className={styles.sessionText}>
          {email ? (
            <>
              You are already signed in as <strong>{email}</strong>.
            </>
          ) : (
            <>You are already signed in on this browser.</>
          )}
        </p>
        <div className={styles.sessionActions}>
          {/* The one exit from this panel that loads a route, so it is the one
              that answers the click: /choose-account asks Clerk who is signed
              in, which is a round-trip and not a local jump. The label stays
              and the pulse joins it, because this button has no arrow to give
              up its slot to. */}
          <PendingLink
            href="/choose-account"
            className={styles.sessionPrimary}
            pending={<ButtonSpinner />}
          >
            Continue
          </PendingLink>
          <button
            type="button"
            className={styles.sessionGhost}
            onClick={() =>
              // Straight back to the form, not the marketing page — the whole
              // point of signing out from here is to use another account.
              signOut({ redirectUrl: creatingHref(type) })
            }
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {type === "sign-up" ? (
        <SignUp
          routing="hash"
          appearance={APPEARANCE}
          signInUrl="/sign-in"
          fallbackRedirectUrl="/choose-account"
        />
      ) : (
        <SignIn
          routing="hash"
          appearance={APPEARANCE}
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/choose-account"
        />
      )}
    </div>
  );
}

// Where a sign-out from this panel should land: the same panel, emptied of
// the session, so the form is immediately usable by the next person.
function creatingHref(type: AuthType) {
  return type === "sign-up" ? "/sign-up" : "/sign-in";
}
