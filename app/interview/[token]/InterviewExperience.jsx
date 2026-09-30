'use client';
import { useEffect, useRef, useState } from 'react';
import SireenVisualizer from './SireenVisualizer';

export default function InterviewExperience({ token, role, mission }) {
  const [step, setStep] = useState('loading');
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const [deviceReady, setDeviceReady] = useState(false);
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [speechPulse, setSpeechPulse] = useState(0);
  const utterance = useRef(null);
  const spokenQuestion = useRef(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechConsent, setSpeechConsent] = useState(false);
  const [details, setDetails] = useState({ first_name: '', last_name: '', email: '' });
  const [resumeText, setResumeText] = useState('');
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const video = useRef(null), stream = useRef(null), audio = useRef(null), frame = useRef(null);
  const recognition = useRef(null), active = useRef(false), pendingIncident = useRef(null), incidentPromise = useRef(null);
  const endpoint = `/api/sireen/${token}`;
  async function request(body) {
    const response = await fetch(endpoint, body ? { method: 'POST', credentials: 'same-origin', headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' }, body: body instanceof FormData ? body : JSON.stringify(body) } : { cache: 'no-store' });
    const result = await response.json().catch(() => { throw new Error('The connection returned an incomplete response. Your submitted answers are safe. Please retry.'); });
    if (!response.ok) throw new Error(result.error || 'Connection interrupted. Please retry.');
    return result;
  }
  function stopDevices() {
    active.current = false;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    cancelAnimationFrame(frame.current); audio.current?.close().catch(() => {}); audio.current = null;
    recognition.current?.abort(); window.speechSynthesis?.cancel(); setSpeaking(false);
  }
  function applyState(next) {
    setSession(next);
    if (['completed','terminated'].includes(next.status)) {
      stopDevices(); setStep('done');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }
  async function reportIncident(kind) {
    if (incidentPromise.current) return incidentPromise.current;
    active.current = false; recognition.current?.stop(); window.speechSynthesis?.cancel(); setSpeaking(false);
    pendingIncident.current = pendingIncident.current || kind;
    setSession(old => old ? { ...old, status: 'paused' } : old);
    incidentPromise.current = request({ action: 'event', kind: pendingIncident.current }).then(next => {
      pendingIncident.current = null; applyState(next);
    }).catch(e => { setError(`${e.message} The interview remains paused until the incident is saved.`); throw e; }).finally(() => { incidentPromise.current = null; });
    return incidentPromise.current;
  }
  useEffect(() => {
    let disposed = false;
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    request().then(async next => {
      if (disposed) return;
      applyState(next);
      if (!next.registered) setStep('details');
      else if (!['completed','terminated'].includes(next.status)) {
        setStep('devices');
        if (next.status === 'active') await reportIncident('fullscreen_exit');
      }
    }).catch(e => { if (!disposed) { setError(e.message); setStep('load-error'); } });
    return () => { disposed = true; stopDevices(); };
  }, []);
  useEffect(() => { if (video.current && stream.current) video.current.srcObject = stream.current; }, [step, deviceReady]);
  useEffect(() => {
    const onFullscreen = () => { if (active.current && !document.fullscreenElement) reportIncident('fullscreen_exit').catch(() => {}); };
    const onVisibility = () => { if (active.current && document.hidden) reportIncident('tab_hidden').catch(() => {}); };
    const onBlur = () => { if (active.current) reportIncident('window_blur').catch(() => {}); };
    const beforeUnload = e => { if (active.current) { e.preventDefault(); e.returnValue = ''; } };
    document.addEventListener('fullscreenchange', onFullscreen); document.addEventListener('visibilitychange', onVisibility); window.addEventListener('blur', onBlur); window.addEventListener('beforeunload', beforeUnload);
    return () => { document.removeEventListener('fullscreenchange', onFullscreen); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', onBlur); window.removeEventListener('beforeunload', beforeUnload); };
  }, []);
  useEffect(() => { if (step === 'done' && session && !session.analysisReady) request({ action: 'analyze' }).then(applyState).catch(() => {}); }, [step]);
  async function run(fn) { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function register(e) {
    e.preventDefault();
    await run(async () => {
      const form = new FormData(); Object.entries(details).forEach(([k,v]) => form.set(k,v));
      form.set('resume_text', resumeText); form.set('consent', consent ? 'yes' : 'no'); if (file) form.set('resume',file);
      applyState(await request(form)); setStep('intro');
    });
  }
  async function checkDevices() {
    await run(async () => {
      if (!navigator.mediaDevices?.getUserMedia || !document.documentElement.requestFullscreen) throw new Error('Use a desktop browser with camera, microphone and fullscreen support. Contact your recruiter for an accessible alternative.');
      stopDevices(); setDeviceReady(false);
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: true });
        stream.current.getTracks().forEach(track => { track.onended = () => { setDeviceReady(false); if (active.current) reportIncident('device_lost').catch(() => {}); }; });
        const Context = window.AudioContext || window.webkitAudioContext;
        audio.current = new Context(); await audio.current.resume();
        const analyser = audio.current.createAnalyser(); analyser.fftSize = 256; audio.current.createMediaStreamSource(stream.current).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => { analyser.getByteFrequencyData(data); setLevel(Math.min(100, Math.round(data.reduce((a,b) => a+b,0) / data.length * 2))); frame.current = requestAnimationFrame(tick); }; tick(); setDeviceReady(true);
      } catch { stopDevices(); throw new Error('Camera or microphone access failed. Allow both in your browser settings, connect your devices and try again.'); }
    });
  }
  async function start() {
    // Request fullscreen directly from the click, before any network await.
    if (!deviceReady) { setStep('devices'); return; }
    setBusy(true); setError('');
    try {
      await document.documentElement.requestFullscreen();
      if (pendingIncident.current) await reportIncident(pendingIncident.current);
      const next = await request({ action: session?.status === 'ready' ? 'start' : 'resume' });
      applyState(next);
      if (next.status !== 'active') return;
      setStep('interview'); active.current = true;
      if (!document.fullscreenElement || document.hidden) { await reportIncident('fullscreen_exit'); return; }
      if (!next.question) applyState(await request({ action: 'advance' }));
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function submitAnswer(e) {
    e.preventDefault(); recognition.current?.stop(); window.speechSynthesis?.cancel(); setSpeaking(false);
    await run(async () => {
      if (!active.current || !document.fullscreenElement) throw new Error('Resume fullscreen before submitting.');
      const next = await request({ action: 'answer', question_id: session.question.id, answer });
      setAnswer(''); applyState(next);
      if (next.status === 'active') applyState(await request({ action: 'advance' }));
    });
  }
  function dictate() {
    if (listening) { recognition.current?.stop(); return; }
    window.speechSynthesis?.cancel(); setSpeaking(false);
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Recognition(); recognition.current = rec; rec.lang = 'en-IN'; rec.continuous = true;
    rec.onresult = e => { let text = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript + ' '; setAnswer(old => (old + ' ' + text).trim().slice(0,12000)); };
    rec.onerror = () => { setError('Dictation unavailable. You can type or edit your answer below.'); setListening(false); };
    rec.onend = () => setListening(false); rec.start(); setListening(true);
  }
  function readQuestion() {
    recognition.current?.stop(); window.speechSynthesis?.cancel(); setSpeaking(false);
    if (!session?.question || !window.speechSynthesis || session.status !== 'active') return;
    const speech = new SpeechSynthesisUtterance(session.question.prompt);
    utterance.current = speech; speech.lang = 'en-IN'; speech.rate = .94;
    speech.onstart = () => { if (utterance.current === speech) { setSpeaking(true); setSpeechPulse(performance.now()); } };
    speech.onboundary = () => { if (utterance.current === speech) setSpeechPulse(performance.now()); };
    speech.onend = speech.onerror = () => { if (utterance.current === speech) { setSpeaking(false); utterance.current = null; } };
    window.speechSynthesis.speak(speech);
  }
  useEffect(() => {
    if (step === 'interview' && session?.status === 'active' && session?.question?.id && spokenQuestion.current !== session.question.id) {
      spokenQuestion.current = session.question.id; readQuestion();
    }
  }, [step, session?.status, session?.question?.id]);
  const steps = ['Your details','Resume','Meet Sireen','Instructions','Device check'];
  const stepIndex = ['details','resume','intro','instructions','devices'].indexOf(step);
  return <main className={`sireenShell ${step === 'interview' ? 'sireenActive' : ''}`}><header className="sireenTopbar"><a href="/" aria-label="Recruit AI home">recruit<span>ai</span><i>/</i><b>Sireen</b></a><span className="dnaPill">{role}</span></header>
    {stepIndex >= 0 && <nav aria-label="Interview preparation" className="sireenSteps">{steps.map((label,i) => <span key={label} aria-current={i===stepIndex?'step':undefined} className={i <= stepIndex ? 'isCurrent':''}><b>{i+1}</b>{label}</span>)}</nav>}
    {error && <div className="dnaAlert" role="alert">{error}</div>}
    {step === 'loading' && <section className="dnaCard"><h1>Preparing your interview…</h1></section>}
    {step === 'load-error' && <button className="dnaButton" onClick={() => window.location.reload()}>Retry loading interview</button>}
    {step === 'details' && <section className="sireenPrep"><div><span className="dnaEyebrow">YOUR NEXT CHAPTER</span><h1>Let your work<br/>do the talking.</h1><p>{mission}</p><p>Five thoughtful questions. A conversation shaped around your experience.</p></div><form className="dnaCard dnaForm" onSubmit={e => {e.preventDefault();setStep('resume');}}><h2>First, a little about you.</h2><p>Your information is shared with the hiring team for this role.</p>{[['first_name','First name','text'],['last_name','Last name','text'],['email','Email address','email']].map(([key,label,type]) => <label key={key}>{label}<input type={type} required={key!=='last_name'} maxLength={key==='email'?254:100} autoComplete={key==='email'?'email':key==='first_name'?'given-name':'family-name'} value={details[key]} onChange={e => setDetails({...details,[key]:e.target.value})}/></label>)}<button className="dnaButton">Continue to resume →</button></form></section>}
    {step === 'resume' && <form className="dnaCard sireenNarrow dnaForm" onSubmit={register}><span className="dnaEyebrow">YOUR EXPERIENCE, IN YOUR WORDS</span><h1>Give Sireen some context.</h1><p>Your resume shapes the opening question. We save its extracted text with your interview, not the original document.</p><label>Resume file (PDF or DOCX, maximum 2 MB)<input type="file" accept=".pdf,.docx" onChange={e => { const f=e.target.files?.[0]; if(f && f.size>2*1024*1024){setError('Choose a file smaller than 2 MB.');e.target.value='';setFile(null);}else{setFile(f || null);setError('');} }}/></label>{file && <small>Selected: {file.name}</small>}<label>Or paste your resume / project experience<textarea rows={8} maxLength={24000} minLength={file?undefined:80} required={!file} value={resumeText} onChange={e=>setResumeText(e.target.value)} placeholder="Include your projects, responsibilities, skills and outcomes."/></label><label className="dnaCheck"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree to share my details, resume text and answers with this hiring team for AI-assisted, human-reviewed evaluation. I understand that fullscreen and focus interruptions are logged. Camera and microphone are checked locally; no video or audio recording is stored. <a href="/privacy" target="_blank" rel="noreferrer">Privacy notice</a></span></label><div className="dnaBetween"><button type="button" className="dnaTextButton" disabled={busy} onClick={()=>setStep('details')}>← Back</button><button className="dnaButton" disabled={busy}>{busy?'Saving your application…':'Meet Sireen →'}</button></div></form>}
    {step === 'intro' && <section className="dnaCard sireenNarrow sireenIntro"><SireenVisualizer/><span className="dnaEyebrow">YOUR AI INTERVIEWER</span><h1>Hi {details.first_name}. I’m Sireen.</h1><p>I’ll start with your experience, listen to your answers and ask follow-up questions to understand how you approach the work.</p><p>Take your time. Concrete examples, your own contribution and what you learned help the hiring team understand your skills.</p><button className="dnaButton" onClick={()=>setStep('instructions')}>How the interview works →</button></section>}
    {step === 'instructions' && <section className="dnaCard sireenNarrow"><span className="dnaEyebrow">BEFORE WE BEGIN</span><h1>A few things to know.</h1><ol className="sireenRules"><li><b>Five questions, one at a time.</b><p>Each follow-up builds on your previous answers and the role. Review your text before submitting; submitted answers cannot be edited.</p></li><li><b>Stay in fullscreen.</b><p>Leaving fullscreen, switching tabs or losing window focus pauses the interview. Three distinct incidents end the session for recruiter review. These events are not proof of cheating.</p></li><li><b>Make it your own.</b><p>Use your own experience. You can type, or use optional browser dictation and edit the transcript. There is no scoring for accent or speaking speed.</p></li><li><b>Check your setup.</b><p>Camera and microphone permission is required. Their media is not recorded. If fullscreen or device access is not accessible to you, ask your recruiter for an alternative before starting.</p></li><li><b>Your progress is saved.</b><p>Use this browser to return to the interview. Reloading an active interview counts as an interruption. AI/network errors can be retried without losing submitted answers.</p></li></ol><button className="dnaButton" onClick={()=>setStep('devices')}>Continue to device check →</button></section>}
    {step === 'devices' && <section className="dnaCard sireenNarrow"><span className="dnaEyebrow">SOUND CHECK</span><h1>Get comfortable.</h1><p>Allow your camera and microphone. Speak a few words and check the input meter before starting.</p><video className="sireenPreview" ref={video} autoPlay playsInline muted aria-label="Your camera preview"/><div className="dnaMeter"><span style={{width:`${level}%`}}/></div><p role="status">{deviceReady?'Devices connected. Check that you can see yourself and the microphone meter responds.':'Your preview appears after you allow access.'}</p><div className="dnaBetween"><button className="dnaTextButton" disabled={busy} onClick={checkDevices}>{deviceReady?'Check devices again':'Enable camera & microphone'}</button><button className="dnaButton" disabled={busy || !deviceReady} onClick={start}>{busy?'Preparing Sireen…':session?.answered?'Resume in fullscreen':'Start in fullscreen →'}</button></div></section>}
    {step === 'interview' && <div className="sireenRoom"><section className="dnaCard sireenConversation"><div className="dnaBetween"><span className="dnaEyebrow">SIREEN / LIVE INTERVIEW</span><span className="dnaPill">{session?.answered || 0} / 5 answered</span></div><div className="sireenProgress" aria-label={`${session?.answered || 0} of 5 questions answered`}>{Array.from({length:5},(_,i)=><span key={i} className={i<(session?.answered || 0)?'complete':''}/>)}</div>{session?.status==='paused'?<div className="sireenPaused"><span className="dnaEyebrow">INTERVIEW PAUSED</span><h1>Let’s return to the conversation.</h1><p>Your submitted answers are safe. {session.events} of 3 interruptions recorded.</p><button className="dnaButton" disabled={busy} onClick={start}>Resume in fullscreen</button></div>:<><SireenVisualizer speaking={speaking} pulse={speechPulse} thinking={busy && !session?.question}/><div className="sireenQuestion"><div><small>Sireen asks · Question {Math.min(5,(session?.answered || 0)+1)}</small><h1>{session?.question?.prompt || 'Preparing your next question…'}</h1></div></div>{session?.question?<form onSubmit={submitAnswer} className="dnaForm"><div className="dnaBetween"><label htmlFor="sireen-answer">Your answer</label><button type="button" className="dnaTextButton" onClick={() => { if (speaking) { utterance.current = null; window.speechSynthesis?.cancel(); setSpeaking(false); } else readQuestion(); }}>{speaking ? 'Stop reading' : 'Read question aloud'}</button></div><textarea id="sireen-answer" rows={5} value={answer} required maxLength={12000} disabled={busy} onChange={e=>setAnswer(e.target.value)} placeholder="Walk through your approach, decisions and results…"/>{speechSupported && <><label className="dnaCheck"><input type="checkbox" checked={speechConsent} onChange={e=>{setSpeechConsent(e.target.checked);if(!e.target.checked)recognition.current?.stop();}}/><span>Enable optional dictation. Your browser may send audio to its speech provider. You can type instead.</span></label><button type="button" className="dnaTextButton" disabled={busy || !speechConsent} onClick={dictate}>{listening?'Stop dictation':'Dictate answer'}</button></>}<div className="dnaBetween"><small>{answer.length} / 12,000 characters · Review before submitting</small><button className="dnaButton" disabled={busy || !answer.trim()}>{busy?'Saving & listening…':session.answered===4?'Finish interview':'Submit answer →'}</button></div></form>:<button className="dnaButton" disabled={busy} onClick={()=>run(async()=>applyState(await request({action:'advance'})))}>{busy?'Sireen is thinking…':'Retry question'}</button>}</>}</section><aside><section className="dnaCard"><video className="sireenPreview" ref={video} autoPlay playsInline muted aria-label="Your camera preview"/><span className="dnaEyebrow">YOU / PRIVATE PREVIEW</span><p>Video and audio are not recorded.</p></section><section className="dnaCard"><span className="dnaEyebrow">SESSION FOCUS</span><h3>{session?.events || 0} / 3 interruptions</h3><p>Stay in this window. Your answers matter more than perfect delivery.</p></section></aside></div>}
    {step === 'done' && <section className="dnaCard sireenNarrow sireenIntro"><div className="sireenOrb" aria-hidden="true">{session?.status==='terminated'?'!':'✓'}</div><span className="dnaEyebrow">{session?.status==='terminated'?'SESSION ENDED / REVIEW REQUIRED':'INTERVIEW COMPLETE'}</span><h1>{session?.status==='terminated'?'Your recruiter will review this session.':'You’ve done your part.'}</h1><p>{session?.status==='terminated'?'Three session interruptions were recorded. This is not a determination of cheating; the hiring team can review the event history and your answers.':'Thank you for sharing your experience. Your answers are saved and your hiring team can review them alongside your role-specific Tech DNA.'}</p><p>{session?.answered || 0} answers saved. You can close this page.</p></section>}
    <footer className="sireenFooter">Powered by Recruit AI <span>Evidence before assumptions.</span></footer>
  </main>;
}
