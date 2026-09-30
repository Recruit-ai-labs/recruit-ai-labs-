'use client';
import { useEffect, useState } from 'react';
export default function JobTabs({ count }) {
  const [current, setCurrent] = useState('overview');
  useEffect(() => {
    const change = () => setCurrent(location.hash.slice(1) || 'overview');
    change(); window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  return <nav className="jobTabs" aria-label="Job sections">{[['overview', 'Overview'], ['pipeline', 'Candidates'], ['activity', 'Activity']].map(([id, label]) => <a key={id} className={current === id ? 'active' : ''} aria-current={current === id ? 'location' : undefined} href={`#${id}`} onClick={() => setCurrent(id)}>{label}{id === 'pipeline' && <span>{count}</span>}</a>)}</nav>;
}
