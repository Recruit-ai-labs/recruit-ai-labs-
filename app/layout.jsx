import './globals.css';
import './mobile.css';
import './theme.css';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'Recruit AI — Recruitment that delivers results',
  description: 'AI recruitment for modern hiring teams.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
