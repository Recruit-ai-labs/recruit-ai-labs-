import type { Metadata } from "next";

import LegalPage, {
  DocCallout,
  NOTE,
  P,
  TABLE,
  UL,
  type LegalSection,
} from "../_site/LegalDoc";

export const metadata: Metadata = {
  title: "Privacy notice — Recruit AI",
  description:
    "How Recruit AI Labs collects, uses, shares and protects personal data under the Digital Personal Data Protection Act, 2023 — itemised by data category, purpose and retention period.",
};

const SECTIONS: LegalSection[] = [
  {
    no: "01",
    id: "who-we-are",
    title: "Who we are, and the role we play",
    blocks: [
      P(
        "Recruit AI is a recruitment workspace published by Recruit AI Labs (\u201cwe\u201d, \u201cus\u201d). Hiring teams use it to source, interview, verify and decide — and to keep the evidence for each decision in one place.",
      ),
      P(
        "Under the Digital Personal Data Protection Act, 2023 (\u201cthe DPDP Act\u201d) our role depends on the task. **For your own account, this website and our communications we are the Data Fiduciary** — we decide why the data is used and how. **For candidate records an employer uploads or collects inside its workspace, that employer is the Data Fiduciary and we are its Data Processor**, acting only on documented instructions.",
      ),
      P(
        "We do not sell personal data. We do not trade it with advertisers, lead generators or data brokers.",
      ),
    ],
  },
  {
    no: "02",
    id: "what-we-hold",
    title: "The personal data we handle",
    blocks: [
      P(
        "The DPDP Act asks for an itemised notice, so every category below is named with the purpose it serves and the person it belongs to.",
      ),
      TABLE(
        ["Category", "What it includes", "Whose data"],
        [
          [
            "Account and workspace",
            "Name, work email, phone number, role, organisation, workspace membership",
            "Every user",
          ],
          [
            "Candidate profile",
            "Name, contact details, city, résumé, work history, education, skills, portfolio links",
            "Candidate",
          ],
          [
            "Application record",
            "Role applied for, stage, scorecards, notes written by the hiring team",
            "Candidate",
          ],
          [
            "Interview evidence",
            "Audio or video recording, transcript, structured answers, AI-drafted summaries",
            "Candidate",
          ],
          [
            "Verification",
            "Consent record, identity or education or employment documents, factual replies from a previous employer",
            "Candidate",
          ],
          [
            "Billing",
            "Organisation, GSTIN, invoice and payment references",
            "Customer administrator",
          ],
          [
            "Device and security",
            "IP address, browser and device, session and audit logs, approximate city",
            "Every user",
          ],
          [
            "Communications",
            "Emails, support tickets, feedback and survey answers you send us",
            "Every user",
          ],
          [
            "Cookies and storage",
            "Session identifiers, saved preferences, and analytics identifiers if you allow them",
            "Visitor",
          ],
        ],
      ),
      NOTE(
        "Verification is designed to collect the smallest document that answers the question. We do not ask for medical records, salary history, caste, religion, marital status or subjective opinions about a previous colleague.",
      ),
    ],
  },
  {
    no: "03",
    id: "how-we-collect",
    title: "How we get it",
    blocks: [
      UL([
        "**From you** — when you create an account, complete a profile, apply to a role, join an interview room or write to support.",
        "**From an employer** — when a hiring team imports a résumé, adds you to a role, or records a stage or decision.",
        "**From you, on their behalf** — when you consent to a verification step and upload the documents it needs.",
        "**Automatically** — session storage, security logs and device information recorded while you use the service.",
        "**From a service you connected** — such as an applicant-tracking system or calendar an employer chooses to link.",
      ]),
    ],
  },
  {
    no: "04",
    id: "why-we-process",
    title: "Why we process it",
    blocks: [
      P(
        "Each purpose below rests either on your consent or on a legitimate use the DPDP Act permits. We do not quietly repurpose data for something new.",
      ),
      TABLE(
        ["Purpose", "Basis"],
        [
          [
            "Create and run your account, and keep the workspace secure",
            "Consent; contract performance where you are our customer",
          ],
          [
            "Match candidates to a role and present the evidence behind the match",
            "Consent of the candidate; the employer\u2019s lawful basis for its own hiring",
          ],
          [
            "Record and transcribe an interview, where that feature is used",
            "Consent, asked before the room opens",
          ],
          [
            "Collect and check verification documents",
            "A separate, specific consent for each check",
          ],
          [
            "Send service messages — sign-in codes, security alerts, changes to these documents",
            "Consent; legitimate use for security",
          ],
          [
            "Answer support requests and investigate misuse or fraud",
            "Legitimate use",
          ],
          [
            "Improve the product using aggregated, de-identified usage data",
            "Legitimate use",
          ],
          [
            "Meet tax, audit and other legal obligations",
            "Legal obligation",
          ],
          [
            "Send product news, if you asked for it",
            "Consent — withdrawn as easily as it was given",
          ],
        ],
      ),
    ],
  },
  {
    no: "05",
    id: "consent",
    title: "Consent, and how to take it back",
    blocks: [
      P(
        "Consent here means a clear \u201cyes\u201d given before we do something optional with your data. It is asked for separately for each purpose, is never bundled into access to the service, and can be withdrawn with the same ease it was given.",
      ),
      UL([
        "Interview recording is an explicit choice offered before the room opens. Declining it does not by itself disqualify a candidate, and the room can run without it where the employer allows.",
        "Every verification check needs a fresh consent, and each record shows what was asked, when, and by whom.",
        "Marketing consent is a separate switch, unticked by default.",
        "Withdrawal stops future processing. It does not undo what was already done lawfully, and it does not override data we must keep by law.",
      ]),
      P(
        "You can withdraw from the consent switch inside your workspace, from the cookie preferences link in the footer, or through the Data Rights Desk. Where a Consent Manager registered with the Data Protection Board of India is available to you, you may also give, manage and withdraw consent through that Consent Manager.",
      ),
    ],
  },
  {
    no: "06",
    id: "ai",
    title: "AI-assisted work, and the human in it",
    blocks: [
      P(
        "AI in Recruit AI reads, sorts and summarises. It extracts résumé detail, transcribes interviews, and drafts evidence-based summaries and match signals. It does not make the hiring decision, and it is never used to rank people on caste, religion, sex, sexual orientation, disability, marital status, pregnancy, age or any other protected characteristic.",
      ),
      UL([
        "**A person decides.** A hiring team reviews the evidence and owns the outcome. A model output is an input, never the only basis for rejecting someone.",
        "**You can ask for a human look.** A candidate may ask the employer, or us, to have an automated assessment reviewed by a person.",
        "**Inputs are limited.** We send the minimum needed to produce a summary, under terms that forbid using your data to train a third-party model.",
        "**Outputs are traceable.** Each summary keeps the passage or answer it was drawn from, so a decision can be explained months later.",
      ]),
    ],
  },
  {
    no: "07",
    id: "sharing",
    title: "Who receives your data",
    blocks: [
      UL([
        "**The hiring team.** Authorised members of the workspace that owns the role see the profile, application and interview evidence. Access is scoped to that workspace and written to an audit trail.",
        "**A previous employer, for verification only.** They receive the specific claim being checked and evidence of the candidate\u2019s consent — never the résumé, the interview or the wider profile.",
        "**Our service providers.** Hosting, private storage, email delivery, authentication, AI inference and support tooling, each bound by written terms that limit them to our instructions.",
        "**A connected applicant-tracking system.** Only if the employer configures it, and only the fields it selects. Résumés, transcripts and recordings are not sent unless that is turned on deliberately.",
        "**Authorities.** Where a law, a court order or a regulator with lawful authority requires it, and only to the extent required.",
        "**A successor.** If the business is reorganised or transferred, data may pass to the successor under the same promises, with notice to you.",
      ]),
    ],
  },
  {
    no: "08",
    id: "transfers",
    title: "Where your data goes",
    blocks: [
      P(
        "Our primary systems and backups are hosted in India. Some providers may process data outside India for support, email delivery or model inference.",
      ),
      P(
        "Under the DPDP Act we may transfer personal data outside India except to a territory the Central Government restricts by notification. Where such a restriction applies to a provider we use, we do not route your data there, and we will tell you if that changes the service.",
      ),
      P(
        "Wherever the data sits, the same safeguards travel with it: encryption, access control, audit logging and a contract that limits the recipient to our instructions.",
      ),
    ],
  },
  {
    no: "09",
    id: "retention",
    title: "How long we keep it",
    blocks: [
      P(
        "We keep personal data only while the purpose it was collected for is still live, or while the law requires it. Retention is set by category, not by convenience.",
      ),
      TABLE(
        ["Data", "Kept for"],
        [
          ["Account and workspace record", "While the account is open, then 180 days"],
          [
            "Candidate profile, résumé and application",
            "12 months from the last activity in that workspace, unless the employer sets a shorter period",
          ],
          [
            "Interview recording and transcript",
            "90 days after the hiring decision, unless a longer period is separately agreed",
          ],
          [
            "Verification documents and responses",
            "180 days after the verification report is issued",
          ],
          [
            "Billing and tax records",
            "8 years, as required by Indian tax and company law",
          ],
          ["Security, access and audit logs", "180 days"],
          ["Support conversations", "24 months"],
          [
            "Marketing preferences",
            "Until withdrawn, then 30 days for suppression",
          ],
        ],
      ),
      P(
        "At the end of a period the record is deleted or irreversibly de-identified. Limited copies may remain in encrypted backups until the backup cycle rolls over, and in records we must hold for a legal claim.",
      ),
    ],
  },
  {
    no: "10",
    id: "security",
    title: "How we protect it",
    blocks: [
      UL([
        "Encryption in transit with TLS, and encryption at rest for stored records and documents.",
        "Role-based access inside each workspace, with an audit trail of who opened what.",
        "Verification documents held in private storage and served only through short-lived signed links.",
        "Multi-factor authentication available on every account and required for workspace administrators.",
        "Written data-processing terms with every provider, reviewed before onboarding and on renewal.",
        "Access removed when a person leaves a workspace, and reviewed on a schedule.",
      ]),
      P(
        "No system is perfect. If you believe an account, a document or an interview link has been exposed, write to hello@recruitailabs.in and we will act on it.",
      ),
    ],
  },
  {
    no: "11",
    id: "breach",
    title: "If something goes wrong",
    blocks: [
      P(
        "If a personal data breach occurs, we notify the Data Protection Board of India and each affected Data Principal without delay, in the form and manner the DPDP Rules prescribe — what happened, which data and how many people are affected, the likely consequences, the measures taken, and the steps you can take to protect yourself.",
      ),
      P(
        "We also notify the employer that controls the affected workspace, because it may carry its own notification duty as the Data Fiduciary for that record.",
      ),
    ],
  },
  {
    no: "12",
    id: "rights",
    title: "Your rights as a Data Principal",
    blocks: [
      P("You may ask us to do any of the following, at no charge:"),
      TABLE(
        ["Right", "What it means here"],
        [
          [
            "Access",
            "A summary of the personal data we process about you, the purposes, and the categories of recipients.",
          ],
          [
            "Correction and completion",
            "Fix inaccurate or incomplete data — a résumé detail, a stage, a contact record.",
          ],
          [
            "Erasure",
            "Delete data once its purpose is served, subject to what we must keep by law.",
          ],
          [
            "Withdraw consent",
            "Stop optional processing, without affecting what already happened lawfully.",
          ],
          [
            "Grievance redressal",
            "Raise a concern about how your data was handled and receive a reasoned answer.",
          ],
          [
            "Nomination",
            "Name another person to exercise these rights if you die or become incapacitated.",
          ],
        ],
      ),
      P(
        "Requests go through the Data Rights Desk. We may need to confirm your identity first, and where the record sits inside an employer\u2019s workspace we may route the request to that employer, which is the Data Fiduciary for it.",
      ),
    ],
  },
  {
    no: "13",
    id: "children",
    title: "Children",
    blocks: [
      P(
        "Recruit AI is for people who are 18 or older. We do not knowingly collect the personal data of children, and we do not use behavioural tracking or targeted advertising aimed at them.",
      ),
      P(
        "Where a lawful use does involve a person under 18 — an apprenticeship programme an employer runs, for example — we require verifiable parental consent before any processing starts, and we avoid processing that is likely to have a detrimental effect on the child.",
      ),
      P(
        "If we learn that a child\u2019s data reached us without that consent, we delete it. Write to us if you believe that has happened.",
      ),
    ],
  },
  {
    no: "14",
    id: "cookies",
    title: "Cookies and browser storage",
    blocks: [
      P(
        "We use a small number of cookies and storage keys. Strictly necessary storage keeps the session secure and remembers your choice; analytics and preference storage stay off until you allow them. Advertising cookies are not used at all.",
      ),
      P(
        "The Cookie notice lists each key, its purpose, and how long it lasts, together with the controls for changing your mind.",
      ),
      NOTE(
        "The consent card you saw on arrival records your choice in this browser only. Clearing site data or switching browsers means you will be asked again.",
      ),
    ],
  },
  {
    no: "15",
    id: "changes",
    title: "Changes, language and contact",
    blocks: [
      P(
        "We review this notice whenever the product or the law changes, and publish the version and the date at the top of the page. A material change is announced in the workspace or by email before it takes effect.",
      ),
      P(
        "This notice is published in English. Where the DPDP Rules require it, a version is made available in the languages listed in the Eighth Schedule to the Constitution — ask the Data Rights Desk and we will send the one you need.",
      ),
      P(
        "**Grievance Officer**, Recruit AI Labs — hello@recruitailabs.in, Monday to Friday, 09:00–18:00 IST. We acknowledge a complaint within 3 working days and answer it within 30 days. If you are not satisfied with the answer, you may complain to the Data Protection Board of India.",
      ),
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      active="privacy"
      kicker="Recruit AI / Privacy notice"
      title="Your data,"
      accent="in plain terms."
      lead="What we collect, why we collect it, who receives it, how long it stays — and how to make us change or delete it. Written to be read, not to be survived."
      updated="27 October 2026"
      version="2.0"
      applies="Website, workspace, candidate and verification flows"
      glance={[
        {
          label: "Our role",
          value:
            "Data Fiduciary for accounts and this site; Data Processor for an employer\u2019s workspace.",
        },
        {
          label: "Personal data sold",
          value: "Never — not to advertisers, brokers or lead lists.",
        },
        {
          label: "Primary hosting",
          value: "India, with named providers bound by written terms.",
        },
      ]}
      sections={SECTIONS}
    >
      <DocCallout
        title="Want a copy, a correction or a deletion?"
        text="The Data Rights Desk handles access, correction, erasure, consent withdrawal, nomination and grievances. We confirm identity first, then tell you exactly what we found and what we did."
        primary={{ label: "Open the Data Rights Desk", href: "/data-rights" }}
        secondary={{ label: "Read the cookie notice", href: "/cookies" }}
      />
    </LegalPage>
  );
}
