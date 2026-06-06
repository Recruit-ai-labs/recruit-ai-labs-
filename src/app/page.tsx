'use client'
import Link from 'next/link'
import { useEffect, useRef, useState, useCallback, MouseEvent } from 'react'
import { motion, useMotionValue, useSpring, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'

function MouseFollower() {
  const cx = useMotionValue(-100), cy = useMotionValue(-100), rx = useMotionValue(-100), ry = useMotionValue(-100), gx = useMotionValue(-100), gy = useMotionValue(-100)
  const dx = useSpring(cx, { damping: 30, stiffness: 300 }), dy = useSpring(cy, { damping: 30, stiffness: 300 })
  const sx = useSpring(rx, { damping: 20, stiffness: 200 }), sy = useSpring(ry, { damping: 20, stiffness: 200 })
  const ex = useSpring(gx, { damping: 15, stiffness: 100 }), ey = useSpring(gy, { damping: 15, stiffness: 100 })
  const [h, setH] = useState(false)
  useEffect(() => {
    const m = (e: globalThis.MouseEvent) => { cx.set(e.clientX); cy.set(e.clientY); rx.set(e.clientX); ry.set(e.clientY); gx.set(e.clientX); gy.set(e.clientY) }
    const o = () => setH(true), u = () => setH(false)
    window.addEventListener('mousemove', m)
    const a = () => document.querySelectorAll('a, button, [data-hover]').forEach(el => { el.addEventListener('mouseenter', o); el.addEventListener('mouseleave', u) })
    a(); const i = setInterval(a, 2000)
    return () => { window.removeEventListener('mousemove', m); clearInterval(i) }
  }, [cx, cy, rx, ry, gx, gy])
  return (<><motion.div className="mouse-dot hidden md:block" style={{ left: dx, top: dy }} /><motion.div className={`mouse-ring hidden md:block ${h ? 'hovering' : ''}`} style={{ left: sx, top: sy }} /><motion.div className="mouse-glow hidden md:block" style={{ left: ex, top: ey }} /></>)
}
function CharR({ t, d = 0 }: { t: string; d?: number }) {
  const r = useRef<HTMLSpanElement>(null), v = useInView(r, { once: true, margin: '-50px' })
  return (<span ref={r}>{t.split('').map((c, i) => (<motion.span key={i} initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }} animate={v ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}} transition={{ duration: 0.5, delay: d + i * 0.03, ease: [0.16, 1, 0.3, 1] }} className="inline-block" style={{ whiteSpace: c === ' ' ? 'pre' : 'normal' }}>{c === ' ' ? '\u00A0' : c}</motion.span>))}</span>)
}
function WordR({ t, d = 0, className = '' }: { t: string; d?: number; className?: string }) {
  const r = useRef<HTMLDivElement>(null), v = useInView(r, { once: true, margin: '-50px' })
  return (<div ref={r} className={className}>{t.split(' ').map((w, i) => (<motion.span key={i} initial={{ opacity: 0, y: 15, filter: 'blur(3px)' }} animate={v ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}} transition={{ duration: 0.5, delay: d + i * 0.06, ease: [0.16, 1, 0.3, 1] }} className="inline-block mr-[0.3em]">{w}</motion.span>))}</div>)
}
function SecR({ children, className = '', d = 0 }: { children: React.ReactNode; className?: string; d?: number }) {
  const r = useRef<HTMLDivElement>(null), v = useInView(r, { once: true, margin: '-80px' })
  return (<motion.div ref={r} initial={{ opacity: 0, y: 60 }} animate={v ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: d, ease: [0.16, 1, 0.3, 1] }} className={className}>{children}</motion.div>)
}
function Tilt({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const r = useRef<HTMLDivElement>(null), [t, setT] = useState({ x: 0, y: 0 })
  const m = useCallback((e: MouseEvent<HTMLDivElement>) => { if (!r.current) return; const b = r.current.getBoundingClientRect(); setT({ x: ((e.clientY - b.top) / b.height - 0.5) * -10, y: ((e.clientX - b.left) / b.width - 0.5) * 10 }) }, [])
  return (<motion.div ref={r} onMouseMove={m} onMouseLeave={() => setT({ x: 0, y: 0 })} animate={{ rotateX: t.x, rotateY: t.y }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className={className}>{children}</motion.div>)
}
function Mag({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const r = useRef<HTMLDivElement>(null), x = useMotionValue(0), y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 20 }), sy = useSpring(y, { stiffness: 200, damping: 20 })
  const m = useCallback((e: MouseEvent<HTMLDivElement>) => { if (!r.current) return; const b = r.current.getBoundingClientRect(); x.set((e.clientX - b.left - b.width / 2) * 0.3); y.set((e.clientY - b.top - b.height / 2) * 0.3) }, [x, y])
  return (<motion.div ref={r} onMouseMove={m} onMouseLeave={() => { x.set(0); y.set(0) }} style={{ x: sx, y: sy }} className={className}>{children}</motion.div>)
}
function Ctr({ target, suffix = '' }: { target: number; suffix?: string }) {
  const r = useRef<HTMLSpanElement>(null), v = useInView(r, { once: true }), [c, setC] = useState(0)
  useEffect(() => { if (!v) return; let s = 0; const i = target / 100; const t = setInterval(() => { s += i; if (s >= target) { setC(target); clearInterval(t) } else setC(Math.floor(s)) }, 20); return () => clearInterval(t) }, [v, target])
  return <span ref={r}>{c.toLocaleString()}{suffix}</span>
}

/* Handwriting loading component */
function HandwritingLoader() {
  return (
    <div className="flex flex-col items-center gap-6">
      <svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M10 45 C20 20, 40 15, 50 35 C55 45, 60 50, 70 30 C75 20, 80 15, 90 25 L95 35 C100 45, 110 50, 120 30 C125 20, 130 15, 140 25 L145 35 C150 40, 160 45, 170 30 C175 22, 180 18, 190 25"
          stroke="black"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="195"
          cy={25}
          r={4}
          fill="black"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 1] }}
          transition={{ duration: 0.5, delay: 2.3 }}
        />
      </svg>
      <div className="flex items-center gap-1">
        <motion.span
          className="text-sm text-gray-400 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          Loading
        </motion.span>
        <span className="loading-dot text-sm text-gray-400">.</span>
        <span className="loading-dot text-sm text-gray-400">.</span>
        <span className="loading-dot text-sm text-gray-400">.</span>
      </div>
    </div>
  )
}

