'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DpdpCookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem('recruit_ai_dpdp_consent')) setVisible(true); } catch { setVisible(true); } }, []);
  const save = (value) => { try { localStorage.setItem('recruit_ai_dpdp_consent', JSON.stringify({ value, timestamp: Date.now() })); } catch {} setVisible(false); };
  if (!visible) return null;
  return <aside className="dpdpConsentCard" aria-label="Data Privacy and Consent Notice"><p className="dpdpConsentEyebrow">DATA &amp; PRIVACY</p><h2>Data Privacy &amp; Consent Notice</h2><p>We use necessary data to provide and secure the recruitment service, and may process application data for the relevant hiring purpose. We do not sell personal data to advertisers or data brokers.</p><div className="dpdpConsentLinks"><Link href="/privacy">Read Privacy Notice</Link><span>•</span><Link href="/grievance">Data Rights</Link></div><div className="dpdpConsentActions"><button onClick={() => save('accepted')}>Accept &amp; Continue</button><button onClick={() => save('strict')}>Strict Only</button></div></aside>;
}
