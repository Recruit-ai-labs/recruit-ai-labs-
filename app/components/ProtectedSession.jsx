'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './WorkspaceTransition.module.css';

// Server guards still authorize every data request. This guard also protects
// UI restored from the browser's document cache or Next's client history cache.
export default function ProtectedSession({ children, scope }) {
  const container = useRef(null);
  const [status, setStatus] = useState('checking');
  const [attempt, setAttempt] = useState(0);
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useLayoutEffect(() => {
    const node = container.current;
    let controller;
    const hide = () => {
      controller?.abort();
      node.hidden = true;
    };
    const verify = async () => {
      hide();
      setStatus('checking');
      controller = new AbortController();
      const current = controller;
      const timeout = setTimeout(() => {
        if (controller === current && !current.signal.aborted) {
          current.abort();
          setStatus('unavailable');
        }
      }, 12000);
      try {
        const response = await fetch(`/api/access/session?scope=${scope}`, {
          cache: 'no-store', credentials: 'same-origin', signal: current.signal,
        });
        if (response.status === 401 || response.status === 403) {
          if (!current.signal.aborted) window.location.replace('/sign-in');
          return;
        }
        if (!response.ok) throw new Error('Session service unavailable');
        const session = await response.json();
        if (current.signal.aborted) return;
        if (!session?.allowed) { window.location.replace('/sign-in'); return; }
        node.hidden = false;
        setStatus('ready');
      } catch {
        if (!current.signal.aborted) setStatus('unavailable');
      } finally { clearTimeout(timeout); }
    };
    const visible = () => { if (document.visibilityState === 'visible') void verify(); else hide(); };
    void verify();
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', verify);
    window.addEventListener('popstate', verify);
    document.addEventListener('visibilitychange', visible);
    return () => {
      hide();
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', verify);
      window.removeEventListener('popstate', verify);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [scope, pathname, search, attempt]);

  return <>{status !== 'ready' && <section role={status === 'unavailable' ? 'alert' : 'status'} className={styles.screen}>
    <div className={styles.card}><div className={styles.brand}>RECRUIT AI <span>WORKSPACE</span></div><div className={styles.mark} aria-hidden="true">{status === 'unavailable' ? '!' : <span className={styles.spinner}/>}</div><h1>{status === 'unavailable' ? 'Your workspace could not be reached' : 'Opening your workspace…'}</h1>
    <p>{status === 'unavailable' ? 'Session verification took too long or the service is unavailable. Your data has not been changed.' : 'Checking your signed-in session.'}</p>
    {status === 'unavailable' && <button type="button" onClick={() => setAttempt(value => value + 1)} className={styles.retry}>Retry connection</button>}
  </div></section>}<div ref={container} hidden>{children}</div></>;
}
