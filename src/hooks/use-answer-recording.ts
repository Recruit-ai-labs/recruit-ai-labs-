import { useState, useRef, useCallback } from 'react'

export interface AnswerAnalysis {
  score: number
  strengths: string[]
  weaknesses: string[]
  feedback: string
  recommendation: 'hire' | 'consider' | 'reject'
}

interface UseAnswerRecordingProps {
  interviewId: string
  onAnswerAnalyzed: (analysis: AnswerAnalysis) => void
}

export function useAnswerRecording({ interviewId, onAnswerAnalyzed }: UseAnswerRecordingProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Start media recording
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start()

      // Start speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript)
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
        }

        recognitionRef.current = recognition
        recognition.start()
      }

      setIsRecording(true)
      setTranscript('')
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }, [])

  const stopRecording = useCallback(() => {
    // Stop media recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    setIsRecording(false)
  }, [])

  const submitAnswer = useCallback(async (
    question: string,
    expectedAnswer: string,
    evaluationCriteria: string[]
  ) => {
    if (!transcript.trim()) {
      throw new Error('No answer recorded')
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/interviews/analyze-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          answer: transcript,
          expectedAnswer,
          evaluationCriteria,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze answer')
      }

      const data = await response.json()
      const analysis: AnswerAnalysis = data.analysis

      // Save answer to interview
      await fetch(`/api/interviews/${interviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: {
            question,
            answer: transcript,
            score: analysis.score,
            strengths: analysis.strengths,
            weaknesses: analysis.weaknesses,
            feedback: analysis.feedback,
            recommendation: analysis.recommendation,
          },
        }),
      })

      onAnswerAnalyzed(analysis)
      setTranscript('')
      
      return analysis
    } catch (error: any) {
      console.error('Answer submission error:', error)
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }, [transcript, interviewId, onAnswerAnalyzed])

  const resetTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isRecording,
    transcript,
    isAnalyzing,
    startRecording,
    stopRecording,
    submitAnswer,
    resetTranscript,
  }
}
