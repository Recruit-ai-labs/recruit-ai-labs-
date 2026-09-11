import Link from 'next/link';
import { notFound } from 'next/navigation';
import { canManageCandidates, getCandidateForWorkspace, getLatestResumeExtraction } from '../../../../../lib/recruit-data';
import { requireWorkspace } from '../../../../../lib/workspace-page';
import { AnalysisSubmit } from './AnalysisSubmit';
import { analyzeResumeAction, approveResumeAction, rejectResumeAction } from './actions';

const notices = {
  'confirmation-required': 'Confirm external AI processing before starting.',
  'already-processing': 'This resume is already being analyzed. Refresh shortly.',
  'missing-resume': 'Upload a PDF or DOCX resume before starting analysis.',
  'withdrawn': 'AI processing is disabled because this candidate withdrew consent.',
  'analysis-failed': 'The analysis did not complete. Review the failure below and retry.',
  'analysis-complete': 'Extraction complete. Review every fact before applying it.',
  approved: 'Review approved. Your selected facts were applied to the candidate profile.',
  rejected: 'The extraction was rejected and no profile fields were changed.',
  'stale-review': 'This review is no longer actionable. Refresh and inspect the latest result.',
  forbidden: 'You do not have permission to manage candidate data.',
};

const show = (value) => value === null || value === undefined || value === '' ? 'Not found' : String(value);
const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

function ApplyChoice({ name, label, value, existing }) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return null;
  return <label className="analysisApplyChoice"><input type="checkbox" name="applyField" value={name} /><span><b>{label}</b><small>Extracted: {Array.isArray(value) ? value.join(', ') : value}</small><em>Current: {Array.isArray(existing) ? existing.join(', ') || 'empty' : show(existing)}</em></span></label>;
}

