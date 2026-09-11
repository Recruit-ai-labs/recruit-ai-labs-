'use client';
import Link from 'next/link';
export default function AnalyticsError({ reset }) {
  return <section className="connectionState" role="alert"><span>ANALYTICS UNAVAILABLE</span><h1>Your analytics could not be loaded.</h1><p>The data service may be slow or unavailable. Retry to fetch current numbers.</p><div className="overviewHeadingActions"><button type="button" className="primaryAction" onClick={reset}>Retry analytics</button><Link className="overviewSecondary" href="/dashboard">Back to overview</Link></div></section>;
}
