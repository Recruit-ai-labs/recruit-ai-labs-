'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { WebcamIcon, Mic, MicOff, AlertTriangle, Loader2, Upload, FileText, CheckCircle, Clock } from 'lucide-react'
import Webcam from 'react-webcam'
import { useCheatingDetection } from '@/hooks/use-cheating-detection'
import { useAnswerRecording } from '@/hooks/use-answer-recording'
import { toast } from 'sonner'

type Step = 'details' | 'upload' | 'instructions' | 'interview' | 'completed'

export default function PublicInterviewPage() {
  const params = useParams()
  const router = useRouter()
  const interviewToken = params.token as string
  
  const [step, setStep] = useState<Step>('details')
  const [interview, setInterview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Candidate details
  const [candidateData, setCandidateData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
  })
  
  // Resume upload
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [candidateId, setCandidateId] = useState<string | null>(null)
  
  // Interview state
  const [started, setStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(600) // 10 minutes in seconds
  
  const webcamRef = useRef<Webcam>(null)
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Cheating detection
  const {
    warningCount,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  } = useCheatingDetection({
    interviewId: interview?.id,
    maxWarnings: 3,
    onRedlist: async () => {
      await fetch(`/api/interviews/${interview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'redlisted' }),
      })
      toast.error('Interview terminated due to cheating')
      setStep('completed')
    },
    videoRef: videoElementRef as any,
  })

  // Answer recording
  const {
    isRecording,
    transcript,
    isAnalyzing,
    startRecording,
    stopRecording,
    submitAnswer,
  } = useAnswerRecording({
    interviewId: interview?.id,
    onAnswerAnalyzed: (analysis) => {
      toast.success(`Answer analyzed! Score: ${analysis.score}/100`)
    },
  })

  // Fetch interview by token
  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const response = await fetch(`/api/public/interviews/${interviewToken}`)
        if (!response.ok) throw new Error('Interview not found')
        
        const data = await response.json()
        setInterview(data.interview)
      } catch (error) {
        toast.error('Invalid or expired interview link')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    if (interviewToken) {
      fetchInterview()
    }
  }, [interviewToken, router])

  // Timer for 10-minute interview
  useEffect(() => {
    if (step === 'interview' && started && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            endInterview()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [step, started, timeRemaining])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle resume upload
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && file.type !== 'application/msword' && 
        file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      toast.error('Please upload a PDF or Word document')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setResumeFile(file)
    setResumeUploading(true)

    try {
      // Upload resume and create candidate
      const formData = new FormData()
      formData.append('resume', file)
      formData.append('name', candidateData.name)
      formData.append('email', candidateData.email)
      formData.append('phone', candidateData.phone)
      formData.append('linkedin', candidateData.linkedin)
      formData.append('github', candidateData.github)
      formData.append('interviewId', interview.id)

      const response = await fetch('/api/public/candidates/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload resume')
      }

      const data = await response.json()
      setCandidateId(data.candidateId)
      toast.success('Resume uploaded successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload resume')
      setResumeFile(null)
    } finally {
      setResumeUploading(false)
    }
  }

  // Start interview
  const startInterview = () => {
    setStarted(true)
    setStep('interview')
    startMonitoring()
    startRecording()
    setTimeRemaining(600) // Reset to 10 minutes
    toast.info('Interview started! Good luck!')
  }

  // End interview
  const endInterview = async () => {
    stopRecording()
    stopMonitoring()
    if (timerRef.current) clearInterval(timerRef.current)
    
    await fetch(`/api/interviews/${interview.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'completed',
        candidate_completed: true,
      }),
    })
    
    toast.success('Interview completed!')
    setStep('completed')
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

  // Step 1: Basic Details
  if (step === 'details') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Interview Application</CardTitle>
              <CardDescription>
                Position: {interview.applications?.jobs?.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={candidateData.name}
                    onChange={(e) => setCandidateData({ ...candidateData, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={candidateData.email}
                    onChange={(e) => setCandidateData({ ...candidateData, email: e.target.value })}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={candidateData.phone}
                    onChange={(e) => setCandidateData({ ...candidateData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn URL (Optional)</Label>
                  <Input
                    id="linkedin"
                    value={candidateData.linkedin}
                    onChange={(e) => setCandidateData({ ...candidateData, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div>
                  <Label htmlFor="github">GitHub URL (Optional)</Label>
                  <Input
                    id="github"
                    value={candidateData.github}
                    onChange={(e) => setCandidateData({ ...candidateData, github: e.target.value })}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  if (!candidateData.name || !candidateData.email) {
                    toast.error('Please fill in required fields')
                    return
                  }
                  setStep('upload')
                }}
                size="lg"
                className="w-full"
              >
                Next: Upload Resume
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Step 2: Resume Upload
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Upload Your Resume</CardTitle>
              <CardDescription>
                Upload your resume (PDF or Word, max 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="resume"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  className="hidden"
                  disabled={resumeUploading}
                />
                <label htmlFor="resume" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-semibold mb-2">
                    {resumeUploading ? 'Uploading...' : resumeFile ? resumeFile.name : 'Click to upload your resume'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOC, DOCX up to 5MB
                  </p>
                </label>
              </div>

              {resumeFile && !resumeUploading && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800 font-medium">Resume uploaded successfully!</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setStep('instructions')}
                  disabled={!resumeFile || resumeUploading}
                  className="flex-1"
                >
                  Next: Instructions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Step 3: Instructions
  if (step === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Interview Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Interview Details:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Position: {interview.applications?.jobs?.title}</li>
                    <li>• Duration: 10 minutes</li>
                    <li>• Questions: {(interview.questions || []).length} questions</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-red-600">Important Rules:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Ensure you are in a quiet, well-lit environment</li>
                    <li>Keep your camera on throughout the interview</li>
                    <li>Do not switch tabs or windows during the interview</li>
                    <li>Speak clearly and answer each question to the best of your ability</li>
                    <li className="text-red-600 font-medium">You will receive 3 warnings for suspicious behavior before termination</li>
                    <li>The interview will automatically end after 10 minutes</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold mb-2">Anti-Cheating Measures:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>✓ Tab switching detection</li>
                    <li>✓ Face tracking</li>
                    <li>✓ Voice recording</li>
                    <li>✓ Eye movement monitoring</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => {
                    toast.success('Instructions acknowledged!')
                    setStep('interview')
                  }}
                  size="lg"
                  className="flex-1"
                >
                  I Understand, Continue to Interview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Pre-interview setup (camera/mic check)
  if (step === 'interview' && !started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Interview Preparation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Candidate: {candidateData.name}</h3>
                <p className="text-muted-foreground">Position: {interview.applications?.jobs?.title}</p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: true, 
                        audio: true 
                      })
                      setCameraReady(true)
                      setMicReady(true)
                      stream.getTracks().forEach(track => track.stop())
                      toast.success('Camera and microphone ready!')
                    } catch (error) {
                      toast.error('Camera or microphone not accessible')
                    }
                  }}
                  variant="outline"
                >
                  <WebcamIcon className="w-4 h-4 mr-2" />
                  Check Camera & Mic
                </Button>
              </div>

              {(cameraReady && micReady) && (
                <Button onClick={startInterview} size="lg" className="w-full">
                  Start Interview (10 minutes)
                </Button>
              )}

              <div className="flex gap-4 text-sm">
                <Badge variant={cameraReady ? 'default' : 'outline'}>
                  {cameraReady ? '✓ Camera Ready' : 'Camera Not Checked'}
                </Badge>
                <Badge variant={micReady ? 'default' : 'outline'}>
                  {micReady ? '✓ Mic Ready' : 'Mic Not Checked'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Active Interview
  if (step === 'interview' && started) {
    const questions = interview.questions || []
    const currentQuestion = questions[currentQuestionIndex]

    return (
      <div className="min-h-screen bg-background">
        {/* Warning Banner */}
        {warningCount > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 text-center">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Warning: {warningCount}/3 - Suspicious activity detected!
          </div>
        )}

        {/* Timer Banner */}
        <div className={`px-4 py-2 text-center font-bold text-lg ${
          timeRemaining < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
        }`}>
          <Clock className="w-5 h-5 inline mr-2" />
          Time Remaining: {formatTime(timeRemaining)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Video Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: 'user',
                  }}
                  className="w-full rounded-lg"
                  onUserMedia={() => {
                    if (webcamRef.current) {
                      videoElementRef.current = webcamRef.current.video
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">You</span>
                  <div className="flex gap-2">
                    {isRecording ? (
                      <Badge variant="destructive">
                        <Mic className="w-3 h-3 mr-1" /> Recording
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <MicOff className="w-3 h-3 mr-1" /> Muted
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                  <Badge>{currentQuestion?.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-lg font-medium">
                  {currentQuestion?.question || 'No questions available'}
                </div>

                {transcript && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-semibold mb-2">Your Answer (Live Transcript):</p>
                    <p className="text-sm">{transcript}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => submitAnswer(transcript, currentQuestion?.expected_answer || '', currentQuestion?.evaluation_criteria || [])}
                    disabled={!transcript || isAnalyzing}
                    className="flex-1"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Submit Answer'
                    )}
                  </Button>
                  {currentQuestionIndex < questions.length - 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    >
                      Next Question
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={endInterview}
                className="flex-1"
              >
                End Interview
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Completed
  if (step === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
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
                Your answers have been recorded and are being analyzed. Our team will review your performance and get back to you soon.
              </p>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold mb-2">What happens next?</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ AI analysis of your responses</li>
                  <li>✓ Technical skills assessment</li>
                  <li>✓ Behavioral evaluation</li>
                  <li>✓ Review by hiring team</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
