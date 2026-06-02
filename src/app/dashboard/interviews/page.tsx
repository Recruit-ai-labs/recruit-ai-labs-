'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, Plus, Video, Play, FileText, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { ScheduleInterviewModal } from "@/components/interviews/schedule-interview-modal"
import { toast } from "sonner"
import { useRouter } from 'next/navigation'

interface Interview {
  id: string
  scheduled_at: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'redlisted'
  cheating_warnings: number
  technical_score: number | null
  communication_score: number | null
  confidence_score: number | null
  body_language_score: number | null
  overall_recommendation: string | null
  tech_dna: any
  applications: {
    candidates: {
      name: string
      email: string
    }
    jobs: {
      title: string
      location: string
    }
  }
}

export default function InterviewsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [upcomingInterviews, setUpcomingInterviews] = useState<Interview[]>([])
  const [pastInterviews, setPastInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchInterviews = async () => {
    try {
      const response = await fetch('/api/interviews')
      if (!response.ok) throw new Error('Failed to fetch interviews')
      
      const data = await response.json()
      setUpcomingInterviews(data.upcoming || [])
      setPastInterviews(data.past || [])
    } catch (error) {
      console.error('Error fetching interviews:', error)
      toast.error('Failed to load interviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInterviews()
  }, [])

  const getStatusBadge = (status: Interview['status']) => {
    const variants: Record<Interview['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'default',
      in_progress: 'secondary',
      completed: 'destructive',
      cancelled: 'outline',
      redlisted: 'destructive',
    }

    const icons = {
      scheduled: <CalendarIcon className="w-3 h-3" />,
      in_progress: <Play className="w-3 h-3" />,
      completed: <FileText className="w-3 h-3" />,
      cancelled: <AlertTriangle className="w-3 h-3" />,
      redlisted: <AlertTriangle className="w-3 h-3" />,
    }

    return (
      <Badge variant={variants[status]} className="gap-1">
        {icons[status]}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interviews</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage candidate interviews</p>
        </div>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Schedule Interview
        </Button>
      </div>

      {/* Upcoming Interviews */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Interviews</CardTitle>
          <CardDescription>Scheduled interviews for the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading interviews...</p>
            </div>
          ) : upcomingInterviews.length > 0 ? (
            <div className="space-y-4">
              {upcomingInterviews.map((interview) => (
                <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <CalendarIcon className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">{interview.applications?.candidates?.name || 'Unknown'}</h3>
                      <p className="text-sm text-muted-foreground">{interview.applications?.jobs?.title || 'Unknown Position'}</p>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span>{formatDate(interview.scheduled_at)}</span>
                        {interview.status === 'scheduled' && (
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3" /> Video Call
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {interview.status === 'scheduled' && (
                      <Button 
                        variant="default"
                        onClick={() => router.push(`/interviews/${interview.id}`)}
                      >
                        Start Interview
                      </Button>
                    )}
                    <Button variant="outline">View Details</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No upcoming interviews scheduled</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Interviews */}
      <Card>
        <CardHeader>
          <CardTitle>Past Interviews</CardTitle>
          <CardDescription>Interview history and feedback</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading interviews...</p>
            </div>
          ) : pastInterviews.length > 0 ? (
            <div className="space-y-4">
              {pastInterviews.map((interview) => (
                <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{interview.applications?.candidates?.name || 'Unknown'}</h3>
                        {getStatusBadge(interview.status)}
                        {interview.cheating_warnings > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {interview.cheating_warnings} warning{interview.cheating_warnings > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{interview.applications?.jobs?.title || 'Unknown Position'}</p>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span>{formatDate(interview.scheduled_at)}</span>
                        {interview.tech_dna && (
                          <span className="text-green-600 font-medium">Tech DNA Generated</span>
                        )}
                      </div>
                      {interview.technical_score && (
                        <div className="flex gap-3 mt-2 text-xs">
                          <span>Technical: {interview.technical_score}/100</span>
                          <span>Communication: {interview.communication_score}/100</span>
                          <span>Confidence: {interview.confidence_score}/100</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {interview.tech_dna ? (
                      <Button variant="default" className="gap-2">
                        <FileText className="w-4 h-4" />
                        View Tech DNA
                      </Button>
                    ) : interview.status === 'completed' ? (
                      <Button variant="secondary">Generate Tech DNA</Button>
                    ) : null}
                    <Button variant="outline">View Details</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No past interviews</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchInterviews}
      />
    </div>
  )
}
