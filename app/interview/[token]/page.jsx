import { notFound } from 'next/navigation';
import { getInterviewLink } from '../../../lib/tech-dna-store';
import InterviewExperience from './InterviewExperience';
import '../sireen.css';
export const metadata = { title: 'Your interview with Sireen | Recruit AI', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function InterviewPage({ params }) {
  const { token } = await params;
  let link;
  try { link = await getInterviewLink(token); } catch { return <main className="sireenShell"><section className="dnaCard"><h1>Interview temporarily unavailable</h1><p>Please retry shortly. Contact your recruiter if the issue continues.</p></section></main>; }
  if (!link) notFound();
  return <InterviewExperience token={token} role={link.blueprint.role} mission={link.blueprint.mission}/>;
}
