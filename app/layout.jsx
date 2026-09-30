import './globals.css';
import './mobile.css';
import './theme.css';
import './landing-hero.css';
import './auth-provider-preview.css';
import './waiting-list/waiting-list.css';
import './legal-pages.css';
import './legal-overrides.css';
import './responsive.css';
import { ClerkProvider } from '@clerk/nextjs';
import DpdpCookieConsent from './components/DpdpCookieConsent';


export const metadata = {
  title: 'Recruit AI — Recruitment that delivers results',
  description: 'AI recruitment for modern hiring teams.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ClerkProvider>
          {children}
          <DpdpCookieConsent />
        </ClerkProvider>
      </body>
    </html>
  );
}
