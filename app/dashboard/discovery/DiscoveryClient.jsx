'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { publicDiscoveryResults } from '../../../lib/discovery-profile.mjs';
import './discovery-workspace.css';


const SAMPLE_JDS = [
  {
    title: 'Senior Full Stack Engineer',
    text: `Job Title: Senior Full Stack Engineer
Location: Remote / Bengaluru, India
Experience: 4+ Years

About the Role:
We are looking for an experienced Full Stack Engineer to architect and scale our AI-driven web applications. You will work across modern frontend frameworks and robust microservices backends.

Key Requirements:
- 4+ years of hands-on experience with React, Next.js, and TypeScript.
- Strong backend experience with Node.js, Python, or Go.
- Experience with relational and NoSQL databases (PostgreSQL, Redis, MongoDB).
- Familiarity with cloud platforms (AWS/GCP), CI/CD pipelines, and REST/GraphQL APIs.
- Experience integrating AI/LLM models or third-party APIs is a big plus.`,
  },
  {
    title: 'Senior AI / ML Engineer',
    text: `Job Title: Senior AI / ML Engineer
Location: San Francisco, CA / Remote
Experience: 3-6 Years

About the Role:
We are seeking an AI/ML Engineer to lead the design and deployment of large language model (LLM) pipelines, vector search, and agentic workflows.

Key Requirements:
- Strong proficiency in Python, PyTorch, LangChain, and LlamaIndex.
- Experience with model inference optimization, NVIDIA NIM, or TensorRT-LLM.
- Hands-on expertise with vector databases (Pinecone, Qdrant, Milvus).
- Production deployment experience with Docker, Kubernetes, and FastAPI.`,
  },
];

