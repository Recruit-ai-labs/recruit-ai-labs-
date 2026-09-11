'use client';
import { useMemo, useState } from 'react';
import { normalizeBrief } from '../../../lib/discovery-core.mjs';
import { parseDiscoveryAction, runDiscoveryAction, analyzeTechDNAAction } from './actions';
import './discovery.css';
import './funnel.css';

const operations = { parse: parseDiscoveryAction, search: runDiscoveryAction, techDNA: analyzeTechDNAAction };
const blank = { title: '', required: '', preferred: '', minExperience: '' };

function ContactDetails({ lead }) {
  const emails = lead.contacts?.emails || [], phones = lead.contacts?.phones || [];
  return <div className="discoveryContacts"><span><b>Email</b>{emails.length ? emails.map(email => <a key={email} href={`mailto:${email}`}>{email}</a>) : <em>Not available in indexed result</em>}</span><span><b>Phone</b>{phones.length ? phones.map(phone => <a key={phone} href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a>) : <em>Not available in indexed result</em>}</span></div>;
}

function TechDNA({ lead, brief, api }) {
  const [busy, setBusy] = useState(false), [report, setReport] = useState(null), [error, setError] = useState('');
  if (!/linkedin\.com\/in\//i.test(lead.url)) return <p className="discoverySmall">Detailed Tech DNA is available for LinkedIn profiles.</p>;
  async function inspect() {
    setBusy(true); setError('');
    try { const response = await api.techDNA({ linkedin: lead.url, name: lead.title.split(/[-|]/)[0].trim(), brief }); if (response?.error) setError(response.error); else setReport(response); }
    catch { setError('Tech DNA analysis could not finish. Retry.'); }
    finally { setBusy(false); }
  }
  return <div className="discoveryTechDNA"><button type="button" disabled={busy} onClick={inspect}>{busy ? 'Building Tech DNA…' : report ? 'Refresh Tech DNA' : 'View detailed Tech DNA'}</button>{error && <p className="discoveryError" role="alert">{error}</p>}{report && <section className="discoveryDNA"><div><b>{report.verdict.replaceAll('-', ' ')}</b><small>Model: {report.model}</small></div><p>{report.summary || 'No grounded summary was returned.'}</p><h4>JD evidence</h4>{report.requirements.map(item => <article key={item.skill}><b>{item.skill} · {item.status}</b><p>{item.evidence || 'No reliable public evidence found.'}</p>{item.source && <a href={item.source.url} target="_blank" rel="noopener noreferrer">Evidence source ↗</a>}</article>)}{report.signals.length > 0 && <><h4>Technical signals</h4>{report.signals.map((item, i) => <blockquote key={i}><b>{item.label}</b><p>{item.evidence}</p><a href={item.source.url} target="_blank" rel="noopener noreferrer">Source ↗</a></blockquote>)}</>}{report.risks.length > 0 && <><h4>Evidence risks</h4><ul>{report.risks.map(x => <li key={x}>{x}</li>)}</ul></>}{report.nextChecks.length > 0 && <><h4>Verify next</h4><ul>{report.nextChecks.map(x => <li key={x}>{x}</li>)}</ul></>}</section>}</div>;
}

export default function DiscoveryWorkspace({ capabilities = {}, warnings = [], api = operations }) {
  const [brief, setBrief] = useState(blank), [jd, setJD] = useState(''), [file, setFile] = useState(null), [location, setLocation] = useState('');
  const [result, setResult] = useState(null), [busy, setBusy] = useState(''), [notice, setNotice] = useState(''), [error, setError] = useState(''), [visible, setVisible] = useState(20);
  const leads = useMemo(() => [...(result?.web?.leads || [])].sort((a, b) => (b.match?.percentage || 0) - (a.match?.percentage || 0) || (a.position || 999) - (b.position || 999)), [result]);
  function update(name, value) { setResult(null); setBrief(current => ({ ...current, [name]: value })); }
  async function perform(name, task, success) { setBusy(name); setError(''); setNotice(''); try { const response = await task(); if (response?.error) setError(response.error); else success(response); } catch { setError('This request could not finish. Your inputs are preserved; please retry.'); } finally { setBusy(''); } }
  function extractJD() { const data = new FormData(); data.set('text', jd); if (file) data.set('file', file); perform('parse', () => api.parse(data), response => { setBrief({ ...response.brief, required: response.brief.required.join('\n'), preferred: response.brief.preferred.join('\n'), minExperience: response.brief.minExperience ?? '' }); setNotice('JD parsed. Review the filters, add a location, then search.'); }); }
  function search(event) { event.preventDefault(); let normalized; try { normalized = normalizeBrief(brief); if (location.trim().length < 2) throw new Error('Enter a location to search.'); } catch (cause) { setError(cause.message); return; } setVisible(20); setResult(null); perform('search', () => api.search({ brief: normalized, location: location.trim() }), setResult); }
  return <div className="productPage discoveryWorkspace">
    <header className="discoveryHeader"><div><p className="pageEyebrow">CANDIDATE DISCOVERY · WEB</p><h1>Discover candidates.<br/><em>Ranked for your JD.</em></h1><p>Upload a job description, refine the filters, choose a location and search the public web.</p></div><div className="discoveryStatus"><span>Web search <b>{capabilities.web ? 'Serper connected' : 'Not configured'}</b></span><span>JD & Tech DNA <b>{capabilities.ai ? 'AI connected' : 'Not configured'}</b></span><small>Contact details appear only when present in indexed public results.</small></div></header>
    {warnings.map(item => <p className="discoveryNotice" key={item}>{item}</p>)}
    <div className="discoveryLayout"><aside className="discoverySetup"><form onSubmit={search}><fieldset disabled={Boolean(busy)}>
      <section className="discoverySection"><div className="discoverySectionTitle"><span>01</span><h2>Upload job description</h2></div><label>JD file (TXT, PDF or DOCX · up to 750 KB)<input type="file" accept=".txt,.pdf,.docx" onChange={event => setFile(event.target.files?.[0] || null)}/></label><label>Or paste job description<textarea rows="5" maxLength={20000} value={jd} onChange={event => setJD(event.target.value)} placeholder="Paste the role and requirements…"/></label><button type="button" className="discoverySecondary" disabled={!capabilities.ai || (!file && jd.trim().length < 80)} onClick={extractJD}>{busy === 'parse' ? 'Reading JD…' : 'Extract filters'}</button></section>
      <section className="discoverySection"><div className="discoverySectionTitle"><span>02</span><h2>Review filters</h2></div><label>Role title<input required maxLength="160" value={brief.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Frontend developer"/></label><label>Required skills<textarea required rows="3" maxLength={2200} value={brief.required} onChange={event => update('required', event.target.value)} placeholder={'React\nJavaScript'}/><small>One skill per line or comma-separated.</small></label><label>Preferred skills<textarea rows="2" maxLength={2200} value={brief.preferred} onChange={event => update('preferred', event.target.value)} placeholder="Optional skills"/></label><label>Minimum experience<input type="number" min="0" max="60" step="0.5" value={brief.minExperience} onChange={event => update('minExperience', event.target.value)} placeholder="Years"/></label></section>
      <section className="discoverySection"><div className="discoverySectionTitle"><span>03</span><h2>Location</h2></div><label>City, state or country<input required maxLength="160" value={location} onChange={event => { setResult(null); setLocation(event.target.value); }} placeholder="e.g. Bengaluru, Karnataka"/></label></section>
      <button className="discoveryRun" type="submit" disabled={!capabilities.web || Boolean(busy)}>{busy === 'search' ? 'Searching Serper…' : <>Search candidates <span>→</span></>}</button>
    </fieldset></form></aside>
    <section className="discoveryResults" aria-label="Discovery results" aria-busy={Boolean(busy)}><div aria-live="polite">{notice && <p className="discoveryNotice">{notice}</p>}{error && <p className="discoveryError" role="alert">{error}</p>}</div>
      {!result ? <section className="discoveryWelcome"><div className="discoveryOrbit" aria-hidden="true">◎</div><p className="pageEyebrow">SIMPLE WEB DISCOVERY</p><h2>JD in. Candidates out.</h2><p>Your results will include every unique organic result returned by Serper, ordered by JD evidence.</p><div><span>01 <b>Upload JD</b></span><span>02 <b>Apply filters</b></span><span>03 <b>Set location & search</b></span></div></section> : <>
        <header className="discoveryResultHeading"><div><p className="pageEyebrow">TECH DNA LEADERBOARD</p><h2>{leads.length} web results</h2><p>{result.brief.title} · {result.location} · ranked by indexed JD skill evidence</p></div><span className="discoveryPill">Serper results</span></header>
        {!result.web.complete && <p className="discoveryNotice">Some Serper queries could not finish. The successful results are shown below.</p>}
        {leads.length ? <div className="discoveryLeaderboard">{leads.slice(0, visible).map((lead, index) => <article className="discoveryCandidate" key={lead.url}><div className="discoveryCandidateHeading"><div className="discoveryRank">#{index + 1}</div><div><h3><a href={lead.url} target="_blank" rel="noopener noreferrer">{lead.title} ↗</a></h3><p>{lead.displayLink || new URL(lead.url).hostname} · Serper position {lead.position || '—'}</p></div><strong className="discoveryScore">{lead.match?.percentage || 0}%<small>JD match</small></strong></div><p>{lead.snippet || 'No indexed description available.'}</p><div className="discoveryTags">{result.brief.required.map(skill => <span key={skill} className={lead.match?.skills?.includes(skill) ? 'hasEvidence' : ''}>{skill}<small>{lead.match?.skills?.includes(skill) ? 'Indexed evidence' : 'Not found'}</small></span>)}</div><ContactDetails lead={lead}/><div className="discoveryMeta"><span><b>Source</b>{lead.channels?.join(', ') || 'Web'}</span>{lead.date && <span><b>Indexed date</b>{lead.date}</span>}<span><b>URL</b><a href={lead.url} target="_blank" rel="noopener noreferrer">{lead.url}</a></span></div><TechDNA lead={lead} brief={result.brief} api={api}/></article>)}</div> : <p className="discoveryEmpty">No public results found. Try a broader location or fewer required skills.</p>}
        {leads.length > visible && <button className="discoveryMore" onClick={() => setVisible(value => value + 20)}>Show 20 more</button>}
        <details className="discoveryCoverageDetails"><summary>Serper search coverage</summary>{result.web.searches.map(item => <article key={item.channel}><b>{item.channel}: {item.error || `${item.count} results`}</b><p>{item.query}</p></article>)}</details>
      </>}
    </section></div>
  </div>;
}
