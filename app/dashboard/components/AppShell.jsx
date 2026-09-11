'use client';

import Link from 'next/link';
import Image from 'next/image';
import { UserButton } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navigation = [
  ['Workspace', [['Overview', '/dashboard', 'overview']]],
  ['Hiring', [['Jobs', '/dashboard/jobs', 'jobs'], ['Candidates', '/dashboard/candidates', 'candidates'], ['Interviews', '/dashboard/interviews', 'interviews'], ['Assessments', '/dashboard/assessments', 'jobs']]],
  ['Talent', [['Discover candidates', '/dashboard/discovery', 'discovery'], ['Talent pool', '/dashboard/talent-pool', 'talent'], ['Vetting', '/dashboard/vetting', 'candidates']]],
  ['Insights', [['Intelligence', '/dashboard/intelligence', 'analytics'], ['Performance', '/dashboard/performance', 'analytics'], ['Analytics', '/dashboard/analytics', 'analytics']]],
];

const routeTitles = [
  ['/dashboard/discovery', 'Discover candidates'], ['/dashboard/talent-pool', 'Talent pool'], ['/dashboard/candidates', 'Candidates'], ['/dashboard/interviews', 'Interviews'], ['/dashboard/assessments', 'Assessments'], ['/dashboard/intelligence', 'Intelligence'], ['/dashboard/performance', 'Performance'], ['/dashboard/analytics', 'Analytics'], ['/dashboard/billing', 'Billing'], ['/dashboard/settings', 'Settings'], ['/dashboard/jobs', 'Jobs'], ['/dashboard', 'Overview'],
];

function NavIcon({ name }) {
  const paths = {
    analytics: 'M4 20V10h4v10M10 20V4h4v16M16 20V8h4v12',
    discovery: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14m5-2 6 6M10 7v6M7 10h6',
    overview: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    jobs: 'M9 6V4h6v2m-12 4h18v9H3zM3 13h18M10 13v2h4v-2',
    candidates: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20v-2a4 4 0 0 0-3-3.87M16 2.13a4 4 0 0 1 0 7.75',
    interviews: 'M3 5h18v16H3zM7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 18h2',
    talent: 'M12 3l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 15.27 7.2 17.8l.92-5.34L4.24 8.64l5.36-.78z',
    settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06L7.04 4.3l.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2h4v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.61.66 1.05 1.28 1.05H21v4h-.09A1.65 1.65 0 0 0 19.4 15z',
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function ActionIcon({ name }) {
  const paths = {
    job: 'M9 7V5h6v2M4 9h16v11H4zM4 13h16M12 11v4M10 13h4',
    candidate: 'M15 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M8.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M18 8v6M15 11h6',
    interview: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h3M8 17h6',
    collapse: 'M15 18l-6-6 6-6',
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function AppShell({ children, workspaceName, userName, databaseReady = true }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef(null);
  const sidebarRef = useRef(null);
  const menuRef = useRef(null);
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1024px)');
    const sync = () => { setMobile(query.matches); if (!query.matches) setOpen(false); };
    sync(); query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const links = () => Array.from(sidebarRef.current?.querySelectorAll('a[href],button:not([disabled])') || []).filter(el => el.getClientRects().length);
    links()[0]?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key === 'Tab') {
        const items = links(), first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKey); menuRef.current?.focus(); };
  }, [open, mobile]);
  useEffect(() => {
    setCollapsed(window.localStorage.getItem('recruit-ai-sidebar') === 'collapsed');
  }, []);
  const toggleSidebar = () => setCollapsed((value) => {
    window.localStorage.setItem('recruit-ai-sidebar', value ? 'expanded' : 'collapsed');
    return !value;
  });
  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchRef.current?.value.trim().toLowerCase() || '';
    if (!query) return searchRef.current?.focus();
    router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
  };
  useEffect(() => {
    const onShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);
  const isActive = (href) => href === '/dashboard' ? pathname === href : pathname.startsWith(href);
  const pageTitle = routeTitles.find(([href]) => href === '/dashboard' ? pathname === href : pathname.startsWith(href))?.[1] || 'Workspace';
  return (
    <div className={`appShell ${collapsed ? 'sidebarCollapsed' : ''}`}>
      <aside ref={sidebarRef} id="workspace-navigation" inert={mobile && !open ? true : undefined} className={`appSidebar ${open ? 'isOpen' : ''}`}>
        <button className="sidebarCollapse" type="button" onClick={toggleSidebar} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}><ActionIcon name="collapse" /></button>
        <Link className="appBrand" href="/dashboard" onClick={() => setOpen(false)}><span className="appBrandMark"><Image src="/recruit-ai-logo.png" alt="" width={30} height={30}/></span><span><b>Recruit AI</b><small>Hiring intelligence</small></span></Link>
        <nav className="appNav" aria-label="Product navigation">{navigation.map(([group, links]) => <section className="navGroup" key={group}><small>{group}</small>{links.map(([label, href, icon]) => <Link key={href} href={href} className={isActive(href) ? 'active' : ''} onClick={() => setOpen(false)} title={collapsed ? label : undefined}><NavIcon name={icon} /><span>{label}</span></Link>)}</section>)}</nav>
        <nav className="appNav appNavBottom" aria-label="Workspace settings"><Link href="/dashboard/billing" className={isActive('/dashboard/billing') ? 'active' : ''} onClick={() => setOpen(false)}><NavIcon name="settings" /><span>Billing</span></Link><Link href="/dashboard/settings" className={isActive('/dashboard/settings') ? 'active' : ''} onClick={() => setOpen(false)}><NavIcon name="settings" /><span>Settings</span></Link></nav>
        <div className="sidebarFoot"><span>{userName?.slice(0, 1)?.toUpperCase() || 'U'}</span><div><b>{userName || 'Recruiter'}</b><small>Signed in</small></div></div>
      </aside>
      {open && <button className="sidebarScrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <div className="appMain">
        <header className="appTopbar"><button ref={menuRef} aria-expanded={open} aria-controls="workspace-navigation" className="mobileNavButton" onClick={() => setOpen(true)} aria-label="Open navigation"><span /><span /><span /></button><div className="topbarContext"><small>{workspaceName || 'WORKSPACE'}</small><b>{pageTitle}</b></div><form className="searchForm" onSubmit={submitSearch} role="search"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{flexShrink:0}}><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m15 15 5 5" stroke="currentColor" strokeWidth="2"/></svg><input ref={searchRef} type="search" placeholder="Search jobs, candidates…" aria-label="Search workspace" /><kbd>Ctrl K</kbd></form><div className="topbarQuick"><Link href="/dashboard/discovery" title="Discover candidates"><ActionIcon name="candidate" /><b>Discover</b></Link><Link href="/dashboard/jobs/new" title="Create a new job"><ActionIcon name="job" /><b>New job</b></Link></div><div className="topbarActions"><UserButton afterSignOutUrl="/" /></div></header>
        {!databaseReady && <div className="systemBanner">PocketBase is unreachable. Start the configured server and apply migrations.</div>}
        <main className="appContent">{children}</main>
      </div>
    </div>
  );
}