export default function DiscoveryClient({ maxCandidates = 5 }) {
  const router = useRouter();
  // Step tracker: 1 = JD Input, 2 = Review Extracted Criteria, 3 = Discover & Results
  const [step, setStep] = useState(1);

  // Form State
  const [jdText, setJdText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [candidateCount, setCandidateCount] = useState(maxCandidates);

  // Status & Results
  const [extracting, setExtracting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [selected, setSelected] = useState([]);
  const contactResults = results.filter(item => item?.candidate?.contact?.workEmail || item?.candidate?.contact?.phone);
  const reviewResults = results.filter(item => !(item?.candidate?.contact?.workEmail || item?.candidate?.contact?.phone));
  const orderedResults = [...contactResults, ...reviewResults];
  const toggleCandidate = (candidate) => setSelected((current) => current.some((item) => item.linkedin === candidate.url)
    ? current.filter((item) => item.linkedin !== candidate.url)
    : [...current, { name: candidate.name || 'Candidate', email: candidate.contact?.workEmail || '', linkedin: candidate.url || '' }]);
  const startOutreach = (channel) => {
    const params = new URLSearchParams({ channel });
    selected.forEach((candidate) => Object.entries(candidate).forEach(([key, value]) => params.append(key, value)));
    router.push(`/dashboard/outreach?${params.toString()}`);
  };

  // Quick-fill sample JD
  const handleLoadSample = (sample) => {
    setJdText(sample.text);
    setError(null);
  };

  // Step 1 -> Step 2: Auto-extract filters using NVIDIA NIM
  const handleExtractJd = async (e) => {
    e?.preventDefault();
    if (!jdText.trim()) {
      setError('Please paste or write a Job Description to proceed.');
      return;
    }

    setExtracting(true);
    setError(null);

    try {
      const res = await fetch('/api/discovery/extract-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText }),
      });

      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Failed to extract criteria from JD.');
      }

      const data = json.data;
      setJobTitle(data.jobTitle || '');
      setSkills(Array.isArray(data.skills) ? data.skills : []);
      setExperience(data.experience || '');
      setStep(2);
    } catch (err) {
      console.error('Extract error:', err);
      setError('Could not auto-extract with AI. You can still manually enter role details.');
      setJobTitle('');
      setSkills([]);
      setExperience('');
      setStep(2);
    } finally {
      setExtracting(false);
    }
  };

  // Add a skill tag manually
  const handleAddSkill = (e) => {
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
      setSkillInput('');
    }
  };

  // Remove a skill tag
  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Step 2 -> Step 3: Run candidate discovery
  const handleDiscover = async (e) => {
    e?.preventDefault();
    if (!jobTitle.trim()) {
      setError('Job Title is required.');
      return;
    }

    setSearching(true);
    setResults([]);
    setError(null);
    setStep(3);

    try {
      const res = await fetch('/api/discovery/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle,
          jdText: [jdText, experience ? `Relevant experience: ${experience}` : '', skills.length ? `Skills: ${skills.join(', ')}` : ''].filter(Boolean).join('\n'),
          skills,
          location: location.trim(),
          count: Math.min(Number(candidateCount) || maxCandidates, maxCandidates),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Discovery failed.');
      }

      const discovered = publicDiscoveryResults(json.results);
      if (!discovered.length) {
        setError('No public profiles were found. Try a broader job title, fewer skills, or leave location blank.');
      }
      setResults(discovered);
    } catch (err) {
      console.error('Discover error:', err);
      setError(err.message || 'Error occurred while discovering candidates.');
    } finally {
      setSearching(false);
    }
  };

  // Copy only the public profile and contact-free hiring brief.
  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { setError('Copy was blocked. Open the LinkedIn profile to continue.'); }
  };

  return <div className="discoveryPolished discoveryWorkspace">
    <header className="discoveryHeader"><div><span className="discoveryEyebrow">PUBLIC EVIDENCE / LINKEDIN DISCOVERY</span><h1>Find Quality Candidates</h1><p>Find relevant public profiles for your role. Review the evidence, then connect.</p></div>
      <nav className="discoverySteps" aria-label="Discovery steps">{[[1,'Job description'],[2,'Role & skills'],[3,'Find candidates']].map(([number,label])=><button key={number} type="button" aria-current={step===number?'step':undefined} disabled={searching||extracting||(number===2&&!jdText&&!jobTitle)||(number===3&&!jobTitle)} onClick={()=>setStep(number)}><span>{number}</span>{label}</button>)}</nav>
    </header>
    {error&&<div className="discoveryAlert" role="alert"><span>{error}</span><button type="button" onClick={()=>setError(null)}>Dismiss</button></div>}
    {step===1&&<section className="discoveryPanel">
      <span className="discoveryEyebrow">01 / THE ROLE</span><h2>Start with your job description.</h2><p className="discoveryHint">We'll extract a starting set of skills and experience for you to review.</p>
      <div className="discoverySamples"><span>Illustrative sample JDs</span>{SAMPLE_JDS.map(sample=><button key={sample.title} type="button" disabled={extracting} onClick={()=>handleLoadSample(sample)}>{sample.title}</button>)}</div>
      <form onSubmit={handleExtractJd}><label className="discoveryField" htmlFor="discovery-jd">Job description<textarea id="discovery-jd" value={jdText} disabled={extracting} maxLength={20000} onChange={event=>setJdText(event.target.value)} rows={9} placeholder="Paste the responsibilities, required skills and relevant experience…"/></label><small className="discoveryHint">{jdText.length.toLocaleString()} / 20,000 characters</small>
        <div className="discoveryActions"><button type="button" className="discoverySecondary" disabled={extracting} onClick={()=>{setJobTitle('');setSkills([]);setExperience('');setError(null);setStep(2);}}>Skip & Enter Manually</button><button className="discoveryPrimary" disabled={extracting||!jdText.trim()}>{extracting?'Reading the JD…':'Next: Review Filters →'}</button></div>
      </form>
    </section>}
    {step===2&&<section className="discoveryPanel">
      <span className="discoveryEyebrow">02 / YOUR SEARCH CRITERIA</span><h2>Define the person you're looking for.</h2><p className="discoveryHint">Review the details and refine the skills before searching.</p>
      <div className="discoveryFields"><label className="discoveryField" htmlFor="discovery-title">Job title<input id="discovery-title" maxLength={150} value={jobTitle} onChange={event=>setJobTitle(event.target.value)}/></label><label className="discoveryField" htmlFor="discovery-experience">Relevant experience<input id="discovery-experience" maxLength={100} value={experience} onChange={event=>setExperience(event.target.value)} placeholder="e.g. 3–5 years"/></label></div>
      <div className="discoverySkills"><label htmlFor="discovery-skill">Skills to look for</label><div className="discoveryTags">{skills.map(skill=><span key={skill}>{skill}<button type="button" aria-label={'Remove '+skill} onClick={()=>handleRemoveSkill(skill)}>×</button></span>)}</div><form className="discoverySkillForm" onSubmit={handleAddSkill}><input id="discovery-skill" value={skillInput} maxLength={80} onChange={event=>setSkillInput(event.target.value)} placeholder="Add a skill, then press Enter"/><button className="discoverySecondary">+ Add Skill</button></form></div>
      <div className="discoveryActions"><button className="discoverySecondary" onClick={()=>setStep(1)}>← Back to JD</button><button className="discoveryPrimary" disabled={!jobTitle.trim()} onClick={()=>setStep(3)}>Proceed to Location & Discovery →</button></div>
    </section>}
    {step===3&&<>
      <section className="discoveryPanel"><form onSubmit={handleDiscover} className="discoverySearchForm">
        <label className="discoveryField" htmlFor="discovery-search-role">Job role<input id="discovery-search-role" value={jobTitle} disabled={searching} maxLength={150} required onChange={event=>setJobTitle(event.target.value)}/></label>
        <label className="discoveryField" htmlFor="discovery-location">Location<input id="discovery-location" value={location} disabled={searching} maxLength={150} onChange={event=>setLocation(event.target.value)} placeholder="City or Remote"/></label>
        <label className="discoveryField" htmlFor="discovery-count">Profiles<select id="discovery-count" value={candidateCount} disabled={searching} onChange={event=>setCandidateCount(Number(event.target.value))}>{[5, ...(maxCandidates > 5 ? [10] : [])].map(value=><option key={value} value={value}>{value} profiles</option>)}</select></label>
        <button className="discoveryPrimary" disabled={searching||!jobTitle.trim()}>{searching?'Searching…':'Find Talent →'}</button>
      </form><div className="discoverySearchMeta"><span>{skills.length?skills.join(' · '):'All relevant skills'}</span><button type="button" disabled={searching} onClick={()=>setStep(2)}>Edit role & skills</button></div></section>
      {searching?<div className="discoveryEmpty" role="status"><span className="discoverySpinner" aria-hidden="true"/><h2>Looking for relevant LinkedIn profiles…</h2><p>Searching public evidence and preparing hiring briefs.</p></div>:results.length?<section aria-label="Discovered candidates">
        <div className="discoveryResultsHead"><div><h2>Discovered Candidates <span>{results.length}</span></h2><p>LinkedIn search results · Select people to start outreach</p></div>{selected.length>0&&<div className="discoveryOutreachBar" role="status"><b>{selected.length} selected</b><button type="button" className="discoverySecondary" onClick={()=>startOutreach('linkedin')}>Message on LinkedIn</button><button type="button" className="discoveryPrimary" disabled={selected.every(item=>!item.email)} onClick={()=>startOutreach('email')}>Compose email</button></div>}</div>
        <div className="discoveryCards">{orderedResults.map((item,idx)=>{const c=item.candidate,dna=item.techDna,isSelected=selected.some(person=>person.linkedin===c.url);return <Fragment key={c.url}>{idx===0&&contactResults.length>0&&<div className="discoveryCategoryHeading"><h3>Contact available <span>{contactResults.length}</span></h3><p>Verified Prospeo email or phone</p></div>}{idx===contactResults.length&&reviewResults.length>0&&<div className="discoveryCategoryHeading"><h3>Public profiles to review <span>{reviewResults.length}</span></h3><p>No verified contact returned yet</p></div>}<article className={`discoveryProfile ${isSelected?'isSelected':''}`}>
          <header><span className="discoveryAvatar" aria-hidden="true">{c.name?.charAt(0)||'C'}</span><div><h3>{c.name||'LinkedIn profile'}</h3><p>{c.title}{c.company?' · '+c.company:''}</p>{c.location&&<small>{c.location}</small>}</div><span className="discoverySource">LinkedIn</span></header>
          <div className="discoveryContact">{(c.contact?.workEmail||c.contact?.phone)?<><span>Prospeo contact</span>{c.contact.workEmail&&<a href={'mailto:'+c.contact.workEmail}>{c.contact.workEmail}</a>}{c.contact.phone&&<a href={'tel:'+c.contact.phone}>{c.contact.phone}</a>}<small>Verified contact details</small></>:<small>Verified email or phone not available for this profile.</small>}</div>
          <div className="discoveryBrief"><h4>Public evidence hiring brief</h4><p>{dna||'Review the public profile to verify job-related experience.'}</p></div>
          <footer><label className="discoverySelect"><input type="checkbox" checked={isSelected} onChange={()=>toggleCandidate(c)}/><span>{isSelected?'Selected':'Select for outreach'}</span></label><a className="discoveryPrimary" href={c.url} target="_blank" rel="noopener noreferrer">Open LinkedIn ↗</a><button className="discoverySecondary" type="button" onClick={()=>handleCopy(['Candidate: '+c.name,'Role: '+c.title,c.contact?.workEmail?'Email: '+c.contact.workEmail:'','LinkedIn: '+c.url,'Public evidence:',dna].filter(Boolean).join('\n'),'card-'+idx)}>{copiedId==='card-'+idx?'Copied Summary!':'Copy Summary'}</button></footer>
        </article></Fragment>})}</div>
      </section>:<div className="discoveryEmpty"><span aria-hidden="true">◎</span><h2>{error?'No profiles to show yet':'Your next conversation starts here.'}</h2><p>{error?'Try a broader title, fewer skills or another location.':'Choose your location and select Find Talent to search public LinkedIn profiles.'}</p></div>}
    </>}
  </div>;
}