/* Floating particles */
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${i % 2 === 0 ? 'bg-black/5' : 'bg-gray-300/20'}`}
          style={{
            width: 4 + i * 2,
            height: 4 + i * 2,
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, (i % 2 === 0 ? 15 : -15), 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 5 + i * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  )
}

/* Morphing blob background */
function MorphBlob() {
  return (
    <motion.div
      className="absolute w-[600px] h-[600px] bg-gradient-to-br from-gray-100/60 via-gray-50/40 to-transparent"
      style={{ top: '10%', right: '-10%' }}
      animate={{
        borderRadius: [
          '60% 40% 30% 70% / 60% 30% 70% 40%',
          '30% 60% 70% 40% / 50% 60% 30% 60%',
          '50% 60% 30% 60% / 30% 40% 70% 60%',
          '60% 30% 60% 40% / 70% 50% 40% 60%',
          '60% 40% 30% 70% / 60% 30% 70% 40%',
        ],
        scale: [1, 1.1, 1.05, 1.15, 1],
        rotate: [0, 5, -3, 8, 0],
      }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

const logos = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Stripe', 'Vercel']
const feats = [{ i: '✦', t: 'Smart Resume Screening', d: 'AI analyzes 500+ resumes in minutes, identifying authentic skills and filtering out exaggerations.', c: '#3B82F6' }, { i: '◈', t: 'Automated Interviews', d: 'AI conducts technical interviews via chat, asks follow-up questions, and evaluates responses in real-time.', c: '#8B5CF6' }, { i: '⬡', t: 'Instant Match Scoring', d: 'Get precise candidate-job match scores powered by AI semantic analysis and skill verification.', c: '#F59E0B' }, { i: '⊕', t: 'Analytics Dashboard', d: 'Track hiring metrics, pipeline progress, and AI performance with beautiful real-time dashboards.', c: '#10B981' }, { i: '◎', t: '100% Data Privacy', d: 'Your data stays on your private server. Full ownership and control with enterprise-grade security.', c: '#EF4444' }, { i: '✶', t: 'Zero Monthly Fees', d: 'One-time setup cost with lifetime access. No subscriptions, no hidden charges, ever.', c: '#F97316' }]
const steps = [{ n: '01', t: 'Upload Resumes', d: 'Drop 500+ resumes at once. Our AI parses and analyzes them in under a minute.', i: '↑' }, { n: '02', t: 'AI Smart Screening', d: 'AI verifies authentic skills, detects exaggerations, and scores each candidate automatically.', i: '✓' }, { n: '03', t: 'Automated Interviews', d: 'Qualified candidates receive test links. AI conducts interviews and evaluates responses.', i: '◈' }, { n: '04', t: 'Hire Top Talent', d: 'Get a ranked leaderboard of candidates. Review AI insights and hire the best fit.', i: '★' }]

/* Animated Workflow Step Components */
const resumeSkills = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'GraphQL']

function ResumeParserAnim() {
  const ref = useRef<HTMLDivElement>(null)
  const v = useInView(ref, { once: true, margin: '-100px' })
  const [currentSkill, setCurrentSkill] = useState(0)
  useEffect(() => {
    if (!v) return
    const interval = setInterval(() => setCurrentSkill(s => (s + 1) % resumeSkills.length), 800)
    return () => clearInterval(interval)
  }, [v])

  return (
    <div ref={ref} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-300" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-300" /><div className="w-2.5 h-2.5 rounded-full bg-green-300" /></div>
        <span className="text-xs text-gray-400 ml-2 font-mono">resume_parser.ai</span>
      </div>
      {/* Resume animation */}
      <div className="space-y-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={v ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="flex items-center gap-3">
          <motion.div animate={v ? { scale: [1, 1.05, 1], borderColor: ['#e5e7eb', '#000', '#e5e7eb'] } : {}} transition={{ duration: 2, repeat: Infinity }} className="w-10 h-12 bg-gray-50 border-2 rounded-lg flex items-center justify-center text-lg">
            <span className="text-sm">📄</span>
          </motion.div>
          <div className="flex-1">
            <motion.div initial={{ width: 0 }} animate={v ? { width: '100%' } : {}} transition={{ delay: 0.5, duration: 1.5 }} className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-black rounded-full" initial={{ width: '0%' }} animate={v ? { width: '100%' } : {}} transition={{ delay: 0.5, duration: 1.5 }} />
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={v ? { opacity: 1 } : {}} transition={{ delay: 2 }} className="text-[10px] text-green-600 mt-1">✓ Parsing complete</motion.p>
          </div>
        </motion.div>
        {/* Extracted skills */}
        <motion.div initial={{ opacity: 0 }} animate={v ? { opacity: 1 } : {}} transition={{ delay: 1.5 }}>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-semibold">Extracted Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {resumeSkills.slice(0, currentSkill + 3).map((skill, i) => (
              <motion.span key={skill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.15 + 1.5 }} className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-600 font-medium">{skill}</motion.span>
            ))}
          </div>
        </motion.div>
        {/* Summary */}
        <motion.div initial={{ opacity: 0 }} animate={v ? { opacity: 1 } : {}} transition={{ delay: 2.5 }} className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
          <p className="text-[10px] font-semibold text-blue-900 mb-1">AI Summary</p>
          <motion.p initial={{ opacity: 0 }} animate={v ? { opacity: 1 } : {}} transition={{ delay: 2.8 }} className="text-[11px] text-gray-600 leading-relaxed">Senior engineer with 5+ years experience. Strong in React/Node.js. Previous work at FAANG companies. Match score: <span className="font-bold text-green-600">94%</span></motion.p>
        </motion.div>
      </div>
    </div>
  )
}

function AIScreeningAnim() {
  const ref = useRef<HTMLDivElement>(null)
  const v = useInView(ref, { once: true, margin: '-100px' })
  const [activeCandidate, setActiveCandidate] = useState(0)
  const candidates = [
    { name: 'Alex K.', score: 94, badge: 'Strong Match', color: 'green' },
    { name: 'Jordan P.', score: 87, badge: 'Good Fit', color: 'blue' },
    { name: 'Sam R.', score: 72, badge: 'Consider', color: 'yellow' },
    { name: 'Taylor M.', score: 45, badge: 'Low Match', color: 'red' },
  ]
  useEffect(() => {
    if (!v) return
    const interval = setInterval(() => setActiveCandidate(s => (s + 1) % candidates.length), 1200)
    return () => clearInterval(interval)
  }, [v])

  return (
    <div ref={ref} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-300" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-300" /><div className="w-2.5 h-2.5 rounded-full bg-green-300" /></div>
        <span className="text-xs text-gray-400 ml-2 font-mono">ai_screening.engine</span>
      </div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3 font-semibold">Candidate Ranking</p>
      <div className="space-y-2">
        {candidates.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, x: 20 }}
            animate={v ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3 + i * 0.2 }}
            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-300 ${activeCandidate === i ? 'border-black bg-gray-50' : 'border-gray-100 bg-white'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${c.color === 'green' ? 'bg-green-100 text-green-700' : c.color === 'blue' ? 'bg-blue-100 text-blue-700' : c.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {c.score}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-900">{c.name}</p>
              <p className={`text-[10px] ${c.color === 'green' ? 'text-green-600' : c.color === 'blue' ? 'text-blue-600' : c.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>{c.badge}</p>
            </div>
            <motion.div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div className={`h-full rounded-full ${c.color === 'green' ? 'bg-green-500' : c.color === 'blue' ? 'bg-blue-500' : c.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} initial={{ width: 0 }} animate={v ? { width: `${c.score}%` } : {}} transition={{ delay: 0.8 + i * 0.2, duration: 0.8 }} />
            </motion.div>
            {activeCandidate === i && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 4L3.5 5.5L6 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0 }} animate={v ? { opacity: 1 } : {}} transition={{ delay: 2 }} className="mt-3 p-2 bg-black/5 rounded-lg text-center">
        <p className="text-[10px] text-gray-500">AI analyzed <span className="font-bold text-gray-900">247</span> resumes in <span className="font-bold text-gray-900">34 seconds</span></p>
      </motion.div>
    </div>
  )
}

function AutoInterviewAnim() {
  const ref = useRef<HTMLDivElement>(null)
  const v = useInView(ref, { once: true, margin: '-100px' })
  const [msgIndex, setMsgIndex] = useState(0)
  const messages = [
    { type: 'ai', text: 'Welcome! Let me ask you about your React experience.' },
    { type: 'ai', text: 'Can you explain how React\'s virtual DOM works?' },
    { type: 'candidate', text: 'The virtual DOM is a lightweight copy of the actual DOM. React creates a virtual representation of the UI...' },
    { type: 'ai', text: 'Good answer! How would you optimize a slow React component?' },
  ]
  useEffect(() => {
    if (!v) return
    const interval = setInterval(() => setMsgIndex(s => Math.min(s + 1, messages.length)), 1500)
    return () => clearInterval(interval)
  }, [v])

  return (
    <div ref={ref} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-300" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-300" /><div className="w-2.5 h-2.5 rounded-full bg-green-300" /></div>
        <span className="text-xs text-gray-400 ml-2 font-mono">interview.ai — Live Session</span>
        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="ml-auto w-2 h-2 rounded-full bg-red-400" />
      </div>
      <div className="space-y-2.5 mb-4">
        {messages.slice(0, msgIndex).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`max-w-[85%] p-2.5 rounded-xl text-[11px] leading-relaxed ${msg.type === 'ai' ? 'bg-gray-100 text-gray-800 rounded-bl-none' : 'bg-black text-white ml-auto rounded-br-none'}`}
          >
            {msg.text}
          </motion.div>
        ))}
        {msgIndex < messages.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 p-2">
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </motion.div>
        )}
      </div>
      {/* Analysis bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={v ? { opacity: 1, y: 0 } : {}} transition={{ delay: 3 }} className="p-3 bg-green-50 border border-green-100 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-green-900">Live Analysis</p>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5 }} className="text-[10px] text-green-600">Updating...</motion.span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Technical', value: 88, color: 'bg-green-500' },
            { label: 'Communication', value: 92, color: 'bg-blue-500' },
            { label: 'Problem Solving', value: 85, color: 'bg-purple-500' },
          ].map((m, i) => (
            <div key={i}>
              <div className="flex justify-between mb-0.5">
                <span className="text-[9px] text-gray-500">{m.label}</span>
                <span className="text-[9px] font-bold text-gray-700">{m.value}%</span>
              </div>
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <motion.div className={`h-full ${m.color} rounded-full`} initial={{ width: 0 }} animate={v ? { width: `${m.value}%` } : {}} transition={{ delay: 3.5 + i * 0.2, duration: 0.8 }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

const StepResumeParserConfig = { title: 'AI Resume Parsing', description: 'Drop 500+ resumes and our AI extracts skills, experience, and education in seconds.', color: '#3B82F6', points: ['Extracts 50+ data points per resume', 'Detects skill inflation & fake claims', 'Generates candidate summary instantly'], animation: ResumeParserAnim }
const StepAIScreeningConfig = { title: 'Smart AI Screening', description: 'AI ranks every candidate by fit score and explains the reasoning behind each ranking.', color: '#10B981', points: ['Cosine similarity matching', 'Explainable AI scoring', 'Reduces bias in hiring'], animation: AIScreeningAnim }
const StepAutoInterviewConfig = { title: 'Automated AI Interviews', description: 'AI conducts live interviews, asks follow-up questions, and analyzes responses in real-time.', color: '#8B5CF6', points: ['Real-time technical analysis', 'Follow-up question generation', 'Comprehensive candidate scoring'], animation: AutoInterviewAnim }

type WorkflowStep = { title: string; description: string; color: string; points: string[]; animation: React.FC }
const workflowSteps: WorkflowStep[] = [StepResumeParserConfig, StepAIScreeningConfig, StepAutoInterviewConfig]

export default function Page() {
  const [sc, setSc] = useState(false), [mo, setMo] = useState(false), [loading, setLoading] = useState(true)
  const { scrollYProgress } = useScroll()
  const hy = useTransform(scrollYProgress, [0, 0.3], [0, -100]), ho = useTransform(scrollYProgress, [0, 0.25], [1, 0])
  useEffect(() => { const h = () => setSc(window.scrollY > 20); window.addEventListener('scroll', h, { passive: true }); return () => window.removeEventListener('scroll', h) }, [])
  useEffect(() => { const t = setTimeout(() => setLoading(false), 3000); return () => clearTimeout(t) }, [])
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loader"
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <HandwritingLoader />
          </motion.div>
        )}
      </AnimatePresence>
      <MouseFollower />
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${sc ? 'bg-white/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-2.5" data-hover><motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center"><img src="/recruit_ai_logo.png" alt="RecruitAI" className="w-9 h-9" /></motion.div><span className="text-lg font-bold">Recruit<span className="text-black">AI</span></span></Link>
            <div className="hidden md:flex items-center gap-8">{['Features', 'How It Works', 'Pricing'].map(it => (<a key={it} href={`#${it.toLowerCase().replace(/\s+/g, '-')}`} className="relative text-sm font-medium text-gray-500 hover:text-black transition-colors group" data-hover>{it}<span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-black transition-all duration-300 group-hover:w-full" /></a>))}<Link href="/sign-in" className="text-sm font-medium text-gray-500 hover:text-black" data-hover>Sign In</Link><Mag><Link href="/sign-up" className="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-all relative overflow-hidden group" data-hover><span className="relative z-10">Get Started</span><span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" /></Link></Mag></div>
            <button onClick={() => setMo(!mo)} className="md:hidden p-2" aria-label="Toggle menu"><motion.div animate={{ rotate: mo ? 90 : 0 }} transition={{ duration: 0.2 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none">{mo ? <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}</svg></motion.div></button>
          </div>
        </div>
        <AnimatePresence>{mo && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="md:hidden overflow-hidden"><div className="px-4 py-4 bg-white/95 backdrop-blur-xl border-t border-gray-100 space-y-1">{['Features', 'How It Works', 'Pricing'].map((it, i) => (<motion.a key={it} href={`#${it.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMo(false)} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} className="block px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">{it}</motion.a>))}<div className="pt-2 border-t border-gray-100 space-y-2"><Link href="/sign-in" className="block w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg text-center">Sign In</Link><Link href="/sign-up" className="block w-full px-4 py-3 bg-black text-white text-sm font-semibold rounded-lg text-center">Get Started</Link></div></div></motion.div>)}</AnimatePresence>
      </motion.nav>

      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 grid-bg grid-shimmer grid-pulse" />
        <MorphBlob />
        <FloatingParticles />
        <motion.div className="absolute inset-0" style={{ y: hy }}><div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-r from-gray-100/40 via-gray-50/60 to-gray-100/40 blur-3xl" /></motion.div>
        <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full" style={{ opacity: ho }}>
          <div className="text-center max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200/80 rounded-full shadow-sm mb-8"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-sm font-medium text-gray-600">AI-Powered Hiring Platform</span></motion.div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-[1.1] mb-6"><CharR t="Hire Top Engineers" d={0.3} /><br /><span className="text-shimmer"><CharR t="on Autopilot" d={0.8} /></span></h1>
            <WordR t="From screening resumes to conducting automated interviews — our AI handles it all. Set up once and enjoy unlimited hiring with zero monthly fees." className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto" d={1.2} />

            {/* Handwriting signature */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.8 }} className="mb-8 flex justify-center">
              <div className="relative">
                <svg width="280" height="40" viewBox="0 0 280 40" fill="none" className="overflow-visible">
                  <motion.path
                    d="M10 30 C30 10, 50 10, 70 20 C80 25, 90 30, 100 20 C105 15, 110 12, 120 18 C125 22, 130 28, 140 20 C145 16, 150 14, 160 18 L165 22 C170 26, 180 30, 190 20 C195 15, 200 12, 210 18 L215 22 C220 25, 230 28, 240 18 C245 14, 250 12, 260 18"
                    stroke="rgba(0,0,0,0.15)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 3, ease: 'easeInOut', delay: 1.6 }}
                  />
                  <motion.text
                    x="140"
                    y="35"
                    textAnchor="middle"
                    className="text-[10px] fill-gray-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3.5 }}
                  >
                    AI Signature
                  </motion.text>
                </svg>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.6 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Mag><Link href="/sign-up" className="w-full sm:w-auto px-4 py-4  text-black font-semibold rounded-xl hover:bg-white transition-all hover:shadow-2xl hover:shadow-black/20 relative overflow-hidden group" data-hover><span className="relative z-10 flex items-center justify-center gap-2">Start Hiring for Free<motion.svg width="20" height="20" viewBox="0 0 20 20" fill="none" animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}><path d="M7 5L12 10L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></motion.svg></span><span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" /></Link></Mag>
              <Mag><a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all flex items-center justify-center gap-2 group" data-hover><motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" /><path d="M8 7L13 10L8 13V7Z" fill="currentColor" /></svg></motion.span>Watch Demo</a></Mag>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 2 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <div className="flex -space-x-2">{['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'].map((c, i) => (<motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.1 + i * 0.1, type: 'spring' }} className={`w-10 h-10 rounded-full ${c} border-2 border-white flex items-center justify-center text-white font-bold text-sm`}>{['A', 'B', 'C', 'D'][i]}</motion.div>))}</div>
              <div className="text-center sm:text-left"><div className="flex items-center gap-1 justify-center sm:justify-start mb-1">{[1, 2, 3, 4, 5].map(i => (<motion.svg key={i} width="16" height="16" viewBox="0 0 16 16" fill="none" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.3 + i * 0.05, type: 'spring' }}><path d="M8 1L10.2 5.5L15 6.2L11.5 9.6L12.4 14.4L8 12L3.6 14.4L4.5 9.6L1 6.2L5.8 5.5L8 1Z" fill="#FBBF24" /></motion.svg>))}</div><p className="text-sm text-gray-500">Trusted by <span className="font-bold text-gray-900"><Ctr target={150} />+</span> companies</p></div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 60, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, delay: 2.4, ease: [0.16, 1, 0.3, 1] }} className="mt-16 lg:mt-20 max-w-5xl mx-auto">
            <Tilt className="glow-pulse bg-white rounded-2xl border border-gray-200/80 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/80 border-b border-gray-100"><div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400/60" /><div className="w-3 h-3 rounded-full bg-yellow-400/60" /><div className="w-3 h-3 rounded-full bg-green-400/60" /></div><div className="flex-1 mx-4"><div className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-400 font-mono">app.recruitai.com/dashboard</div></div></div>
              <div className="p-6 lg:p-8 bg-gradient-to-br from-gray-50/50 to-white">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">{[{ l: 'Resumes Screened', v: 2847, c: '+12.5%', b: 'bg-blue-50' }, { l: 'AI Interviews', v: 1234, c: '+8.2%', b: 'bg-purple-50' }, { l: 'Avg. Match Score', v: 94, s: '%', c: '+3.1%', b: 'bg-green-50' }].map((s, i) => (<motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.8 + i * 0.15 }} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"><div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-gray-500">{s.l}</span><div className={`w-8 h-8 ${s.b} rounded-lg flex items-center justify-center`}><div className="w-2 h-2 rounded-full bg-gray-600" /></div></div><p className="text-3xl font-bold text-gray-900 mb-1"><Ctr target={s.v} suffix={s.s || ''} /></p><p className="text-xs text-green-600 font-medium">{s.c} from last month</p></motion.div>))}</div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2 }} className="mt-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm"><div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-gray-900">Hiring Pipeline</h3><span className="text-xs text-gray-400">Last 30 days</span></div><div className="flex items-end gap-2 h-32">{[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (<motion.div key={i} className="flex-1" initial={{ height: 0 }} animate={{ height: 'auto' }} transition={{ delay: 3.3 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}><div className="w-full bg-gradient-to-t from-black to-gray-600 rounded-t cursor-pointer hover:from-gray-800 hover:to-gray-700 transition-colors" style={{ height: `${h}%` }} /></motion.div>))}</div></motion.div>
              </div>
            </Tilt>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-12 border-y border-gray-100 bg-gray-50/50 overflow-hidden">
        <SecR><p className="mb-6 text-center text-sm text-gray-400 font-medium uppercase tracking-wider">Trusted by industry leaders</p></SecR>
        <div className="relative"><div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-gray-50/50 to-transparent z-10" /><div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-gray-50/50 to-transparent z-10" /><div className="flex marquee">{[...logos, ...logos].map((l, i) => (<div key={i} className="flex-shrink-0 mx-8 lg:mx-12"><span className="text-xl lg:text-2xl font-bold text-gray-300 hover:text-gray-500 transition-colors duration-300 whitespace-nowrap" data-hover>{l}</span></div>))}</div></div>
      </section>

      {/* Animated Stats Section */}
      <section className="py-16 lg:py-24 bg-white relative overflow-hidden">
        <FloatingParticles />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { label: 'Resumes Screened', value: 50000, suffix: '+', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> },
              { label: 'AI Interviews Done', value: 25000, suffix: '+', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg> },
              { label: 'Companies Trust Us', value: 150, suffix: '+', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg> },
              { label: 'Avg. Time Saved', value: 80, suffix: '%', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            ].map((stat, i) => (
              <SecR key={i} d={i * 0.1}>
                <motion.div
                  className="text-center group cursor-default"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <motion.div
                    className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 group-hover:text-gray-900 group-hover:border-gray-300 transition-colors duration-300"
                  >{stat.icon}</motion.div>
                  <p className="text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
                    <Ctr target={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-sm text-gray-400 font-medium">{stat.label}</p>
                </motion.div>
              </SecR>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 lg:py-32 bg-white relative overflow-hidden">
        <div className="grid-bg absolute inset-0 -z-10 opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <SecR><div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200/80 rounded-full mb-6"><span className="text-sm font-semibold text-gray-600">Features</span></div></SecR>
            <SecR d={0.1}><h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Everything You Need to <span className="text-shimmer">Hire Better</span></h2></SecR>
            <SecR d={0.2}><p className="text-lg text-gray-500">Powerful AI tools that automate your entire hiring workflow from start to finish</p></SecR>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">{feats.map((f, i) => (<SecR key={i} d={i * 0.1}><Tilt className="group p-6 lg:p-8 bg-white border border-gray-200/80 rounded-2xl hover:border-gray-300 transition-all duration-500 hover:shadow-xl relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" /><div className="relative z-10"><motion.div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: f.c + '15', color: f.c }} whileHover={{ rotate: 15 }}>{f.i}</motion.div><h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:translate-x-1 transition-transform duration-300">{f.t}</h3><p className="text-gray-500 leading-relaxed">{f.d}</p></div><div className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500" style={{ background: f.c }} /></Tilt></SecR>))}</div>
        </div>
      </section>

      {/* How It Works - Animated Workflow Section */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-gray-50/80 relative overflow-hidden">
        <div className="grid-bg grid-shimmer absolute inset-0 -z-10 opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <SecR><div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200/80 rounded-full mb-6"><span className="text-sm font-semibold text-gray-600">How It Works</span></div></SecR>
            <SecR d={0.1}><h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">From Resume to Hire <span className="text-shimmer">in Minutes</span></h2></SecR>
            <SecR d={0.2}><p className="text-lg text-gray-500">Watch our AI process hundreds of candidates automatically</p></SecR>
          </div>

          {/* Animated Workflow Steps */}
          <div className="max-w-5xl mx-auto space-y-16 lg:space-y-24">
            {workflowSteps.map((StepComponent, i) => (
              <SecR key={i} d={i * 0.15}>
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                  <div className={`flex-1 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-sm font-bold">{i + 1}</div>
                      <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">{StepComponent.title}</h3>
                    </div>
                    <p className="text-gray-500 text-lg leading-relaxed mb-4">{StepComponent.description}</p>
                    <ul className="space-y-2">
                      {StepComponent.points.map((point: string, j: number) => (
                        <motion.li
                          key={j}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + j * 0.1 }}
                          className="flex items-center gap-2 text-gray-600"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill={StepComponent.color} opacity="0.15" /><path d="M5 8L7 10L11 6" stroke={StepComponent.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {point}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                  <div className={`flex-1 w-full ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                    <StepComponent.animation />
                  </div>
                </div>
              </SecR>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32 bg-white relative overflow-hidden">
        <div className="grid-bg absolute inset-0 -z-10 opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <SecR><div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200/80 rounded-full mb-6"><span className="text-sm font-semibold text-gray-600">Testimonials</span></div></SecR>
            <SecR d={0.1}><h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Loved by <span className="text-shimmer">Recruiters</span></h2></SecR>
            <SecR d={0.2}><p className="text-lg text-gray-500">See what hiring teams say about RecruitAI</p></SecR>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { name: 'Sarah Chen', role: 'VP of Engineering', company: 'TechFlow', quote: 'RecruitAI cut our hiring time by 70%. We went from screening 500 resumes manually to having a shortlist in under 10 minutes. Game changer.', avatar: 'SC', color: '#3B82F6' },
              { name: 'Marcus Johnson', role: 'Head of Talent', company: 'ScaleUp', quote: 'The AI interview feature is incredible. Candidates love the flexibility, and we get detailed analysis of every response. No more scheduling nightmares.', avatar: 'MJ', color: '#8B5CF6' },
              { name: 'Priya Sharma', role: 'CTO', company: 'DataNest', quote: 'Self-hosted means our candidate data stays secure. The match scoring is more accurate than any tool we\'ve tried. Worth every penny.', avatar: 'PS', color: '#10B981' },
            ].map((t, i) => (
              <SecR key={i} d={i * 0.1}>
                <motion.div
                  className="p-6 lg:p-8 bg-white border border-gray-200/80 rounded-2xl hover:shadow-xl transition-all duration-500 relative overflow-hidden group h-full flex flex-col"
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-5" style={{ background: t.color }}>
                    <svg viewBox="0 0 32 32" fill="none"><path d="M10 8L6 16V24H14V16H10C10 16 10 12 14 12V8C7 8 6 14 6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="currentColor" /></svg>
                  </div>
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(s => (
                      <motion.svg key={s} width="16" height="16" viewBox="0 0 16 16" fill="none" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + s * 0.05, type: 'spring' }}>
                        <path d="M8 1L10.2 5.5L15 6.2L11.5 9.6L12.4 14.4L8 12L3.6 14.4L4.5 9.6L1 6.2L5.8 5.5L8 1Z" fill="#FBBF24" />
                      </motion.svg>
                    ))}
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6 flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: t.color }}>{t.avatar}</div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}, {t.company}</p>
                    </div>
                  </div>
                </motion.div>
              </SecR>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 lg:py-32 bg-white relative overflow-hidden">
        <div className="grid-bg absolute inset-0 -z-10 opacity-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <SecR><div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200/80 rounded-full mb-6"><span className="text-sm font-semibold text-gray-600">Pricing</span></div></SecR>
            <SecR d={0.1}><h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Simple, <span className="text-shimmer">Transparent</span> Pricing</h2></SecR>
            <SecR d={0.2}><p className="text-lg text-gray-500">One-time payment. Lifetime access. No monthly fees ever.</p></SecR>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <SecR><Tilt className="p-8 bg-gray-50 border border-gray-200/80 rounded-2xl h-full"><h3 className="text-xl font-bold text-gray-900 mb-2">Traditional ATS</h3><p className="text-gray-500 mb-6">Other hiring software</p><div className="text-4xl font-bold text-gray-900 mb-8">₹70K<span className="text-lg text-gray-400 font-normal">/month</span></div><ul className="space-y-4 mb-8">{['Monthly recurring bills', 'Limited to 5-10 users', 'Caps on resumes & interviews', 'Data on their servers'].map((it, i) => (<motion.li key={i} className="flex items-start gap-3" initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mt-0.5 flex-shrink-0"><circle cx="10" cy="10" r="8" fill="#F3F4F6" /><path d="M7 10L9 12L13 8" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span className="text-gray-400">{it}</span></motion.li>))}</ul></Tilt></SecR>
            <SecR d={0.15}><Tilt className="relative p-8 bg-black text-white border-2 border-black rounded-2xl h-full overflow-hidden"><motion.div className="absolute inset-0 opacity-10" animate={{ background: ['radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 60%)', 'radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15), transparent 60%)', 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 60%)'] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} /><div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full shadow-lg">RECOMMENDED</div><div className="relative z-10"><h3 className="text-xl font-bold mb-2">RecruitAI</h3><p className="text-gray-400 mb-6">Your private hiring system</p><div className="text-4xl font-bold mb-2">₹20K<span className="text-lg text-gray-400 font-normal"> one-time</span></div><p className="text-sm text-gray-500 mb-8">Lifetime access, no monthly fees</p><ul className="space-y-4 mb-8">{['No monthly bills ever', 'Unlimited users', 'Unlimited resumes & interviews', '100% your data, your server'].map((it, i) => (<motion.li key={i} className="flex items-start gap-3" initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mt-0.5 flex-shrink-0"><circle cx="10" cy="10" r="8" fill="white" /><path d="M7 10L9 12L13 8" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{it}</span></motion.li>))}</ul><Mag><Link href="/sign-up" className="block w-full py-4 bg-white text-black font-semibold rounded-xl text-center hover:bg-gray-100 transition-all duration-300 hover:shadow-lg relative overflow-hidden group" data-hover><span className="relative z-10">Get Started Now</span><span className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" /></Link></Mag></div></Tilt></SecR>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32 relative overflow-hidden">
        <div className="grid-bg grid-shimmer absolute inset-0 -z-10" />
        <SecR><div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"><div className="relative bg-black rounded-3xl p-8 lg:p-16 text-center overflow-hidden"><motion.div className="absolute w-64 h-64 rounded-full bg-white/5 blur-3xl" animate={{ x: [0, 50, 0], y: [0, -30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} style={{ top: '-10%', right: '-5%' }} /><motion.div className="absolute w-48 h-48 rounded-full bg-white/5 blur-3xl" animate={{ x: [0, -40, 0], y: [0, 40, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} style={{ bottom: '-5%', left: '-5%' }} /><div className="grid-bg-dark absolute inset-0 opacity-30" /><div className="relative z-10"><motion.h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>Ready to Transform Your Hiring?</motion.h2><motion.p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>Join 150+ companies using AI to hire better, faster, and cheaper. Set up once, hire forever.</motion.p><motion.div className="flex flex-col sm:flex-row items-center justify-center gap-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}><Mag><Link href="/sign-up" className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all hover:shadow-xl flex items-center justify-center gap-2 relative overflow-hidden group" data-hover><span className="relative z-10">Start Free Trial</span><motion.svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="relative z-10" animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}><path d="M7 5L12 10L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></motion.svg><span className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" /></Link></Mag><Link href="/sign-in" className="w-full sm:w-auto px-8 py-4 bg-transparent text-white font-semibold rounded-xl border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300 flex items-center justify-center" data-hover>Sign In</Link></motion.div></div></div></div></SecR>
      </section>

      <footer className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8"><div className="md:col-span-2"><Link href="/" className="flex items-center gap-2.5" data-hover><motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center"><img src="/recruit_ai_logo.png" alt="RecruitAI" className="w-9 h-9" /></motion.div><span className="text-lg font-bold">Recruit<span className="text-black">AI</span></span></Link>
            <p className="text-gray-500 max-w-sm leading-relaxed">AI-powered hiring platform that automates resume screening, interviews, and candidate evaluation.</p></div><div><h4 className="font-semibold text-gray-900 mb-4">Product</h4><ul className="space-y-2.5">{['Features', 'Pricing', 'Demo', 'Documentation'].map(it => (<li key={it}><a href="#" className="text-sm text-gray-400 hover:text-black transition-colors duration-200 relative group" data-hover>{it}<span className="absolute -bottom-0.5 left-0 w-0 h-px bg-black transition-all duration-300 group-hover:w-full" /></a></li>))}</ul></div><div><h4 className="font-semibold text-gray-900 mb-4">Company</h4><ul className="space-y-2.5">{['About', 'Blog', 'Careers', 'Contact'].map(it => (<li key={it}><a href="#" className="text-sm text-gray-400 hover:text-black transition-colors duration-200 relative group" data-hover>{it}<span className="absolute -bottom-0.5 left-0 w-0 h-px bg-black transition-all duration-300 group-hover:w-full" /></a></li>))}</ul></div></div>
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4"><p className="text-sm text-gray-400">&copy; 2026 RecruitAI. All rights reserved.</p><div className="flex items-center gap-6">{['Privacy Policy', 'Terms of Service'].map(it => (<a key={it} href="#" className="text-sm text-gray-400 hover:text-black transition-colors duration-200" data-hover>{it}</a>))}</div></div>
        </div>
      </footer>
    </div>
  )
}