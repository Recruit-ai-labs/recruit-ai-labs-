"use client";

/**
 * The DPDP consent notice.
 *
 * Two surfaces, one record:
 *   · a quiet card at the bottom of the page on a first visit, and
 *   · a preferences dialog with a switch per category.
 *
 * "Essential only" is offered with the same weight as "Accept all" — the
 * Act does not allow consent to be manufactured by making refusal hard.
 * Nothing optional is ever pre-selected.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./chrome.module.scss";
import {
  ESSENTIAL_ONLY,
  OPEN_EVENT,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from "./consent";

type Prefs = Omit<ConsentChoice, "timestamp">;

const CATEGORIES = [
  {
    key: "necessary" as const,
    name: "Strictly necessary",
    tag: "Always on",
    text: "Sign-in sessions, security tokens and your cookie choice itself. Without these the workspace cannot open.",
    locked: true,
  },
  {
    key: "analytics" as const,
    name: "Analytics",
    tag: "Optional",
    text: "Aggregated page and performance counts that tell us which parts of the product are slow or confusing. No advertising profiles.",
    locked: false,
  },
  {
    key: "personalisation" as const,
    name: "Preferences",
    tag: "Optional",
    text: "Remembers the last workspace you opened, your panel layout and your view settings.",
    locked: false,
  },
  {
    key: "marketing" as const,
    name: "Marketing",
    tag: "Optional",
    text: "Lets us measure whether an invite or campaign actually reached the right people. Off unless you switch it on.",
    locked: false,
  },
];

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(ESSENTIAL_ONLY);
  const [warning, setWarning] = useState("");

  const dialog = useRef<HTMLDialogElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  // ---- open on first visit, or when any footer control asks for it ----
  useEffect(() => {
    const stored = readConsent();
    if (!stored) setVisible(true);
    else
      setPrefs({
        version: 1,
        necessary: true,
        analytics: stored.analytics,
        personalisation: stored.personalisation,
        marketing: stored.marketing,
      });

    const open = () => {
      opener.current = document.activeElement as HTMLElement | null;
      setDialogOpen(true);
    };

    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  // ---- keep the native dialog in step with state ----
  useEffect(() => {
    if (!dialogOpen || !dialog.current) return;
    const element = dialog.current;
    if (!element.open) element.showModal();
    // Land on the dialog itself so a screen reader reads the heading, rather
    // than dropping focus straight onto the close button.
    element.focus();
    return () => {
      if (element.open) element.close();
    };
  }, [dialogOpen]);

  // ---- freeze the page behind the modal ----
  // A native <dialog> blocks clicks but not the scroll wheel, so the page
  // would still drift underneath. Padding makes up for the scrollbar that
  // disappears when overflow is hidden.
  useEffect(() => {
    if (!dialogOpen) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [dialogOpen]);

  const closeDialog = useCallback(() => {
    dialog.current?.close();
    setDialogOpen(false);
    // Return focus to whatever opened the panel.
    requestAnimationFrame(() => {
      if (opener.current?.isConnected) opener.current.focus();
    });
  }, []);

  const save = useCallback(
    (choice: Prefs) => {
      const ok = writeConsent(choice);
      setWarning(
        ok
          ? ""
          : "Your browser blocked local storage, so this choice applies to this visit only. You may be asked again.",
      );
      if (!ok) {
        // Nothing was persisted. Close the panel and let the banner carry the
        // explanation, rather than leave a dead "Save" button on screen.
        setPrefs(choice);
        setDialogOpen(false);
        setVisible(true);
        return;
      }
      setPrefs(choice);
      setVisible(false);
      setDialogOpen(false);
    },
    [],
  );

  const acceptAll = () =>
    save({
      version: 1,
      necessary: true,
      analytics: true,
      personalisation: true,
      marketing: true,
    });

  const essentialOnly = () => save({ ...ESSENTIAL_ONLY });

  return (
    <>
      {visible && !dialogOpen && (
        <aside
          className={styles.consent}
          role="region"
          aria-label="Cookie and privacy notice"
        >
          <p className={styles.consentEyebrow}>
            DPDP Act, 2023 / Consent notice
          </p>
          <h2 className={styles.consentTitle}>A little note on privacy.</h2>
          <p className={styles.consentText}>
            We use a few cookies and browser storage to keep your session
            secure and the workspace remembering where you left it. Anything
            optional stays off until you turn it on.
          </p>
          <div className={styles.consentLinks}>
            <Link href="/cookies" className={styles.consentTextLink}>
              Cookie notice
            </Link>
            <Link href="/privacy" className={styles.consentTextLink}>
              Privacy notice
            </Link>
            <Link href="/data-rights" className={styles.consentTextLink}>
              Your rights
            </Link>
          </div>
          <div className={styles.consentActions}>
            <button
              type="button"
              className={styles.consentPrimary}
              onClick={acceptAll}
            >
              Accept all
            </button>
            <button
              type="button"
              className={styles.consentSecondary}
              onClick={essentialOnly}
            >
              Essential only
            </button>
            <button
              type="button"
              className={styles.consentGhost}
              onClick={() => {
                opener.current = document.activeElement as HTMLElement | null;
                setDialogOpen(true);
              }}
            >
              Manage preferences
            </button>
          </div>
          {warning && (
            <p className={styles.consentText} role="status">
              {warning}
            </p>
          )}
        </aside>
      )}

      <dialog
        ref={dialog}
        className={styles.dialog}
        tabIndex={-1}
        aria-labelledby="consent-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={() => setDialogOpen(false)}
      >
        <div className={styles.dialogHead}>
          <div>
            <p className={styles.consentEyebrow}>Cookie preferences</p>
            <h2 id="consent-dialog-title" className={styles.dialogTitle}>
              Small files. Your call.
            </h2>
          </div>
          <button
            type="button"
            className={styles.dialogClose}
            aria-label="Close cookie preferences"
            onClick={closeDialog}
          >
            ×
          </button>
        </div>

        <div className={styles.dialogBody}>
          <p className={styles.dialogLead}>
            Four categories. Strictly necessary storage keeps the service
            running and cannot be switched off; the other three are yours to
            allow or refuse, and you can change your mind at any time.
          </p>

          {CATEGORIES.map((category) => {
            const checked = category.locked
              ? true
              : Boolean(prefs[category.key]);

            return (
              <div key={category.key} className={styles.prefRow}>
                <div>
                  <div className={styles.prefName}>
                    {category.name}
                    <span className={styles.prefTag}>{category.tag}</span>
                  </div>
                  <p className={styles.prefText}>{category.text}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={`${category.name} cookies`}
                  className={styles.switch}
                  disabled={category.locked}
                  onClick={() => {
                    if (category.key === "necessary") return;
                    const key = category.key;
                    setPrefs((current) => ({ ...current, [key]: !checked }));
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className={styles.dialogFoot}>
          <p className={styles.dialogNote}>
            Your choice is stored in this browser.{" "}
            <Link href="/cookies" className={styles.consentTextLink}>
              Read the cookie notice
            </Link>
          </p>
          <div className={styles.dialogFootActions}>
            <button
              type="button"
              className={styles.consentSecondary}
              onClick={essentialOnly}
            >
              Essential only
            </button>
            <button
              type="button"
              className={styles.consentPrimary}
              onClick={() => save({ ...prefs })}
            >
              Save choices
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
