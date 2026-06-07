'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WebcamIcon, Mic, MicOff, AlertTriangle, Loader2 } from 'lucide-react'
import Webcam from 'react-webcam'
import { useCheatingDetection } from '@/hooks/use-cheating-detection'
import { useAnswerRecording } from '@/hooks/use-answer-recording'
import { toast } from 'sonner'

export default function InterviewSessionPage() {
  const params = useParams()
  const router = useRouter()
  const interviewId = params.id as string
  
  const [interview, setInterview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [micReady, setMicReady] = useState(false)
  
  const webcamRef = useRef<Webcam>(null)
  const videoElementRef = useRef<HTMLVideoElement>(null)

  // Cheating detection
  const {
    warningCount,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  } = useCheatingDetection({
    interviewId,
    maxWarnings: 3,
    onRedlist: async () => {
      try {
        await fetch(`/api/interviews/${interviewId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'redlisted' }),
        })
      } catch (error) {
        console.error('Failed to update redlist status:', error)
      }
      toast.error('Interview terminated due to cheating')
      router.push('/dashboard/interviews')
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
    interviewId,
    onAnswerAnalyzed: (analysis) => {
      toast.success(`Answer analyzed! Score: ${analysis.score}/100`)
    },
  })

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        const response = await fetch(`/api/interviews/${interviewId}`)
        if (!response.ok) throw new Error('Interview not found')
        
        const data = await response.json()
        setInterview(data.interview)
      } catch (error) {
        toast.error('Failed to load interview')
        router.push('/dashboard/interviews')
      } finally {
        setLoading(false)
      }
    }

    fetchInterview()
  }, [interviewId, router])

  const checkTech = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      setCameraReady(true)
      setMicReady(true)
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      
      toast.success('Camera and microphone ready!')
    } catch (error) {
      toast.error('Camera or microphone not accessible')
    }
  }

  const startInterview = () => {
    setStarted(true)
    startMonitoring()
    startRecording()
    toast.info('Interview started! Good luck!')
  }

  const endInterview = async () => {
    stopRecording()
    stopMonitoring()
    
    try {
      const response = await fetch(`/api/interviews/${interviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!response.ok) throw new Error('Failed to update interview status')

      toast.success('Interview completed! Generating Tech DNA...')

      // Trigger Tech DNA generation
      await fetch('/api/interviews/generate-tech-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      })
    } catch (error) {
      console.error('Error ending interview:', error)
      toast.error('Interview recorded but some post-processing may have failed')
    } finally {
      router.push('/dashboard/interviews')
    }
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
        <p>Interview not found</p>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Interview Preparation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Candidate: {interview.applications?.candidates?.name}</h3>
                <p className="text-muted-foreground">Position: {interview.applications?.jobs?.title}</p>
                <p className="text-muted-foreground">Scheduled: {new Date(interview.scheduledAt).toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Instructions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Ensure you are in a quiet, well-lit environment</li>
                  <li>Keep your camera on throughout the interview</li>
                  <li>Do not switch tabs or windows during the interview</li>
                  <li>Speak clearly and answer each question to the best of your ability</li>
                  <li>You will receive 3 warnings for suspicious behavior before termination</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button onClick={checkTech} variant="outline">
                  <WebcamIcon className="w-4 h-4 mr-2" />
                  Check Camera & Mic
                </Button>
              </div>

              {(cameraReady && micReady) && (
                <Button onClick={startInterview} size="lg" className="w-full">
                  Start Interview
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
