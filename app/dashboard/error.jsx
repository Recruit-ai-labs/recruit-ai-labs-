'use client';

export default function DashboardError({ reset }) {
  return <div className="connectionState" role="alert"><span>WORKSPACE UNAVAILABLE</span><h1>We could not load this page.</h1><p>The connection may be slow or temporarily unavailable. Please try again. If this continues, ask your workspace administrator to check the service.</p><button className="primaryAction" onClick={reset}>Try again <b>&rarr;</b></button></div>;
}