export default async function ResumeAnalysisPage({ params, searchParams }) {
  const [{ candidateId }, query] = await Promise.all([params, searchParams]);
  const { workspace, membership } = await requireWorkspace();
  const candidate = await getCandidateForWorkspace(workspace.id, candidateId);
  if (!candidate) notFound();
  const extraction = await getLatestResumeExtraction(workspace.id, candidate.id);
  const canManage = canManageCandidates(membership);
  const data = extraction?.structured_data || null; const facts = data?.candidate || {};
  const extractedSkills = (data?.skills || []).map((item) => item.name).filter(Boolean);
  const canReview = canManage && extraction?.status === 'completed';
  const canAnalyze = canManage && candidate.resume && candidate.consent_status !== 'withdrawn' && extraction?.status !== 'processing';
  const filename = Array.isArray(candidate.resume) ? candidate.resume[0] : candidate.resume;
  return <div className="productPage resumeAnalysisPage">
    <Link className="backLink" href={`/dashboard/candidates/${candidate.id}`}>&larr; Back to candidate</Link>
    <header className="analysisHeader"><div><p className="pageEyebrow">EVIDENCE-BASED PROFILE</p><h1>Resume analysis</h1><p>AI extracts facts; a recruiter decides what becomes part of {candidate.preferred_name || candidate.first_name}&apos;s profile.</p></div>{extraction && <mark className={`analysisStatus ${extraction.status}`}>{extraction.status}</mark>}</header>
    {query?.notice && notices[query.notice] && <div className={`analysisNotice ${['approved', 'analysis-complete'].includes(query.notice) ? 'success' : ''}`} role="status">{notices[query.notice]}</div>}

    {!candidate.resume && <section className="surfaceCard analysisEmpty"><small>RESUME REQUIRED</small><h2>No resume is attached.</h2><p>Add a PDF or DOCX from the candidate profile before using evidence-based extraction.</p><Link className="primaryAction" href={`/dashboard/candidates/${candidate.id}/edit`}>Upload resume <span>&rarr;</span></Link></section>}

    {candidate.resume && (!extraction || ['failed', 'approved', 'rejected'].includes(extraction.status)) && <section className="analysisStartGrid"><article className="surfaceCard analysisStart"><small>{extraction ? 'RUN AGAIN' : 'START ANALYSIS'}</small><h2>Turn the resume into reviewable facts.</h2><p>The resume will be sent to the configured NVIDIA NIM model. Recruit AI stores structured facts and evidence—not the extracted full text.</p><dl><div><dt>File</dt><dd>{filename}</dd></div><div><dt>Candidate consent</dt><dd>{candidate.consent_status}</dd></div><div><dt>Automatic profile changes</dt><dd>None</dd></div></dl>{canAnalyze ? <form action={analyzeResumeAction}><input type="hidden" name="candidateId" value={candidate.id} /><label className="analysisConsent"><input type="checkbox" name="ai_processing_confirmed" value="yes" /><span><b>I am authorized to send this resume to the configured AI provider.</b><small>I understand a recruiter must review the result before profile changes.</small></span></label><AnalysisSubmit idle={extraction ? 'Analyze again' : 'Analyze resume'} pending="Analyzing resume..." /></form> : <p className="analysisBlocked">{candidate.consent_status === 'withdrawn' ? 'Processing blocked: consent was withdrawn.' : 'You do not have permission to run analysis.'}</p>}</article>{extraction?.status === 'failed' && <article className="surfaceCard analysisFailure"><small>LAST ATTEMPT FAILED</small><h2>{extraction.error_code?.replaceAll('_', ' ') || 'Analysis failed'}</h2><p>{extraction.error_message || 'No provider details were returned.'}</p><span>{new Date(extraction.updated).toLocaleString('en-IN')}</span></article>}</section>}

    {extraction?.status === 'processing' && <section className="surfaceCard analysisEmpty"><span className="analysisSpinner" /><small>PROCESSING</small><h2>Reading and structuring the resume.</h2><p>This can take up to two minutes. The request is protected against duplicate processing.</p></section>}

    {data && ['completed', 'approved', 'rejected'].includes(extraction.status) && <>
      <section className="analysisMeta"><div><small>MODEL</small><b>{extraction.model}</b></div><div><small>OVERALL CONFIDENCE</small><b>{percent(data.overall_confidence)}</b></div><div><small>INPUT</small><b>{Number(extraction.input_characters || 0).toLocaleString('en-IN')} characters</b></div><div><small>FILE FINGERPRINT</small><b>{extraction.source_sha256?.slice(0, 12)}…</b></div></section>
      {(extraction.warnings?.length || data.warnings?.length) > 0 && <section className="analysisWarnings"><b>Review warnings</b><ul>{[...new Set([...(extraction.warnings || []), ...(data.warnings || [])])].map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
      <div className="analysisGrid"><main>
        <section className="surfaceCard analysisSection"><div className="sectionTitle"><div><small>IDENTITY CHECK</small><h2>Extracted candidate</h2></div><strong>{percent(data.overall_confidence)}</strong></div><div className="analysisFacts"><div><span>Name</span><b>{show(facts.full_name)}</b><small>Profile: {[candidate.first_name, candidate.last_name].filter(Boolean).join(' ')}</small></div><div><span>Email</span><b>{show(facts.email)}</b><small>Profile: {candidate.email}</small></div><div><span>Phone</span><b>{show(facts.phone)}</b></div><div><span>Location</span><b>{show(facts.location)}</b></div><div><span>Current title</span><b>{show(facts.current_title)}</b></div><div><span>Current company</span><b>{show(facts.current_company)}</b></div></div><h3>Factual summary</h3><p className="longCopy">{show(facts.summary)}</p></section>
        <section className="surfaceCard analysisSection"><div className="sectionTitle"><div><small>CAREER EVIDENCE</small><h2>Experience</h2></div><span>{data.experience?.length || 0}</span></div>{data.experience?.length ? <div className="analysisTimeline">{data.experience.map((item, index) => <article key={`${item.company}-${item.title}-${index}`}><i /><div><h3>{show(item.title)}</h3><b>{show(item.company)}</b><span>{show(item.start_date)} – {item.current ? 'Present' : show(item.end_date)}{item.location ? ` · ${item.location}` : ''}</span>{item.highlights?.length > 0 && <ul>{item.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>}{item.evidence && <blockquote>“{item.evidence}”</blockquote>}</div></article>)}</div> : <p className="emptyCopy">No employment history was extracted.</p>}</section>
        <section className="surfaceCard analysisSection"><div className="sectionTitle"><div><small>QUALIFICATIONS</small><h2>Education & certifications</h2></div></div><div className="analysisQualificationList">{[...(data.education || []).map((item) => ({ title: item.degree || item.field, sub: item.institution, meta: [item.start_year, item.end_year].filter(Boolean).join(' – '), evidence: item.evidence })), ...(data.certifications || []).map((item) => ({ title: item.name, sub: item.issuer, meta: item.year, evidence: item.evidence }))].map((item, index) => <article key={`${item.title}-${index}`}><h3>{show(item.title)}</h3><b>{show(item.sub)}</b>{item.meta && <span>{item.meta}</span>}{item.evidence && <blockquote>“{item.evidence}”</blockquote>}</article>)}</div></section>
      </main><aside>
        <section className="surfaceCard analysisSection"><div className="sectionTitle"><div><small>SKILLS WITH PROOF</small><h2>Extracted skills</h2></div><span>{data.skills?.length || 0}</span></div><div className="analysisSkills">{data.skills?.map((skill) => <article key={skill.name}><div><b>{skill.name}</b><mark>{percent(skill.confidence)}</mark></div>{skill.evidence ? <q>{skill.evidence}</q> : <small>Evidence was not verified.</small>}</article>)}</div></section>
        <section className="surfaceCard analysisReview"><small>HUMAN REVIEW</small>{canReview ? <><h2>Choose what to apply.</h2><p>Nothing is selected by default. Identity fields remain read-only to avoid accidental record takeover.</p><form action={approveResumeAction}><input type="hidden" name="candidateId" value={candidate.id} /><input type="hidden" name="extractionId" value={extraction.id} /><ApplyChoice name="current_title" label="Current title" value={facts.current_title} existing={candidate.current_title} /><ApplyChoice name="current_company" label="Current company" value={facts.current_company} existing={candidate.current_company} /><ApplyChoice name="total_experience" label="Total experience" value={facts.total_experience_years} existing={candidate.total_experience} /><ApplyChoice name="location" label="Location" value={facts.location} existing={candidate.location} /><ApplyChoice name="phone" label="Phone" value={facts.phone} existing={candidate.phone} /><ApplyChoice name="summary" label="Summary" value={facts.summary} existing={candidate.summary} /><ApplyChoice name="skills" label="Merge skills" value={extractedSkills} existing={candidate.skills || []} /><AnalysisSubmit idle="Approve review" pending="Applying review..." /></form><form action={rejectResumeAction}><input type="hidden" name="candidateId" value={candidate.id} /><input type="hidden" name="extractionId" value={extraction.id} /><button className="analysisReject" type="submit">Reject extraction</button></form></> : <><h2>Review {extraction.status}.</h2><p>{extraction.status === 'approved' ? `Applied fields: ${extraction.applied_fields?.join(', ') || 'none'}.` : extraction.status === 'rejected' ? 'No extracted fields were applied.' : 'You can inspect this result, but cannot manage candidate records.'}</p>{extraction.reviewed_at && <small>{new Date(extraction.reviewed_at).toLocaleString('en-IN')}</small>}</>}</section>
      </aside></div>
    </>}
  </div>;
}
