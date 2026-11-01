import type { Metadata } from "next";

import LegalPage, {
  DocCallout,
  NOTE,
  P,
  UL,
  type LegalSection,
} from "../_site/LegalDoc";

export const metadata: Metadata = {
  title: "Terms & conditions — Recruit AI",
  description:
    "The agreement for using the Recruit AI workspace: account rules, employer and candidate obligations, AI-assisted output, acceptable use, liability and governing law under Indian law.",
};

const SECTIONS: LegalSection[] = [
  {
    no: "01",
    id: "agreement",
    title: "The agreement",
    blocks: [
      P(
        "These terms are a contract between you and Recruit AI Labs (\u201cRecruit AI\u201d, \u201cwe\u201d, \u201cus\u201d) for the use of the Recruit AI website and workspace. By creating an account, joining a workspace or using the service, you accept them.",
      ),
      P(
        "If you accept on behalf of a company, you confirm you are authorised to bind it, and \u201cyou\u201d then means that company. If you do not accept these terms, do not use the service.",
      ),
      P(
        "Where a signed order form, master services agreement or data-processing addendum exists between us, that document prevails over these terms to the extent of any conflict.",
      ),
    ],
  },
  {
    no: "02",
    id: "eligibility",
    title: "Who may use the service",
    blocks: [
      UL([
        "You must be at least 18 years old. The service is not directed at children, and we delete accounts we find to belong to a person under 18.",
        "You must be able to form a binding contract under Indian law, and not be barred from using the service by any applicable law.",
        "Workspace access is granted per named person. Credentials are personal and must not be shared, sold or transferred.",
      ]),
    ],
  },
  {
    no: "03",
    id: "accounts",
    title: "Your account",
    blocks: [
      P(
        "You are responsible for what happens under your credentials, and for the accuracy of the details on your account. Tell us promptly at hello@recruitailabs.in if you believe someone else has access.",
      ),
      P(
        "Workspace administrators can add or remove members, set roles and reach the workspace\u2019s audit trail. If you are removed from a workspace, your access to its records ends with it, but the records themselves belong to the workspace.",
      ),
      NOTE(
        "Job seeker accounts are free. Employer workspaces are opened after approval, because a hiring workspace processes other people\u2019s personal data.",
      ),
    ],
  },
  {
    no: "04",
    id: "the-service",
    title: "What the service is — and what it is not",
    blocks: [
      P(
        "Recruit AI is recruitment software. It helps a hiring team frame a role, source candidates, run structured interviews, collect verification evidence and keep the decision record in one workspace.",
      ),
      UL([
        "**We are not an employer, a recruitment agency or a placement service.** We do not find anyone a job, and we do not promise that a candidate will be hired or that a role will be filled.",
        "**Hiring decisions belong to the employer.** Every shortlist, rejection, offer and salary is the employer\u2019s decision and responsibility.",
        "**A profile is a claim, not a verification.** Unless a verification step was run and reported, we have not confirmed anyone\u2019s identity, education or employment history.",
        "**The service is a tool, not legal advice.** You remain responsible for complying with the laws that apply to your hiring.",
      ]),
    ],
  },
  {
    no: "05",
    id: "ai",
    title: "AI-assisted output and human review",
    blocks: [
      P(
        "Parts of the service use machine learning to parse résumés, transcribe interviews and draft summaries or match signals. These outputs can be incomplete or wrong, and they are provided as assistance, not as findings of fact.",
      ),
      UL([
        "A human must review any AI output before it affects a person — a rejection, a stage change, an offer or a verification outcome.",
        "Candidates may ask for a human review of an automated assessment, and employers must provide one when asked.",
        "You must not use prompts, instructions or filters to rank or exclude people on caste, religion, sex, sexual orientation, disability, marital status, pregnancy, age or any other protected characteristic.",
        "You must not use the service to make a decision that produces a legal or similarly significant effect on a person solely by automated means.",
      ]),
    ],
  },
  {
    no: "06",
    id: "employers",
    title: "Employer obligations",
    blocks: [
      P(
        "If you use a workspace to hire, you are the Data Fiduciary for the candidate records you place in it. Recruit AI acts as your Data Processor on documented instructions.",
      ),
      UL([
        "You warrant that you have a lawful basis under the DPDP Act for every candidate record you import, and that the person has been told what you will do with it.",
        "You will collect only what is relevant to the role, and will not request medical history, salary history, caste, religion, marital status or subjective opinions about a person\u2019s previous colleagues.",
        "You will honour a candidate\u2019s request to access, correct or erase their data, and will not keep it longer than the purpose requires.",
        "You will not use the workspace to build a general talent database out of data collected for one role, unless each person has been told and has agreed.",
        "You will tell us promptly if you learn of a breach affecting data in your workspace, so the notification duties can be met.",
      ]),
    ],
  },
  {
    no: "07",
    id: "candidates",
    title: "Candidate terms",
    blocks: [
      UL([
        "Apply only to roles you are genuinely interested in, and keep your profile accurate. Impersonation or a fabricated history ends the account.",
        "An interview may be recorded or transcribed only with your consent, asked before the room opens. Declining recording does not, by itself, disqualify you where the employer allows a text or live alternative.",
        "Verification documents are requested for a specific check. Ask for the reason if it is not clear, and refuse anything that is not job-relevant.",
        "You may withdraw from a process at any time, and ask for your application data to be erased through the Data Rights Desk.",
      ]),
    ],
  },
  {
    no: "08",
    id: "acceptable-use",
    title: "Acceptable use",
    blocks: [
      P("You must not, and must not let anyone else:"),
      UL([
        "reverse engineer, decompile or attempt to extract the source of the service, or probe it for vulnerabilities without written permission;",
        "scrape, crawl or bulk-download candidate data, or resell access to the service;",
        "upload malware, or content that infringes someone else\u2019s rights or breaks the law;",
        "attempt prompt injection, jailbreak or any other attempt to subvert the AI review rules in clause 05;",
        "impersonate another person, or create an account with someone else\u2019s details;",
        "use the service to harass, discriminate against, or unlawfully monitor anyone.",
      ]),
      P(
        "We may suspend a workspace immediately where we have reasonable grounds to believe one of these has happened, and will tell you why.",
      ),
    ],
  },
  {
    no: "09",
    id: "ip",
    title: "Your content and our intellectual property",
    blocks: [
      P(
        "You keep ownership of everything you put into the workspace — résumés, job descriptions, notes, documents and recordings. You grant us a limited licence to host, copy, process and display that content only to run the service for you, and for as long as needed to meet the retention periods in the privacy notice.",
      ),
      P(
        "We own the service itself: the software, the interface, the scoring and matching methods, the prompts and evaluation design, the documentation and the Recruit AI name and marks. Nothing in these terms transfers any of that to you.",
      ),
      P(
        "Feedback you send us may be used to improve the product without obligation to you, provided it does not contain anyone\u2019s personal data.",
      ),
    ],
  },
  {
    no: "10",
    id: "data-protection",
    title: "Personal data",
    blocks: [
      P(
        "Our handling of personal data is described in the privacy notice and the cookie notice, which form part of these terms. Where we process candidate data for an employer, the employer\u2019s instructions and our data-processing terms govern that processing.",
      ),
      P(
        "If you are a candidate and the record sits inside an employer\u2019s workspace, we may route your request to that employer, because it is the Data Fiduciary for that record.",
      ),
    ],
  },
  {
    no: "11",
    id: "fees",
    title: "Fees, pilots and refunds",
    blocks: [
      P(
        "Job seeker accounts are free. Paid employer plans, pilots and any professional services are priced only in a signed order form, which sets the term, the fee, the billing cycle, the notice period and the refund position.",
      ),
      UL([
        "Fees are exclusive of GST unless the order form says otherwise, and are payable within the period stated on the invoice.",
        "A pilot runs for the period named in its order form and does not renew automatically.",
        "Prepaid fees are refundable only where the order form says so, or where we end the service for our own convenience without cause.",
        "We may change list pricing for a future term with at least 30 days\u2019 written notice; a change never applies retroactively to a term already paid for.",
      ]),
    ],
  },
  {
    no: "12",
    id: "third-parties",
    title: "Third-party services",
    blocks: [
      P(
        "The workspace can connect to services we do not control — an applicant-tracking system, a calendar, an email provider. Those connections run on the third party\u2019s terms, and you are responsible for the permissions you grant.",
      ),
      P(
        "We test an integration before we list it, but we cannot warrant a third party\u2019s availability, accuracy or security. Disconnecting an integration stops future transfers; it does not reach back into the third party\u2019s copy of the data.",
      ),
    ],
  },
  {
    no: "13",
    id: "availability",
    title: "Availability and changes",
    blocks: [
      P(
        "We work to keep the service available and to tell you in advance about planned maintenance, but we do not promise uninterrupted availability unless an order form states a service level. Features may change as the product develops.",
      ),
      P(
        "If we remove a material feature you rely on, we give reasonable notice and, where you have prepaid for a term, a pro-rata credit for the unused part.",
      ),
    ],
  },
  {
    no: "14",
    id: "termination",
    title: "Suspension and termination",
    blocks: [
      UL([
        "You may close your account at any time from settings, or by writing to us.",
        "We may suspend or end access for a material breach of these terms, for non-payment after notice, or where the law requires it.",
        "On termination, the workspace administrator can export the workspace data for 30 days; after that it is deleted on the retention schedule in the privacy notice.",
        "Clauses that by their nature survive termination — intellectual property, disclaimers, liability, governing law — continue to apply.",
      ]),
    ],
  },
  {
    no: "15",
    id: "disclaimers",
    title: "Disclaimers",
    blocks: [
      P(
        "The service is provided on an \u201cas is\u201d and \u201cas available\u201d basis. To the extent permitted by law, we disclaim implied warranties of merchantability, fitness for a particular purpose and non-infringement.",
      ),
      P(
        "We do not warrant that a match, a summary, a transcript or a verification response is complete or accurate, or that using the service will result in a hire, a placement or any particular commercial outcome. Nothing in these terms excludes a warranty or right that Indian law does not allow to be excluded.",
      ),
    ],
  },
  {
    no: "16",
    id: "liability",
    title: "Limitation of liability and indemnity",
    blocks: [
      P(
        "To the extent permitted by law, neither party is liable for indirect or consequential loss, loss of profit, loss of goodwill, or loss of anticipated savings.",
      ),
      P(
        "Our total aggregate liability arising out of or in connection with these terms is limited to the fees you paid us in the twelve months before the event giving rise to the claim, or \u20b9 one lakh where no fee was paid, whichever is higher. This cap does not apply to fraud, wilful misconduct, or a liability that cannot lawfully be limited.",
      ),
      P(
        "You will indemnify us against a third-party claim arising from content you uploaded, a hiring decision you made, or your breach of clause 06 or clause 08.",
      ),
    ],
  },
  {
    no: "17",
    id: "law",
    title: "Governing law and disputes",
    blocks: [
      P(
        "These terms are governed by the laws of India. Before any formal step, both sides will try in good faith for 30 days to resolve a dispute through the notice route in clause 18.",
      ),
      P(
        "Subject to that, the courts at Raipur, Chhattisgarh have exclusive jurisdiction. Nothing here stops either side from seeking urgent interim relief from a court of competent jurisdiction.",
      ),
    ],
  },
  {
    no: "18",
    id: "notices",
    title: "Notices and grievance",
    blocks: [
      P(
        "Notices to us go to hello@recruitailabs.in and are treated as received on the next working day. Notices to you go to the email address on your account, or to the workspace administrator where the account belongs to a company.",
      ),
      P(
        "**Grievance Officer**, Recruit AI Labs — hello@recruitailabs.in, Monday to Friday, 09:00–18:00 IST. A service complaint is acknowledged within 48 hours and answered within one month. A personal-data complaint follows the route in the privacy notice, including the right to approach the Data Protection Board of India.",
      ),
      P(
        "If any provision is found unenforceable, the rest stays in force. A failure to enforce a provision is not a waiver of it. These terms, together with the privacy and cookie notices and any signed order form, are the entire agreement between us.",
      ),
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      active="terms"
      title="A fair platform"
      accent="needs fair rules."
      kicker="Recruit AI / The agreement"
      lead="The rules for using the workspace — for the team doing the hiring, for the person being considered, and for the software in between."
      updated="27 October 2026"
      version="2.0"
      applies="recruitailabs.in, the workspace and every connected integration"
      glance={[
        {
          label: "Age",
          value: "18 and over. Accounts found younger are closed.",
        },
        {
          label: "Decisions",
          value: "The employer decides. The software only organises evidence.",
        },
        {
          label: "Jurisdiction",
          value: "Courts at Raipur, Chhattisgarh, under Indian law.",
        },
      ]}
      sections={SECTIONS}
    >
      <DocCallout
        title="Something in here unclear?"
        text="Contract questions, order forms and data-processing terms go to the same inbox as everything else. We would rather explain a clause than have you accept one you did not follow."
        primary={{ label: "Write to us", href: "mailto:hello@recruitailabs.in" }}
        secondary={{ label: "Read the privacy notice", href: "/privacy" }}
      />
    </LegalPage>
  );
}
