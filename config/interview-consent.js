// Evaluated on the server by the proposed integration. Default is OFF when unset.
export const CONSENT_GATE_ENABLED = process.env.CONSENT_GATE_ENABLED === 'true';

const draft = (text) => `DRAFT - NEEDS LEGAL REVIEW — ${text}`;

export const interviewConsentCopy = {
  policyVersion: 'TODO_POLICY_VERSION',
  textVersion: 'TODO_TEXT_VERSION',
  title: draft('Before your AI interview'),
  introduction: draft('Please review and confirm each point before continuing.'),
  disclosures: [
    draft('An AI system conducts this interview.'),
    draft('Your audio and transcript are processed by third-party AI provider [TODO_PROVIDER_NAME] and speech provider [TODO_SPEECH_PROVIDER_NAME].'),
    draft('We store [TODO_STORED_DATA] for [TODO_RETENTION_PERIOD].'),
    draft('A human makes the final hiring decision.'),
    draft('You can request deletion through the existing Data Rights & Erasure page.'),
  ],
  ageConfirmation: draft('I confirm that I am 18 years of age or older.'),
  consentConfirmation: draft('I have read these disclosures and consent to the described interview processing.'),
  continueLabel: draft('Consent and continue'),
  legalReviewNotice: draft('Do not enable this screen until provider names, storage, retention and legal wording are approved.'),
};
