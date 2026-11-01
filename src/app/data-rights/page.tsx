import type { Metadata } from "next";

import LegalPage, {
  DocCallout,
  NOTE,
  OL,
  P,
  TABLE,
  UL,
  type LegalSection,
} from "../_site/LegalDoc";

export const metadata: Metadata = {
  title: "Data rights & grievance — Recruit AI",
  description:
    "Exercise your rights as a Data Principal under the Digital Personal Data Protection Act, 2023 — access, correction, erasure, consent withdrawal, nomination and grievance redressal.",
};

/** The prefilled request template. Keeps the first email useful for both sides. */
const REQUEST_MAIL =
  "mailto:hello@recruitailabs.in" +
  "?subject=Data%20rights%20request%20%E2%80%94%20Recruit%20AI" +
  "&body=Name%3A%0A" +
  "Request%20type%20(access%20%2F%20correction%20%2F%20erasure%20%2F%20consent%20withdrawal%20%2F%20nomination%20%2F%20grievance)%3A%0A" +
  "Account%20email%20or%20phone%3A%0A" +
  "Role%2C%20company%20or%20workspace%20concerned%3A%0A" +
  "Rough%20date%20of%20the%20application%20or%20check%3A%0A" +
  "What%20you%20would%20like%20us%20to%20do%3A%0A";

const SECTIONS: LegalSection[] = [
  {
    no: "01",
    id: "rights",
    title: "What you can ask for",
    blocks: [
      P(
        "The DPDP Act gives every Data Principal a set of rights. None of them needs a reason, a fee or a lawyer. Each row below says what the right gets you and what helps us act on it quickly.",
      ),
      TABLE(
        ["Right", "What it gets you", "What to include"],
        [
          [
            "Access",
            "A summary of the personal data we process about you, the purposes, and the categories of people who receive it.",
            "The email or phone you used, or the role you applied for.",
          ],
          [
            "Correction and completion",
            "An inaccurate or incomplete record put right — a résumé detail, a stage, a contact.",
            "The field, what it says now, and what it should say.",
          ],
          [
            "Erasure",
            "Data deleted once its purpose is served, subject to what the law requires us to keep.",
            "The workspace or employer, if you know it.",
          ],
          [
            "Withdrawal of consent",
            "Optional processing stops — recording, verification, marketing.",
            "Which consent you are withdrawing.",
          ],
          [
            "Grievance redressal",
            "A reasoned answer about how your data was handled.",
            "What happened, when, and what outcome you are seeking.",
          ],
          [
            "Nomination",
            "Another person named to exercise these rights if you die or become incapacitated.",
            "The nominee\u2019s name, relationship and contact.",
          ],
        ],
      ),
    ],
  },
  {
    no: "02",
    id: "how",
    title: "How to make a request",
    blocks: [
      P(
        "One route, one inbox, a human at the other end. Write to hello@recruitailabs.in with the line \u201cData rights request\u201d in the subject — the button above opens a blank template with the right fields.",
      ),
      OL([
        "Write from the email on your account, or tell us which one you used. If you are an authorised representative, say so and attach proof of authority.",
        "Name the right you are exercising and the workspace, company or role concerned.",
        "Add anything that helps us find the record — a rough date, a role title, a stage.",
        "Do not send passwords, identity documents or sensitive details in the first message. We will ask for exactly what we need, if anything.",
      ]),
      P(
        "You do not need an account to write to us. A candidate who applied through an employer\u2019s workspace has the same route, and does not need the employer\u2019s permission.",
      ),
    ],
  },
  {
    no: "03",
    id: "timeline",
    title: "What happens next",
    blocks: [
      TABLE(
        ["Step", "What happens", "When"],
        [
          ["01", "We acknowledge the request and give it a reference.", "Within 3 working days"],
          ["02", "We confirm identity, and authority if someone is acting for you.", "Only where needed"],
          ["03", "We locate the record and confirm who controls it — us or an employer.", "During review"],
          ["04", "We assess the request against the law and any retention obligation.", "During review"],
          ["05", "We act, and explain what was done and anything we could not do.", "Within 30 days"],
        ],
      ),
      NOTE(
        "If we need more from you to identify the record, the clock pauses while we wait — we will say so in plain words rather than let a request sit silently.",
      ),
    ],
  },
  {
    no: "04",
    id: "identity",
    title: "Identity, and the employer\u2019s copy",
    blocks: [
      P(
        "Releasing someone\u2019s data to the wrong person is itself a breach, so we confirm that you are who you say you are. In most cases a one-time code to the email or phone already on the account is enough. We ask for an identity document only where the law requires proof, and never as a routine step.",
      ),
      P(
        "Some records sit inside an employer\u2019s workspace. For those, the employer is the Data Fiduciary and we are its Data Processor. We will tell you who holds the record, pass the request on, and follow up — we will not simply point at the employer and stop.",
      ),
    ],
  },
  {
    no: "05",
    id: "erasure",
    title: "What erasure can and cannot do",
    blocks: [
      UL([
        "**It removes the record from active use.** The profile, application, transcript or document stops being available to the workspace and disappears from search and exports.",
        "**It reaches our backups on a cycle.** Encrypted backups rotate out within their retention window; a copy cannot be surgically edited out of an encrypted archive.",
        "**It cannot override a legal duty.** Invoice and tax records, audit logs linked to a live dispute, and records subject to a lawful hold stay until the obligation ends.",
        "**It cannot reach an employer\u2019s own systems.** If a hiring team exported a résumé or copied notes elsewhere, that copy is theirs to delete — we will tell you that plainly rather than imply otherwise.",
      ]),
    ],
  },
  {
    no: "06",
    id: "nomination",
    title: "Nomination",
    blocks: [
      P(
        "You may nominate one person to exercise your rights on your behalf if you die or become incapacitated. Write to us with the nominee\u2019s name, relationship and contact details, and we will record it against your account.",
      ),
      P(
        "A nomination can be changed or withdrawn at any time by writing from the same address. An authorised representative acting under a valid nomination is treated as you for the purposes of a request.",
      ),
    ],
  },
  {
    no: "07",
    id: "consent-manager",
    title: "Consent Managers",
    blocks: [
      P(
        "The DPDP Act allows consent to be given, managed and withdrawn through a Consent Manager registered with the Data Protection Board of India — a single, transparent point through which a person can control consent across services.",
      ),
      P(
        "When a Consent Manager is available for our service, we will name it here and support it fully. Until then, the switch inside your workspace and the routes on this page are the ways to give and withdraw consent, and both work without writing an email.",
      ),
    ],
  },
  {
    no: "08",
    id: "grievance",
    title: "Grievance Officer and escalation",
    blocks: [
      P(
        "**Grievance Officer**, Recruit AI Labs — hello@recruitailabs.in — Monday to Friday, 09:00–18:00 IST. Write with \u201cGrievance\u201d in the subject line and include the reference of any earlier request.",
      ),
      P(
        "We acknowledge a grievance within 3 working days and answer it within 30 days, with the reasoning and any remedy. If we need longer because the record sits with an employer, we will say so before the period ends.",
      ),
      P(
        "If you are not satisfied with our answer, or we do not answer in time, you may complain to the **Data Protection Board of India** under the DPDP Act. You can also approach it directly where the Act allows. Nothing in this process takes away any other remedy you have under Indian law.",
      ),
    ],
  },
  {
    no: "09",
    id: "accessibility",
    title: "Accessibility and language",
    blocks: [
      P(
        "These pages are readable without an account, without JavaScript and without a login wall. If a screen reader, a larger type setting or a slower connection makes any part of them hard to use, tell us and we will change the page rather than ask you to work around it.",
      ),
      P(
        "Notices are published in English. Where the DPDP Rules require it, a version is made available in the languages listed in the Eighth Schedule to the Constitution — ask the Data Rights Desk for the language you need, and we will send it.",
      ),
    ],
  },
];

