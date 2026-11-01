import type { Metadata } from "next";

import ConsentPanel from "../_site/ConsentPanel";
import LegalPage, {
  DocCallout,
  NOTE,
  P,
  TABLE,
  UL,
  type LegalSection,
} from "../_site/LegalDoc";

export const metadata: Metadata = {
  title: "Cookie notice — Recruit AI",
  description:
    "Every cookie and storage key Recruit AI sets, why it exists, how long it lasts, and how to change your choice. Essential storage only, unless you opt in.",
};

const SECTIONS: LegalSection[] = [
  {
    no: "01",
    id: "what-a-cookie-is",
    title: "What a cookie is — and what we actually store",
    blocks: [
      P(
        "A cookie is a small file a site asks your browser to keep. It is how a site remembers that the person on the next page is still the same person who signed in on the last one. Browser storage — local storage and session storage — does the same job without travelling on every request.",
      ),
      P(
        "Recruit AI uses both, sparingly. There is no advertising network on this site, no cross-site tracking pixel, and no fingerprinting. If a category is optional, it is off until you switch it on.",
      ),
    ],
  },
  {
    no: "02",
    id: "categories",
    title: "The four categories",
    blocks: [
      TABLE(
        ["Category", "What it does", "Default"],
        [
          [
            "Strictly necessary",
            "Keeps you signed in, protects forms against forgery, and remembers this very choice.",
            "Always on",
          ],
          [
            "Preferences",
            "Remembers the last workspace you opened and your display settings.",
            "Off until allowed",
          ],
          [
            "Analytics",
            "Aggregated page counts and performance timings, so we know which screens are slow.",
            "Off until allowed",
          ],
          [
            "Marketing",
            "Tells us whether an invite or campaign actually led to a sign-up.",
            "Off until allowed",
          ],
        ],
      ),
      NOTE(
        "The DPDP Act requires consent by a clear affirmative action. Nothing optional is pre-ticked, and refusing everything optional is as quick as accepting it.",
      ),
    ],
  },
  {
    no: "03",
    id: "the-list",
    title: "Every key we set",
    blocks: [
      P(
        "This is the complete list at the date on this page. Adding a new key means updating this table before it goes live.",
      ),
      TABLE(
        ["Name", "Type", "Purpose", "Lasts"],
        [
          [
            "recruit-ai.consent.v1",
            "Local storage · necessary",
            "Records your cookie choice and its version",
            "12 months",
          ],
          [
            "recruit-ai.session",
            "Cookie · necessary",
            "Keeps you signed in between pages",
            "Session",
          ],
          [
            "recruit-ai.csrf",
            "Cookie · necessary",
            "Stops another site from submitting a form as you",
            "Session",
          ],
          [
            "recruit-ai.workspace",
            "Local storage · preferences",
            "Reopens the workspace you used last",
            "6 months",
          ],
          [
            "recruit-ai.display",
            "Local storage · preferences",
            "Remembers panel layout and motion preference",
            "12 months",
          ],
          [
            "_ra_analytics",
            "Cookie · analytics",
            "Aggregated page views and timing; no cross-site profile",
            "12 months",
          ],
          [
            "_ra_campaign",
            "Cookie · marketing",
            "Links an invite or campaign to a sign-up",
            "90 days",
          ],
        ],
      ),
      P(
        "Only the first three are set before you make a choice. The rest appear after you allow their category, and disappear within their lifetime once you withdraw it.",
      ),
    ],
  },
  {
    no: "04",
    id: "consent",
    title: "How consent is asked for, and changed",
    blocks: [
      P(
        "On your first visit a small card appears with three equally easy routes: accept all, allow essential storage only, or open the preferences panel and choose category by category.",
      ),
      UL([
        "The choice is stored in this browser only — not on your account, and not across devices.",
        "It stays valid for twelve months, after which we ask again so the notice you agreed to is still the current one.",
        "A material change to this notice resets the record, and you will be asked once more.",
        "You can reopen the panel at any time from the footer of any page, or from the button below.",
      ]),
    ],
  },
  {
    no: "05",
    id: "browser-controls",
    title: "Browser-level controls",
    blocks: [
      P(
        "Every major browser lets you view, block and delete cookies, and most offer a private window that clears them when you close it. Blocking strictly necessary storage will usually stop you signing in or keep breaking your session mid-workspace — the other categories can be blocked freely.",
      ),
      P(
        "Clearing site data also clears your recorded choice, so the consent card will appear again on your next visit. That is expected behaviour, not an error.",
      ),
    ],
  },
  {
    no: "06",
    id: "third-parties",
    title: "Third parties, embeds and fonts",
    blocks: [
      P(
        "The site is designed to keep requests on our own domain. Fonts are self-hosted at build time rather than fetched from a font network, and the background film is served from our own storage.",
      ),
      UL([
        "**No advertising cookies**, no retargeting pixels and no social plug-ins that load before you interact with them.",
        "**No session recording** of the workspace or of an interview room.",
        "Where a provider must see a request — email delivery, for instance — it receives only what that job needs, under written terms that forbid using it for anything else.",
      ]),
    ],
  },
  {
    no: "07",
    id: "signals",
    title: "Do Not Track and Global Privacy Control",
    blocks: [
      P(
        "If your browser sends a Global Privacy Control or Do Not Track signal, we treat it as a refusal of the optional categories: analytics, preference and marketing storage stay off until you explicitly turn them on here.",
      ),
      P(
        "We do not use the signal to change essential storage, because signing in cannot work without it.",
      ),
    ],
  },
  {
    no: "08",
    id: "changes",
    title: "Changes and contact",
    blocks: [
      P(
        "We review this notice whenever a key is added, removed or re-purposed, and publish the new version and date at the top. The preferences panel always reflects the current list.",
      ),
      P(
        "Questions about a specific cookie, or about anything else we hold, go to hello@recruitailabs.in. The Data Rights Desk has the formal route for access, correction and erasure requests.",
      ),
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      active="cookies"
      kicker="Recruit AI / Cookie notice"
      title="Small files,"
      accent="clear choices."
      lead="What we store in your browser, why each key exists, how long it lasts, and the two ways to turn the optional ones off."
      updated="27 October 2026"
      version="2.0"
      applies="recruitailabs.in and the Recruit AI workspace"
      glance={[
        {
          label: "Advertising cookies",
          value: "None. There is no ad network on this site.",
        },
        {
          label: "Set before you choose",
          value: "Three essential keys only.",
        },
        {
          label: "Your choice lasts",
          value: "12 months, then we ask again.",
        },
      ]}
      sections={SECTIONS}
    >
      <ConsentPanel />
      <DocCallout
        title="Prefer the longer version?"
        text="The privacy notice goes further: every category of personal data, the purpose behind it, the retention period and the rights you can exercise."
        primary={{ label: "Read the privacy notice", href: "/privacy" }}
        secondary={{ label: "Open the Data Rights Desk", href: "/data-rights" }}
      />
    </LegalPage>
  );
}
