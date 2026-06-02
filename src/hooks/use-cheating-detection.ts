import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

export interface CheatingEvent {
  eventType: 'tab_switch' | 'face_missing' | 'multiple_faces' | 'phone_detected' | 'no_speaking'
  timestamp: string
  screenshotUrl?: string
}

interface UseCheatingDetectionProps {
  interviewId: string
  maxWarnings: number
  onRedlist: () => void
  videoRef?: React.RefObject<HTMLVideoElement>
}

export function useCheatingDetection({
  interviewId,
  maxWarnings,
  onRedlist,
  videoRef,
}: UseCheatingDetectionProps) {
  const [warningCount, setWarningCount] = useState(0)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [faceDetected, setFaceDetected] = useState(true)
  const tabAwayTimeRef = useRef<number>(0)
  const faceMissingDurationRef = useRef<number>(0)
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastWarningTimeRef = useRef<number>(0)

  const logCheatingEvent = useCallback(async (eventType: CheatingEvent['eventType'], screenshotUrl?: string) => {
    const now = new Date().toISOString()
    const event: CheatingEvent = {
      eventType,
      timestamp: now,
      screenshotUrl,
    }

    // Send to backend
    try {
      await fetch(`/api/interviews/${interviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cheatingEvent: {
            eventType,
            screenshotUrl,
            warningIssued: true,
          },
        }),
      })
    } catch (error) {
      console.error('Failed to log cheating event:', error)
    }

    return event
  }, [interviewId])

  const issueWarning = useCallback(async (eventType: CheatingEvent['eventType'], message: string) => {
    // Prevent spam warnings (min 5 seconds between warnings)
    const now = Date.now()
    if (now - lastWarningTimeRef.current < 5000) {
      return
    }
    lastWarningTimeRef.current = now

    const newCount = warningCount + 1
    setWarningCount(newCount)

    await logCheatingEvent(eventType)

    toast.warning(`Warning ${newCount}/${maxWarnings}: ${message}`, {
      duration: 5000,
    })

    if (newCount >= maxWarnings) {
      toast.error('Maximum warnings reached! Interview terminated.', {
        duration: 10000,
      })
      onRedlist()
    }
  }, [warningCount, maxWarnings, onRedlist, logCheatingEvent])

  // Tab switch detection
  useEffect(() => {
    if (!isMonitoring) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabAwayTimeRef.current = Date.now()
      } else {
        const awayDuration = Date.now() - tabAwayTimeRef.current
        
        // If away for more than 5 seconds, issue warning
        if (awayDuration > 5000) {
          issueWarning('tab_switch', `Tab switch detected! You were away for ${Math.round(awayDuration / 1000)}s`)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isMonitoring, issueWarning])

  // Face detection (simplified - in production, integrate face-api.js)
  useEffect(() => {
    if (!isMonitoring || !videoRef?.current) return

    const detectFace = async () => {
      // This is a placeholder - implement actual face detection with face-api.js
      // For now, we'll simulate face detection logic
      
      // In production:
      // 1. Load face-api.js models
      // 2. Run detection on video stream every 500ms
      // 3. Check for: no face, multiple faces, face not centered
      
      // Simulated logic:
      const facePresent = true // Replace with actual detection
      const multipleFaces = false // Replace with actual detection

      if (!facePresent) {
        faceMissingDurationRef.current += 500
        
        if (faceMissingDurationRef.current > 10000) {
          issueWarning('face_missing', 'No face detected for 10+ seconds!')
          faceMissingDurationRef.current = 0
        }
      } else {
        faceMissingDurationRef.current = 0
        setFaceDetected(true)
      }

      if (multipleFaces) {
        issueWarning('multiple_faces', 'Multiple faces detected!')
      }
    }

    monitoringIntervalRef.current = setInterval(detectFace, 500)

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current)
      }
    }
  }, [isMonitoring, videoRef, issueWarning])

  // Window blur detection (candidate switching windows)
  useEffect(() => {
    if (!isMonitoring) return

    const handleBlur = () => {
      tabAwayTimeRef.current = Date.now()
    }

    const handleFocus = () => {
      const awayDuration = Date.now() - tabAwayTimeRef.current
      if (awayDuration > 5000) {
        issueWarning('tab_switch', `Window switch detected!`)
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isMonitoring, issueWarning])

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
    setWarningCount(0)
    toast.info('Proctoring monitoring started')
  }, [])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current)
    }
  }, [])

  const resetWarnings = useCallback(() => {
    setWarningCount(0)
  }, [])

  return {
    warningCount,
    isMonitoring,
    faceDetected,
    startMonitoring,
    stopMonitoring,
    resetWarnings,
  }
}
