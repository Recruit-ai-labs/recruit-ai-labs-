'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Mic, MicOff, AlertTriangle, Loader2, Upload, CheckCircle, Clock, ChevronRight, ChevronLeft, Volume2, VolumeX, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'

type Step = 'details' | 'instructions' | 'interview' | 'completed'

interface Question {
  question: string
  type: string
  difficulty: string
  expectedAnswer: string
  evaluationCriteria: string[]
}

interface PatternAnalysis {
  score: number
  confidence: number
  keywordHitRate: number
  structureScore: number
  fillerWordCount: number
  responseLength: number
  hesitationMarkers: number
  technicalDepth: number
  patterns: string[]
}

interface AnswerRecord {
  question: string
  answer: string
  analysis: PatternAnalysis | null
  questionIndex: number
}

export default function PublicInterviewPage() {
  const params = useParams()
  const interviewToken = params.token as string

  const [step, setStep] = useState<Step>('details')
  const [interview, setInterview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [candidateData, setCandidateData] = useState({ name: '', email: '', phone: '', linkedin: '', github: '' })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeUploading, setResumeUploading] = useState(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(600)
  const [started, setStarted] = useState(false)
  const [endingInterview, setEndingInterview] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [warningCount, setWarningCount] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)
  const timeRef = useRef(600)
  const answersRef = useRef<AnswerRecord[]>([])
  const transcriptRef = useRef('')
  const currentQRef = useRef(0)
  const endingRef = useRef(false)

  // Keep refs in sync
  useEffect(() => { answersRef.current = answers }, [answers])
  useEffect(() => { transcriptRef.current = currentTranscript }, [currentTranscript])
  useEffect(() => { currentQRef.current = currentQ }, [currentQ])

  // Fetch interview
  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const res = await fetch(`/api/public/interviews/${interviewToken}`)
        if (!res.ok) throw new Error('Interview not found or expired')
        const data = await res.json()
        setInterview(data.interview)
        let parsed: Question[] = []
        const raw = data.interview.questions
        if (typeof raw === 'string') { try { parsed = JSON.parse(raw) } catch {} }
        else if (Array.isArray(raw)) { parsed = raw }
        setQuestions(parsed)
        setLoadError(null)
      } catch (error: any) {
        setLoadError(error.message || 'Failed to load interview.')
      } finally {
        setLoading(false)
      }
    }
    if (interviewToken) fetchInterview()
  }, [interviewToken])

  // Timer using ref for interval, state only for display
  useEffect(() => {
    if (step === 'interview' && started && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        timeRef.current -= 1
        setTimeRemaining(timeRef.current)
        if (timeRef.current <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          doEndInterview()
        }
      }, 1000)
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [step, started])

  // Proctoring
  useEffect(() => {
    if (step !== 'interview' || !started) return
    const handleVisibility = () => {
      if (document.hidden) {
        setWarningCount(prev => {
          const next = prev + 1
          if (next >= 3) { toast.error('Too many warnings! Interview terminated.'); doEndInterview() }
          else toast.warning(`Warning ${next}/3: Tab switch detected!`)
          return next
        })
      }
    }
    const handleBlur = () => {
      setWarningCount(prev => {
        const next = prev + 1
        if (next >= 3) { toast.error('Too many warnings! Interview terminated.'); doEndInterview() }
        else toast.warning(`Warning ${next}/3: Window switch detected!`)
        return next
      })
    }
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && ['c','v','u','a','p'].includes(e.key)) { e.preventDefault(); toast.warning('Keyboard shortcuts disabled') }
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) e.preventDefault()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [step, started])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // TTS
  const speakQuestion = useCallback((text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [voiceEnabled])

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  // Speech Recognition
  const startSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported. Use Chrome for best experience.')
      return
    }
    // Stop any existing recognition
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} recognitionRef.current = null }
    
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1
    
    let finalTranscript = ''
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setCurrentTranscript(finalTranscript + interim)
    }
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access.')
        setIsRecording(false)
      } else if (event.error !== 'aborted') {
        // Auto-restart on other errors
        setTimeout(() => {
          if (recognitionRef.current === recognition) {
            try { recognition.start() } catch {}
          }
        }, 500)
      }
    }
    recognition.onend = () => {
      // Auto-restart if still supposed to be recording
      if (recognitionRef.current === recognition) {
        try { recognition.start() } catch {}
      }
    }
    
    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsRecording(true)
    } catch {
      toast.error('Failed to start microphone. Click "Start Recording" to try again.')
    }
  }, [])

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current
      recognitionRef.current = null
      try { rec.stop() } catch {}
    }
    setIsRecording(false)
  }, [])

  // Pattern Analysis
  const analyzePatterns = useCallback((answer: string, question: Question): PatternAnalysis => {
    const lower = answer.toLowerCase()
    const words = lower.split(/\s+/).filter(w => w.length > 0)
    const patterns: string[] = []

    const fillers = ['um', 'uh', 'like', 'you know', 'i guess', 'sort of', 'kind of', 'basically', 'actually']
    const fillerCount = fillers.reduce((acc, f) => acc + (lower.match(new RegExp(`\\b${f}\\b`, 'gi')) || []).length, 0)
    const hesitationMarkers = (lower.match(/\b(\w+)\s+\1\b/g) || []).length + (lower.match(/\bi (?:don't|um|uh|think|guess)/gi) || []).length

    const keywords = [...question.evaluationCriteria, ...(question.expectedAnswer?.split(/\s+/).filter(w => w.length > 4) || [])]
    const keywordHits = keywords.filter(k => lower.includes(k.toLowerCase())).length
    const keywordHitRate = keywords.length > 0 ? keywordHits / keywords.length : 0

    const techTerms = ['api', 'database', 'algorithm', 'architecture', 'framework', 'deployment', 'testing', 'optimization', 'scalability', 'microservice', 'caching', 'ci/cd', 'docker', 'kubernetes', 'aws', 'react', 'node', 'typescript', 'python', 'sql', 'graphql', 'design pattern', 'oop', 'solid', 'agile', 'rest', 'performance', 'security']
    const techHits = techTerms.filter(t => lower.includes(t)).length
    const technicalDepth = Math.min(1, techHits / 5)

    const hasSituation = /\b(when|while|during|at my|in my|at the)\b/i.test(answer)
    const hasTask = /\b(needed to|had to|was asked|responsible|task|goal)\b/i.test(answer)
    const hasAction = /\b(i built|i created|i implemented|i designed|i developed|i solved|i fixed)\b/i.test(answer)
    const hasResult = /\b(result|outcome|achieved|improved|reduced|increased|delivered|impact)\b/i.test(answer)
    const starCount = [hasSituation, hasTask, hasAction, hasResult].filter(Boolean).length
    const structureScore = starCount / 4
    if (starCount >= 3) patterns.push('STAR method detected')
    if (hasResult) patterns.push('Result-oriented response')

    const responseLength = words.length
    let completenessScore = 0
    if (responseLength > 20) completenessScore = 0.3
    if (responseLength > 50) completenessScore = 0.6
    if (responseLength > 100) completenessScore = 0.9
    if (responseLength > 150) completenessScore = 1.0

    const confidence = Math.max(0, Math.min(100, 100 - (fillerCount * 8) - (hesitationMarkers * 5)))
    const score = Math.round((keywordHitRate * 30) + (structureScore * 20) + (technicalDepth * 20) + (completenessScore * 15) + (confidence / 100 * 15))

    if (confidence > 80) patterns.push('High confidence')
    if (confidence < 40) patterns.push('Low confidence detected')
    if (technicalDepth > 0.5) patterns.push('Strong technical vocabulary')
    if (responseLength < 20) patterns.push('Response too brief')

    return { score: Math.min(100, score), confidence, keywordHitRate, structureScore, fillerWordCount: fillerCount, responseLength, hesitationMarkers, technicalDepth, patterns }
  }, [])

  // Resume upload
  const handleDetailsSubmit = async () => {
    if (!candidateData.name || !candidateData.email) { toast.error('Please fill in required fields'); return }
    if (!resumeFile) { toast.error('Please upload your resume'); return }
    setResumeUploading(true)
    try {
      const formData = new FormData()
      formData.append('resume', resumeFile)
      formData.append('name', candidateData.name)
      formData.append('email', candidateData.email)
      formData.append('phone', candidateData.phone)
      formData.append('linkedin', candidateData.linkedin)
      formData.append('github', candidateData.github)
      formData.append('interviewId', interview.id)
      const res = await fetch('/api/public/candidates/upload', { method: 'POST', body: formData })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Upload failed') }
      toast.success('Resume uploaded!')
      setStep('instructions')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload resume')
    } finally {
      setResumeUploading(false)
    }
  }

  // Save answer
  const saveCurrentAnswer = useCallback(() => {
    const q = currentQRef.current
    const question = questions[q]
    const transcript = transcriptRef.current.trim()
    if (!question || !transcript) return null
    const analysis = analyzePatterns(transcript, question)
    const record: AnswerRecord = { question: question.question || '', answer: transcript, analysis, questionIndex: q }
    setAnswers(prev => {
      const filtered = prev.filter(a => a.questionIndex !== q)
      return [...filtered, record]
    })
    return record
  }, [questions, analyzePatterns])

  const goToNextQuestion = () => {
    saveCurrentAnswer()
    stopSpeechRecognition()
    stopSpeaking()
    setCurrentTranscript('')
    if (currentQ < questions.length - 1) {
      const next = currentQ + 1
      setCurrentQ(next)
      setTimeout(() => {
        speakQuestion(`Question ${next + 1}. ${questions[next]?.question}`)
        startSpeechRecognition()
      }, 600)
    }
  }

  const goToPrevQuestion = () => {
    if (currentQ > 0) {
      saveCurrentAnswer()
      stopSpeechRecognition()
      stopSpeaking()
      setCurrentTranscript('')
      const prev = currentQ - 1
      setCurrentQ(prev)
      // Load previous answer if exists
      const prevAnswer = answers.find(a => a.questionIndex === prev)
      if (prevAnswer) setCurrentTranscript(prevAnswer.answer)
      setTimeout(() => startSpeechRecognition(), 300)
    }
  }

  // End interview (ref-based to avoid stale closures)
  const doEndInterview = useCallback(async () => {
    if (endingRef.current) return
    endingRef.current = true
    setEndingInterview(true)
    stopSpeechRecognition()
    stopSpeaking()
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    // Capture final answer if any
    const finalAnswers = [...answersRef.current]
    const transcript = transcriptRef.current.trim()
    if (transcript) {
      const q = currentQRef.current
      const question = questions[q]
      if (question) {
        const analysis = analyzePatterns(transcript, question)
        const existing = finalAnswers.findIndex(a => a.questionIndex === q)
        const record: AnswerRecord = { question: question.question || '', answer: transcript, analysis, questionIndex: q }
        if (existing >= 0) finalAnswers[existing] = record
        else finalAnswers.push(record)
      }
    }

    try {
      const response = await fetch(`/api/public/interviews/${interviewToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers, status: 'completed', candidate_completed: true }),
      })
      if (response.ok) {
        await fetch('/api/interviews/generate-tech-dna', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId: interview.id }),
        }).catch(() => {})
        toast.success('Interview submitted successfully!')
      } else {
        toast.error('Interview saved but analysis could not start')
      }
    } catch {
      toast.error('Failed to save answers')
    } finally {
      setAnswers(finalAnswers)
      setStep('completed')
      setEndingInterview(false)
    }
  }, [interviewToken, interview, questions, analyzePatterns])

  // Start interview session — auto-starts mic
  const startInterviewSession = () => {
    setStarted(true)
    setStep('interview')
    timeRef.current = 600
    setTimeRemaining(600)
    toast.info('Interview started! Speak clearly into your microphone.')
    setTimeout(() => {
      speakQuestion(`Question 1. ${questions[0]?.question}`)
      startSpeechRecognition()
    }, 1000)
  }

  // ─── Loading / Error ───
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /><p className="ml-2">Loading interview...</p></div>
  }
  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md"><CardContent className="pt-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Interview Not Found</h2>
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent></Card>
      </div>
    )
  }
  if (!interview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md"><CardContent className="pt-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Interview Link</h2>
          <p className="text-muted-foreground">This interview link is invalid or has expired.</p>
        </CardContent></Card>
      </div>
    )
  }

  // STEP 1: Details
  if (step === 'details') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Interview Application</h1>
            <p className="text-muted-foreground">Position: {interview.applications?.jobs?.title || 'Available Position'}</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>Fill in your information and upload your resume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="name">Full Name *</Label><Input id="name" value={candidateData.name} onChange={(e) => setCandidateData({ ...candidateData, name: e.target.value })} placeholder="Full name" /></div>
                <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" value={candidateData.email} onChange={(e) => setCandidateData({ ...candidateData, email: e.target.value })} placeholder="your@email.com" /></div>
                <div><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={candidateData.phone} onChange={(e) => setCandidateData({ ...candidateData, phone: e.target.value })} placeholder="+1 (555) 123-4567" /></div>
                <div><Label htmlFor="linkedin">LinkedIn</Label><Input id="linkedin" value={candidateData.linkedin} onChange={(e) => setCandidateData({ ...candidateData, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
                <div className="md:col-span-2"><Label htmlFor="github">GitHub</Label><Input id="github" value={candidateData.github} onChange={(e) => setCandidateData({ ...candidateData, github: e.target.value })} placeholder="https://github.com/..." /></div>
              </div>
              <div>
                <Label>Resume * (PDF/DOC, max 5MB)</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input type="file" id="resume" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return
                    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return }
                    setResumeFile(file)
                  }} />
                  <label htmlFor="resume" className="cursor-pointer">
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-600"><CheckCircle className="w-5 h-5" /><span className="font-medium">{resumeFile.name}</span></div>
                    ) : (
                      <><Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" /><p className="font-medium">Click to upload resume</p><p className="text-sm text-muted-foreground">PDF, DOC, DOCX up to 5MB</p></>
                    )}
                  </label>
                </div>
              </div>
              <Button onClick={handleDetailsSubmit} disabled={resumeUploading || !resumeFile || !candidateData.name || !candidateData.email} size="lg" className="w-full">
                {resumeUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : 'Continue to Instructions'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // STEP 2: Instructions
  if (step === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Interview Instructions</CardTitle>
              <CardDescription>Read carefully before starting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold mb-2">Interview Details</h4>
                <ul className="space-y-1 text-sm">
                  <li>Position: <strong>{interview.applications?.jobs?.title || 'Available Position'}</strong></li>
                  <li>Questions: <strong>{questions.length}</strong></li>
                  <li>Duration: <strong>10 minutes</strong></li>
                  <li>Voice: <strong>AI reads questions aloud & listens to your answers</strong></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-red-600 mb-2">Rules</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Stay in a quiet, well-lit environment</li>
                  <li>• Microphone will auto-record your answers — speak clearly</li>
                  <li>• Do not switch tabs or windows</li>
                  <li>• You can also type your answers as backup</li>
                  <li className="text-red-600 font-medium">• 3 warnings for suspicious behavior = termination</li>
                  <li>• Copy/paste and keyboard shortcuts are disabled</li>
                  <li>• Auto-ends after 10 minutes</li>
                </ul>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold mb-2">AI Proctoring Active</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>Tab switch detection</span><span>Window blur detection</span>
                  <span>Right-click disabled</span><span>Keyboard shortcuts blocked</span>
                  <span>Voice recording</span><span>Pattern analysis</span>
                </div>
              </div>
              <Button onClick={async () => {
                // Request mic permission before starting
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                  stream.getTracks().forEach(t => t.stop())
                } catch {
                  toast.error('Please allow microphone access and try again')
                  return
                }
                startInterviewSession()
              }} size="lg" className="w-full">
                Allow Microphone & Start Interview
              </Button>
              <Button variant="outline" onClick={() => setStep('details')} className="w-full">Back</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // STEP 3: Interview
  if (step === 'interview') {
    const question = questions[currentQ]
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {warningCount > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 text-center text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />Warning {warningCount}/3 — Suspicious activity detected
          </div>
        )}
        <div className={`px-4 py-2 text-center font-bold ${timeRemaining < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          <Clock className="w-4 h-4 inline mr-2" />{formatTime(timeRemaining)} remaining
        </div>

        <div className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {currentQ + 1} of {questions.length}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{question?.type || 'mixed'}</Badge>
                  <Badge variant="outline">{question?.difficulty || 'medium'}</Badge>
                  {isRecording ? <Badge variant="destructive"><Mic className="w-3 h-3 mr-1" /> Recording</Badge> : <Badge variant="outline"><MicOff className="w-3 h-3 mr-1" /> Off</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-lg font-medium p-4 bg-muted rounded-lg flex items-start gap-3">
                <span className="flex-1">{question?.question || 'No questions available'}</span>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => voiceEnabled ? (stopSpeaking(), setVoiceEnabled(false)) : (setVoiceEnabled(true), speakQuestion(question?.question || ''))}>
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </div>
              {isSpeaking && <div className="text-xs text-blue-600 flex items-center gap-1"><Volume2 className="w-3 h-3 animate-pulse" /> AI is reading the question aloud...</div>}

              <div>
                <Label>Your Answer {isRecording && <span className="text-red-500">(Listening...)</span>}</Label>
                <Textarea value={currentTranscript} onChange={(e) => setCurrentTranscript(e.target.value)} placeholder="Speak your answer or type here..." rows={6} className="mt-1" />
              </div>

              <div className="flex gap-2 flex-wrap">
                {isRecording ? (
                  <Button variant="outline" onClick={stopSpeechRecognition}><MicOff className="w-4 h-4 mr-2" /> Stop Mic</Button>
                ) : (
                  <Button variant="outline" onClick={startSpeechRecognition}><Mic className="w-4 h-4 mr-2" /> Start Mic</Button>
                )}
                <Button variant="outline" onClick={() => speakQuestion(question?.question || '')}><Volume2 className="w-4 h-4 mr-2" /> Repeat Question</Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={goToPrevQuestion} disabled={currentQ === 0}><ChevronLeft className="w-4 h-4 mr-1" /> Previous</Button>
            {currentQ < questions.length - 1 ? (
              <Button onClick={goToNextQuestion} className="flex-1">Next Question <ChevronRight className="w-4 h-4 ml-1" /></Button>
            ) : (
              <Button onClick={doEndInterview} disabled={endingInterview} variant="destructive" className="flex-1">
                {endingInterview ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'End Interview & Submit'}
              </Button>
            )}
          </div>

          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded ${i === currentQ ? 'bg-blue-500' : answers.some(a => a.questionIndex === i) ? 'bg-green-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">{answers.length} of {questions.length} questions answered</p>
        </div>
      </div>
    )
  }

  // STEP 4: Completed — Show AI Summary & Scores
  if (step === 'completed') {
    const totalScore = answers.reduce((sum, a) => sum + (a.analysis?.score || 0), 0)
    const avgScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0
    const avgConfidence = answers.length > 0 ? Math.round(answers.reduce((s, a) => s + (a.analysis?.confidence || 0), 0) / answers.length) : 0
    const avgTechnical = answers.length > 0 ? Math.round(answers.reduce((s, a) => s + (a.analysis?.technicalDepth || 0) * 100, 0) / answers.length) : 0
    const avgStructure = answers.length > 0 ? Math.round(answers.reduce((s, a) => s + (a.analysis?.structureScore || 0) * 100, 0) / answers.length) : 0
    const allPatterns = [...new Set(answers.flatMap(a => a.analysis?.patterns || []))]

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <CardTitle className="text-3xl">Interview Completed!</CardTitle>
              <CardDescription>Thank you for completing the interview for {interview.applications?.jobs?.title || 'this position'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <div>
                    <div className="text-3xl font-bold">{avgScore}</div>
                    <div className="text-xs">/ 100</div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Overall Response Score</p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{avgConfidence}%</div>
                  <div className="text-xs text-muted-foreground">Confidence</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{avgStructure}%</div>
                  <div className="text-xs text-muted-foreground">Structure (STAR)</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{avgTechnical}%</div>
                  <div className="text-xs text-muted-foreground">Technical Depth</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{answers.length}/{questions.length}</div>
                  <div className="text-xs text-muted-foreground">Answered</div>
                </div>
              </div>

              {/* Detected Patterns */}
              {allPatterns.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> AI Pattern Analysis</h4>
                  <div className="flex flex-wrap gap-2">
                    {allPatterns.map((p, i) => (
                      <Badge key={i} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-question breakdown */}
              {answers.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Per-Question Breakdown</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {answers.sort((a, b) => a.questionIndex - b.questionIndex).map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
                        <span className="flex-1 truncate mr-4">Q{a.questionIndex + 1}: {a.question}</span>
                        <Badge variant={a.analysis && a.analysis.score >= 60 ? 'default' : 'destructive'}>
                          {a.analysis?.score || 0}/100
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-left">
                <h4 className="font-semibold mb-2">What happens next?</h4>
                <ul className="text-sm space-y-1">
                  <li>&#10003; Hidden pattern analysis of your responses</li>
                  <li>&#10003; Confidence & structure scoring</li>
                  <li>&#10003; Technical depth evaluation</li>
                  <li>&#10003; Review by hiring team</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground text-center">You can close this window now.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
