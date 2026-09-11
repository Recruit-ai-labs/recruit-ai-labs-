export default function AnalyticsLoading() {
  return <div className="productPage analyticsLoading" role="status" aria-live="polite"><p className="pageEyebrow">HIRING ANALYTICS</p><h1>Loading your hiring insights…</h1><p>Fetching pipeline, interview and candidate totals.</p><div className="overviewMetrics" aria-hidden="true">{[1, 2, 3, 4].map(item => <div className="overviewMetric" key={item}><div className="analyticsSkeleton"/><strong className="analyticsSkeleton"/></div>)}</div></div>;
}
