/**
 * Consent state for the DPDP notice.
 *
 * DPDP asks for consent that is free, specific, informed, unconditional
 * and given by a clear affirmative action — so nothing optional is ever
 * pre-selected here. The record keeps the four categories separately, and
 * the timestamp and version stay with it so a change in the notice can
 * invalidate an older choice.
 */

export const CONSENT_KEY = "recruit-ai.consent.v1";

// Fired by the banner after a choice is saved (other scripts may listen).
export const CONSENT_EVENT = "recruit-ai:consent";

// Fired by any "Cookie preferences" control on the site.
export const OPEN_EVENT = "recruit-ai:open-consent";

export type ConsentChoice = {
  version: 1;
  timestamp: number;
  necessary: true;
  analytics: boolean;
  personalisation: boolean;
  marketing: boolean;
};

/** Every optional category off — the state consent starts from. */
export const ESSENTIAL_ONLY: Omit<ConsentChoice, "timestamp"> = {
  version: 1,
  necessary: true,
  analytics: false,
  personalisation: false,
  marketing: false,
};

/** Read the stored record, or null when nothing valid is stored. */
export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    if (parsed?.version !== 1) return null;
    return {
      version: 1,
      timestamp: Number(parsed.timestamp) || Date.now(),
      necessary: true,
      analytics: Boolean(parsed.analytics),
      personalisation: Boolean(parsed.personalisation),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

/** Persist a choice. Returns false when the browser refuses storage. */
export function writeConsent(choice: Omit<ConsentChoice, "timestamp">) {
  try {
    const record: ConsentChoice = { ...choice, timestamp: Date.now() };
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    window.dispatchEvent(
      new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: record }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Ask the banner to open its preferences panel. */
export function openConsentPreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