export default function DataRightsPage() {
  return (
    <LegalPage
      active="rights"
      kicker="Recruit AI / Data Rights Desk"
      title="Your data."
      accent="Your decision."
      lead="Access it, correct it, delete it, withdraw consent or raise a grievance — one inbox, a named officer, and a written answer inside thirty days."
      updated="27 October 2026"
      version="2.0"
      applies="Candidates, workspace users and website visitors"
      heroActions={[
        { label: "Start a request", href: REQUEST_MAIL, solid: true },
        { label: "Read the privacy notice", href: "/privacy" },
      ]}
      glance={[
        {
          label: "Acknowledged within",
          value: "3 working days, with a reference number.",
        },
        {
          label: "Answered within",
          value: "30 days, with reasons and any limitation explained.",
        },
        {
          label: "Cost",
          value: "None. No reason, fee or lawyer needed.",
        },
      ]}
      sections={SECTIONS}
    >
      <DocCallout
        title="Tell us what you need."
        text="The template asks for a name, the request type and enough context to find the record. Nothing more is needed in a first message — please do not send documents or passwords until we ask."
        primary={{ label: "Email the Data Rights Desk", href: REQUEST_MAIL }}
        secondary={{ label: "Read the cookie notice", href: "/cookies" }}
      />
    </LegalPage>
  );
}
