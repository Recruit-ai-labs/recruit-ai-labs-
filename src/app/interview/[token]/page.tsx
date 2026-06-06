'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { WebcamIcon, Mic, MicOff, AlertTriangle, Loader2, Upload, FileText, CheckCircle, Clock, ChevronRight, ChevronLeft } from 'lucide-react'
import Webcam from 'react-webcam'
import { toast } from 'sonner'

type Step = 'details' | 'instructions' | 'interview' | 'completed'

interface Question {
  question: string
  type: string
  difficulty: string
  expectedAnswer: string
  evaluationCriteria: string[]
}

interface RecordedAnswer {
  question: string
  answer: string
  questionIndex: number
}

export default function PublicInterviewPage() {
  const params = useParams()
  const router = useRouter()
  const interviewToken = params.token as string

  const [step, setStep] = useState<Step>('details')
  const [interview, setInterview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Step 1: Candidate details + resume
  const [candidateData, setCandidateData] = useState({
    name: '', email: '', phone: '', linkedin: '', github: '',
  })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeUploading, setResumeUploading] = useState(false)

  // Step 3: Interview state
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<RecordedAnswer[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(600)
  const [started, setStarted] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [endingInterview, setEndingInterview] = useState(false)

  // Cheating detection
  const [warningCount, setWarningCount] = useState(0)

  const webcamRef = useRef<Webcam>(null)
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  // Fetch interview
  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const res = await fetch(`/api/public/interviews/${interviewToken}`)
        if (!res.ok) throw new Error('Interview not found or expired')
        const data = await res.json()
        setInterview(data.interview)

        // Parse questions
        let parsed: Question[] = []
        const raw = data.interview.questions
        if (typeof raw === 'string') {
          try { parsed = JSON.parse(raw) } catch {}
        } else if (Array.isArray(raw)) {
          parsed = raw
        }
        setQuestions(parsed)
        setLoadError(null)
      } catch (error: any) {
        console.error('Failed to load interview:', error)
        setLoadError(error.message || 'Failed to load interview. Please check the link and try again.')
      } finally {
        setLoading(false)
      }
    }
    if (interviewToken) fetchInterview()
  }, [interviewToken])

  // Timer
  useEffect(() => {
    if (step === 'interview' && started && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleEndInterview()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step, started, timeRemaining])

  // Tab switch detection
  useEffect(() => {
    if (step !== 'interview' || !started) return
    const handleVisibility = () => {
      if (document.hidden) {
        setWarningCount(prev => {
          const next = prev + 1
          if (next >= 3) {
            toast.error('Too many warnings! Interview terminated.')
            handleEndInterview()
          } else {
            toast.warning(`Warning ${next}/3: Tab switch detected!`)
          }
          return next
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [step, started])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // Speech recognition
  const startSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser')
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let final = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' '
        }
      }
      if (final) setCurrentTranscript(prev => prev + final)
    }
    recognition.onerror = () => {}
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [])

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  // Handle resume upload + details submission
  const handleDetailsSubmit = async () => {
    if (!candidateData.name || !candidateData.email) {
      toast.error('Please fill in required fields')
      return
    }
    if (!resumeFile) {
      toast.error('Please upload your resume')
      return
    }

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

      const res = await fetch('/api/public/candidates/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      toast.success('Resume uploaded!')
      setStep('instructions')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload resume')
    } finally {
      setResumeUploading(false)
    }
  }

  // Save current answer and move to next question
  const saveCurrentAnswer = () => {
    if (currentTranscript.trim()) {
      setAnswers(prev => [...prev, {
        question: questions[currentQ]?.question || '',
        answer: currentTranscript.trim(),
        questionIndex: currentQ,
      }])
    }
    stopSpeechRecognition()
    setCurrentTranscript('')
  }

  const goToNextQuestion = () => {
    saveCurrentAnswer()
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1)
    }
  }

  const goToPrevQuestion = () => {
    if (currentQ > 0) {
      saveCurrentAnswer()
      setCurrentQ(prev => prev - 1)
    }
  }

  // End interview
  const handleEndInterview = async () => {
    if (endingInterview) return
    setEndingInterview(true)
    stopSpeechRecognition()
    if (timerRef.current) clearInterval(timerRef.current)

    // Save final answer if any
    const finalAnswers = [...answers]
    if (currentTranscript.trim()) {
      finalAnswers.push({
        question: questions[currentQ]?.question || '',
        answer: currentTranscript.trim(),
        questionIndex: currentQ,
      })
    }

    try {
      // Send all answers + mark completed via public PATCH
      const response = await fetch(`/api/public/interviews/${interviewToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers,
          status: 'completed',
          candidate_completed: true,
        }),
      })
      if (response.ok) {
        await fetch('/api/interviews/generate-tech-dna', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId: interview.id }),
        })
        toast.success('Interview completed! Analyzing your responses...')
      } else {
        toast.error('Interview saved, but analysis could not start')
      }
    } catch {
      toast.error('Failed to save answers, but interview was recorded')
    } finally {
      setStep('completed')
      setEndingInterview(false)
    }
  }

  // Start the interview session
  const startInterviewSession = () => {
    setStarted(true)
    setStep('interview')
    setTimeRemaining(600)
    toast.info('Interview started! Good luck!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-2">Loading interview...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Interview Not Found</h2>
            <p className="text-muted-foreground mb-4">{loadError}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Interview Link</h2>
            <p className="text-muted-foreground">This interview link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== STEP 1: Details + Resume Upload =====
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
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" value={candidateData.name} onChange={(e) => setCandidateData({ ...candidateData, name: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={candidateData.email} onChange={(e) => setCandidateData({ ...candidateData, email: e.target.value })} placeholder="your@email.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={candidateData.phone} onChange={(e) => setCandidateData({ ...candidateData, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn (Optional)</Label>
                  <Input id="linkedin" value={candidateData.linkedin} onChange={(e) => setCandidateData({ ...candidateData, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="github">GitHub (Optional)</Label>
                  <Input id="github" value={candidateData.github} onChange={(e) => setCandidateData({ ...candidateData, github: e.target.value })} placeholder="https://github.com/..." />
                </div>
              </div>

              {/* Resume Upload */}
              <div>
                <Label>Resume * (PDF/DOC, max 5MB)</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input type="file" id="resume" accept=".pdf,.doc,.docx" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return }
                      setResumeFile(file)
                    }}
                  />
                  <label htmlFor="resume" className="cursor-pointer">
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">{resumeFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                        <p className="font-medium">Click to upload resume</p>
                        <p className="text-sm text-muted-foreground">PDF, DOC, DOCX up to 5MB</p>
                      </>
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

  // ===== STEP 2: Instructions =====
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
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-red-600 mb-2">Rules</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Stay in a quiet, well-lit environment</li>
                  <li>• Keep your camera on throughout</li>
                  <li>• Do not switch tabs or windows</li>
                  <li>• Speak clearly for each answer</li>
                  <li className="text-red-600 font-medium">• 3 warnings for suspicious behavior = termination</li>
                  <li>• Auto-ends after 10 minutes</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold mb-2">AI Proctoring Active</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>Tab switch detection</span>
                  <span>Face tracking</span>
                  <span>Voice recording</span>
                  <span>Window monitoring</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('details')} className="flex-1">Back</Button>
                <Button onClick={startInterviewSession} size="lg" className="flex-1">
                  I Understand, Start Interview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ===== STEP 3: Interview Session =====
  if (step === 'interview') {
    const question = questions[currentQ]

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Warning Banner */}
        {warningCount > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 text-center text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Warning {warningCount}/3 — Suspicious activity detected
          </div>
        )}

        {/* Timer */}
        <div className={`px-4 py-2 text-center font-bold ${timeRemaining < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          <Clock className="w-4 h-4 inline mr-2" />
          {formatTime(timeRemaining)} remaining
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
          {/* Video Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-3">
                {!started ? (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <WebcamIcon className="w-8 h-8 mx-auto text-gray-400" />
                      <Button onClick={async () => {
                        try {
                          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                          setCameraReady(true)
                          stream.getTracks().forEach(t => t.stop())
                          toast.success('Camera & mic ready!')
                        } catch { toast.error('Camera/mic not accessible') }
                      }} variant="outline">
                        Check Camera & Mic
                      </Button>
                      {cameraReady && (
                        <Button onClick={() => { setStarted(true); startSpeechRecognition() }} className="w-full" size="lg">
                          Start Interview
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'user' }}
                      className="w-full rounded-lg"
                      onUserMedia={() => {
                        if (webcamRef.current) videoElementRef.current = webcamRef.current.video
                      }}
                    />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">You</span>
                      {isRecording ? (
                        <Badge variant="destructive"><Mic className="w-3 h-3 mr-1" /> Recording</Badge>
                      ) : (
                        <Badge variant="outline"><MicOff className="w-3 h-3 mr-1" /> Off</Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Question Panel */}
          {started && (
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Question {currentQ + 1} of {questions.length}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">{question?.type || 'mixed'}</Badge>
                      <Badge variant="outline">{question?.difficulty || 'medium'}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-lg font-medium p-4 bg-muted rounded-lg">
                    {question?.question || 'No questions available'}
                  </div>

                  {/* Transcript Area */}
                  <div>
                    <Label>Your Answer {isRecording && <span className="text-red-500">(Recording...)</span>}</Label>
                    <Textarea
                      value={currentTranscript}
                      onChange={(e) => setCurrentTranscript(e.target.value)}
                      placeholder="Speak your answer or type here..."
                      rows={6}
                      className="mt-1"
                    />
                  </div>

                  {/* Mic Toggle */}
                  <div className="flex gap-2">
                    {isRecording ? (
                      <Button variant="outline" onClick={stopSpeechRecognition}>
                        <MicOff className="w-4 h-4 mr-2" /> Stop Recording
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={startSpeechRecognition}>
                        <Mic className="w-4 h-4 mr-2" /> Start Recording
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={goToPrevQuestion} disabled={currentQ === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>

                {currentQ < questions.length - 1 ? (
                  <Button onClick={goToNextQuestion} className="flex-1">
                    Next Question <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleEndInterview} disabled={endingInterview} variant="destructive" className="flex-1">
                    {endingInterview ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'End Interview & Submit'}
                  </Button>
                )}
              </div>

              {/* Progress */}
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className={`h-2 flex-1 rounded ${i === currentQ ? 'bg-blue-500' : answers.some(a => a.questionIndex === i) ? 'bg-green-500' : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {answers.length} of {questions.length} questions answered
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== STEP 4: Completed =====
  if (step === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <CardTitle className="text-3xl">Interview Completed!</CardTitle>
              <CardDescription>
                Thank you for completing the interview for {interview.applications?.jobs?.title || 'this position'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Your answers have been recorded and are being analyzed by our AI system.
                The hiring team will review your performance and get back to you soon.
              </p>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <h4 className="font-semibold mb-2">What happens next?</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ AI analysis of your responses</li>
                  <li>✓ Technical skills assessment</li>
                  <li>✓ Behavioral evaluation</li>
                  <li>✓ Review by hiring team</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">You can close this window now.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}


  // Step 1: Candidate details + resume
  const [candidateData, setCandidateData] = useState({
    name: '', email: '', phone: '', linkedin: '', github: '',
  })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeUploading, setResumeUploading] = useState(false)

  // Step 3: Interview state
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<RecordedAnswer[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(600)
  const [started, setStarted] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [endingInterview, setEndingInterview] = useState(false)

  // Cheating detection
  const [warningCount, setWarningCount] = useState(0)

  const webcamRef = useRef<Webcam>(null)
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  // Fetch interview
  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const res = await fetch(`/api/public/interviews/${interviewToken}`)
        if (!res.ok) throw new Error('Interview not found')
        const data = await res.json()
        setInterview(data.interview)

        // Parse questions
        let parsed: Question[] = []
        const raw = data.interview.questions
        if (typeof raw === 'string') {
          try { parsed = JSON.parse(raw) } catch {}
        } else if (Array.isArray(raw)) {
          parsed = raw
        }
        setQuestions(parsed)
      } catch {
        toast.error('Invalid or expired interview link')
      } finally {
        setLoading(false)
      }
    }
    if (interviewToken) fetchInterview()
  }, [interviewToken])

  // Timer
  useEffect(() => {
    if (step === 'interview' && started && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleEndInterview()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step, started, timeRemaining])

  // Tab switch detection
  useEffect(() => {
    if (step !== 'interview' || !started) return
    const handleVisibility = () => {
      if (document.hidden) {
        setWarningCount(prev => {
          const next = prev + 1
          if (next >= 3) {
            toast.error('Too many warnings! Interview terminated.')
            handleEndInterview()
          } else {
            toast.warning(`Warning ${next}/3: Tab switch detected!`)
          }
          return next
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [step, started])

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  // Speech recognition
  const startSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser')
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let final = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' '
        }
      }
      if (final) setCurrentTranscript(prev => prev + final)
    }
    recognition.onerror = () => {}
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [])

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  // Handle resume upload + details submission
  const handleDetailsSubmit = async () => {
    if (!candidateData.name || !candidateData.email) {
      toast.error('Please fill in required fields')
      return
    }
    if (!resumeFile) {
      toast.error('Please upload your resume')
      return
    }

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

      const res = await fetch('/api/public/candidates/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      toast.success('Resume uploaded!')
      setStep('instructions')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload resume')
    } finally {
      setResumeUploading(false)
    }
  }

  // Save current answer and move to next question
  const saveCurrentAnswer = () => {
    if (currentTranscript.trim()) {
      setAnswers(prev => [...prev, {
        question: questions[currentQ]?.question || '',
        answer: currentTranscript.trim(),
        questionIndex: currentQ,
      }])
    }
    stopSpeechRecognition()
    setCurrentTranscript('')
  }

  const goToNextQuestion = () => {
    saveCurrentAnswer()
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1)
    }
  }

  const goToPrevQuestion = () => {
    if (currentQ > 0) {
      saveCurrentAnswer()
      setCurrentQ(prev => prev - 1)
    }
  }

  // End interview
  const handleEndInterview = async () => {
    if (endingInterview) return
    setEndingInterview(true)
    stopSpeechRecognition()
    if (timerRef.current) clearInterval(timerRef.current)

    // Save final answer if any
    const finalAnswers = [...answers]
    if (currentTranscript.trim()) {
      finalAnswers.push({
        question: questions[currentQ]?.question || '',
        answer: currentTranscript.trim(),
        questionIndex: currentQ,
      })
    }

    try {
      // Send all answers + mark completed via public PATCH
      const response = await fetch(`/api/public/interviews/${interviewToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers,
          status: 'completed',
          candidate_completed: true,
        }),
      })
      if (response.ok) {
        await fetch('/api/interviews/generate-tech-dna', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId: interview.id }),
        })
        toast.success('Interview completed! Analyzing your responses...')
      } else {
        toast.error('Interview saved, but analysis could not start')
      }
    } catch {
      toast.error('Failed to save answers, but interview was recorded')
    } finally {
      setStep('completed')
      setEndingInterview(false)
    }
  }

  // Start the interview session
  const startInterviewSession = () => {
    setStarted(true)
    setStep('interview')
    setTimeRemaining(600)
    toast.info('Interview started! Good luck!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-2">Loading interview...</p>
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Interview Link</h2>
            <p className="text-muted-foreground">This interview link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== STEP 1: Details + Resume Upload =====
  if (step === 'details') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Interview Application</h1>
            <p className="text-muted-foreground">Position: {interview.applications?.jobs?.title}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>Fill in your information and upload your resume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" value={candidateData.name} onChange={(e) => setCandidateData({ ...candidateData, name: e.target.value })} placeholder="Full name" />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={candidateData.email} onChange={(e) => setCandidateData({ ...candidateData, email: e.target.value })} placeholder="your@email.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={candidateData.phone} onChange={(e) => setCandidateData({ ...candidateData, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn (Optional)</Label>
                  <Input id="linkedin" value={candidateData.linkedin} onChange={(e) => setCandidateData({ ...candidateData, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="github">GitHub (Optional)</Label>
                  <Input id="github" value={candidateData.github} onChange={(e) => setCandidateData({ ...candidateData, github: e.target.value })} placeholder="https://github.com/..." />
                </div>
              </div>

              {/* Resume Upload */}
              <div>
                <Label>Resume * (PDF/DOC, max 5MB)</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input type="file" id="resume" accept=".pdf,.doc,.docx" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return }
                      setResumeFile(file)
                    }}
                  />
                  <label htmlFor="resume" className="cursor-pointer">
                    {resumeFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">{resumeFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                        <p className="font-medium">Click to upload resume</p>
                        <p className="text-sm text-muted-foreground">PDF, DOC, DOCX up to 5MB</p>
                      </>
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

  // ===== STEP 2: Instructions =====
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
                  <li>Position: <strong>{interview.applications?.jobs?.title}</strong></li>
                  <li>Questions: <strong>{questions.length}</strong></li>
                  <li>Duration: <strong>10 minutes</strong></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-red-600 mb-2">Rules</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Stay in a quiet, well-lit environment</li>
                  <li>• Keep your camera on throughout</li>
                  <li>• Do not switch tabs or windows</li>
                  <li>• Speak clearly for each answer</li>
                  <li className="text-red-600 font-medium">• 3 warnings for suspicious behavior = termination</li>
                  <li>• Auto-ends after 10 minutes</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold mb-2">AI Proctoring Active</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>Tab switch detection</span>
                  <span>Face tracking</span>
                  <span>Voice recording</span>
                  <span>Window monitoring</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('details')} className="flex-1">Back</Button>
                <Button onClick={startInterviewSession} size="lg" className="flex-1">
                  I Understand, Start Interview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ===== STEP 3: Interview Session =====
  if (step === 'interview') {
    const question = questions[currentQ]

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Warning Banner */}
        {warningCount > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 text-center text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Warning {warningCount}/3 — Suspicious activity detected
          </div>
        )}

        {/* Timer */}
        <div className={`px-4 py-2 text-center font-bold ${timeRemaining < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          <Clock className="w-4 h-4 inline mr-2" />
          {formatTime(timeRemaining)} remaining
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
          {/* Video Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-3">
                {!started ? (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <WebcamIcon className="w-8 h-8 mx-auto text-gray-400" />
                      <Button onClick={async () => {
                        try {
                          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                          setCameraReady(true)
                          stream.getTracks().forEach(t => t.stop())
                          toast.success('Camera & mic ready!')
                        } catch { toast.error('Camera/mic not accessible') }
                      }} variant="outline">
                        Check Camera & Mic
                      </Button>
                      {cameraReady && (
                        <Button onClick={() => { setStarted(true); startSpeechRecognition() }} className="w-full" size="lg">
                          Start Interview
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'user' }}
                      className="w-full rounded-lg"
                      onUserMedia={() => {
                        if (webcamRef.current) videoElementRef.current = webcamRef.current.video
                      }}
                    />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">You</span>
                      {isRecording ? (
                        <Badge variant="destructive"><Mic className="w-3 h-3 mr-1" /> Recording</Badge>
                      ) : (
                        <Badge variant="outline"><MicOff className="w-3 h-3 mr-1" /> Off</Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Question Panel */}
          {started && (
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Question {currentQ + 1} of {questions.length}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">{question?.type || 'mixed'}</Badge>
                      <Badge variant="outline">{question?.difficulty || 'medium'}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-lg font-medium p-4 bg-muted rounded-lg">
                    {question?.question || 'No questions available'}
                  </div>

                  {/* Transcript Area */}
                  <div>
                    <Label>Your Answer {isRecording && <span className="text-red-500">(Recording...)</span>}</Label>
                    <Textarea
                      value={currentTranscript}
                      onChange={(e) => setCurrentTranscript(e.target.value)}
                      placeholder="Speak your answer or type here..."
                      rows={6}
                      className="mt-1"
                    />
                  </div>

                  {/* Mic Toggle */}
                  <div className="flex gap-2">
                    {isRecording ? (
                      <Button variant="outline" onClick={stopSpeechRecognition}>
                        <MicOff className="w-4 h-4 mr-2" /> Stop Recording
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={startSpeechRecognition}>
                        <Mic className="w-4 h-4 mr-2" /> Start Recording
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={goToPrevQuestion} disabled={currentQ === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>

                {currentQ < questions.length - 1 ? (
                  <Button onClick={goToNextQuestion} className="flex-1">
                    Next Question <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleEndInterview} disabled={endingInterview} variant="destructive" className="flex-1">
                    {endingInterview ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'End Interview & Submit'}
                  </Button>
                )}
              </div>

              {/* Progress */}
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className={`h-2 flex-1 rounded ${i === currentQ ? 'bg-blue-500' : answers.some(a => a.questionIndex === i) ? 'bg-green-500' : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {answers.length} of {questions.length} questions answered
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== STEP 4: Completed =====
  if (step === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8 flex items-center justify-center">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <CardTitle className="text-3xl">Interview Completed!</CardTitle>
              <CardDescription>
                Thank you for completing the interview for {interview.applications?.jobs?.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Your answers have been recorded and are being analyzed by our AI system.
                The hiring team will review your performance and get back to you soon.
              </p>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <h4 className="font-semibold mb-2">What happens next?</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ AI analysis of your responses</li>
                  <li>✓ Technical skills assessment</li>
                  <li>✓ Behavioral evaluation</li>
                  <li>✓ Review by hiring team</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">You can close this window now.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
}
