'use client';
import { useEffect, useRef, useState } from 'react';
export default function CopyLink({ url = '', path = '' }) {
  const input = useRef(null);
  const [value, setValue] = useState(url);
  const [message, setMessage] = useState('');
  useEffect(() => { setValue(path ? `${window.location.origin}${path}` : url); setMessage(''); }, [path,url]);
  async function copy() {
    try { if (!navigator.clipboard?.writeText) throw new Error('Unavailable'); await navigator.clipboard.writeText(value); setMessage('Link copied.'); }
    catch { input.current?.focus(); input.current?.select(); setMessage('Copy was blocked. The link is selected; press Ctrl+C or use your device’s Copy option.'); }
  }
  return <div><div className="inviteCopy"><input ref={input} readOnly value={value} aria-label="Shareable link" onFocus={e => e.target.select()}/><button type="button" disabled={!value} onClick={copy}>{message === 'Link copied.' ? 'Copied' : 'Copy link'}</button></div><p role="status">{message}</p></div>;
}
