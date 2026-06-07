'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, User, Briefcase, Video, ExternalLink, Loader2, Plus, X, Copy, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Interview {
  id: string
  applicationId: string
  scheduledAt: string
  interviewerId: string
  status: string
  questions: string | any[]
  interviewLink: string
  videoLink: string
  createdAt: string
  applications: {
    id: string
    stage: string
    jobs: { id: string; title: string; location: string } | null
    candidates: { id: string; name: string; email: string; phone: string } | null
  } | null
}

interface Job {
  id: string
  title: string
  location: string
  status: string
}

interface Application {
  id: string
  stage: string
  candidates: {
    id: string
    name: string
    email: string
  }
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  redlisted: 'bg-red-100 text-red-800',
}

export default function InterviewsPage() {
  const [upcoming, setUpcoming] = useState<Interview[]>([])
  const [past, setPast] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  // Create Interview Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [fetchingModal, setFetchingModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    jobId: '',
    applicationId: '',
    scheduledAt: '',
    interviewType: 'mixed' as 'technical' | 'behavioral' | 'mixed',
    notes: '',
  })

  useEffect(() => {
    fetchInterviews()
  }, [])

  // Fetch jobs when modal opens
  useEffect(() => {
    if (showCreateModal) {
      fetchJobs()
    }
  }, [showCreateModal])

  // Fetch applications when job is selected
  useEffect(() => {
    if (createForm.jobId) {
      fetchApplicationsForJob(createForm.jobId)
    }
  }, [createForm.jobId])

  const fetchInterviews = async () => {
    try {
      const response = await fetch('/api/interviews')
      if (response.ok) {
        const data = await response.json()
        setUpcoming(data.upcoming || [])
        setPast(data.past || [])
      }
    } catch (error) {
      console.error('Failed to fetch interviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    setFetchingModal(true)
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setFetchingModal(false)
    }
  }

  const fetchApplicationsForJob = async (jobId: string) => {
    setFetchingModal(true)
    try {
      const response = await fetch(`/api/applications?jobId=${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setFetchingModal(false)
    }
  }

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.applicationId || !createForm.scheduledAt) {
      toast.error('Please select a candidate and date')
      return
    }
    setCreating(true)
    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: createForm.applicationId,
          jobId: createForm.jobId,
          scheduledAt: createForm.scheduledAt,
          interviewerId: '',
          interviewType: createForm.interviewType,
          generateQuestions: true,
          notes: createForm.notes,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create interview')
      }
      const data = await response.json()
      setCreatedLink(data.interviewLink)
      toast.success('Interview created successfully!')
      fetchInterviews()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create interview')
    } finally {
      setCreating(false)
    }
  }

  const resetCreateModal = () => {
    setShowCreateModal(false)
    setCreatedLink(null)
    setCreateForm({ jobId: '', applicationId: '', scheduledAt: '', interviewType: 'mixed', notes: '' })
    setApplications([])
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getQuestionCount = (questions: string | any[]) => {
    if (typeof questions === 'string') {
      try {
        return JSON.parse(questions).length
      } catch {
        return 0
      }
    }
    return questions?.length || 0
  }

  const handleDeleteInterview = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this interview?')) return
    try {
      const response = await fetch(`/api/interviews/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      toast.success('Interview deleted')
      fetchInterviews()
    } catch {
      toast.error('Failed to delete interview')
    }
  }

  const renderInterviewCard = (interview: Interview) => (
    <Card key={interview.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {interview.applications?.candidates?.name || 'Unknown Candidate'}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" />
              {interview.applications?.jobs?.title || 'Unknown Position'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[interview.status] || 'bg-gray-100 text-gray-800'}>
              {interview.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => handleDeleteInterview(interview.id, e)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {formatDateTime(interview.scheduledAt)}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {interview.applications?.candidates?.email && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {interview.applications.candidates.email}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getQuestionCount(interview.questions)} questions
          </span>
        </div>

        <div className="flex gap-2 pt-2">
          <Link href={`/interviews/${interview.id}`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Video className="w-3.5 h-3.5" />
              View Session
            </Button>
          </Link>
          {interview.interviewLink && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}${interview.interviewLink}`)
                toast.success('Link copied!')
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Copy Link
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="ml-2 text-muted-foreground">Loading interviews...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interviews</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor candidate interviews
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Interview
        </Button>
      </div>

      {/* Create Interview Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h2 className="text-2xl font-bold">Create Interview</h2>
              <Button variant="ghost" size="icon" onClick={resetCreateModal}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {!createdLink ? (
              <form onSubmit={handleCreateInterview} className="p-6 space-y-6">
                {/* Job Selection */}
                <div className="space-y-2">
                  <Label htmlFor="jobId">Job Position *</Label>
                  {fetchingModal && !jobs.length ? (
                    <div className="text-sm text-muted-foreground">Loading jobs...</div>
                  ) : (
                    <Select
                      value={createForm.jobId}
                      onValueChange={(value: string | null) => setCreateForm({ ...createForm, jobId: value || '', applicationId: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job position" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.length > 0 ? (
                          jobs.map((job) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.title} ({job.location})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            No jobs found. Create a job first.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Candidate Selection */}
                <div className="space-y-2">
                  <Label htmlFor="applicationId">Candidate *</Label>
                  {!createForm.jobId ? (
                    <div className="text-sm text-muted-foreground">Select a job first</div>
                  ) : fetchingModal ? (
                    <div className="text-sm text-muted-foreground">Loading applicants...</div>
                  ) : (
                    <Select
                      value={createForm.applicationId}
                      onValueChange={(value: string | null) => setCreateForm({ ...createForm, applicationId: value || '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a candidate" />
                      </SelectTrigger>
                      <SelectContent>
                        {applications.length > 0 ? (
                          applications.map((app) => (
                            <SelectItem key={app.id} value={app.id}>
                              {app.candidates?.name} ({app.candidates?.email})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            No applicants for this job
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Date and Time */}
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Interview Date & Time *</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={createForm.scheduledAt}
                      onChange={(e) => setCreateForm({ ...createForm, scheduledAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Interview Type */}
                <div className="space-y-2">
                  <Label htmlFor="interviewType">Interview Type</Label>
                  <Select
                    value={createForm.interviewType}
                    onValueChange={(value: any) => setCreateForm({ ...createForm, interviewType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    placeholder="Any special instructions..."
                    rows={2}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={resetCreateModal}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={creating || !createForm.applicationId || !createForm.scheduledAt}>
                    {creating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                    ) : (
                      'Create Interview'
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-green-800 font-semibold">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Interview Link Generated!
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={createdLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(createdLink)
                        toast.success('Link copied!')
                      }}
                      className="gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(createdLink, '_blank')}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </Button>
                  </div>
                  <p className="text-xs text-green-700">
                    Share this link with the candidate. They can access the interview directly.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={resetCreateModal} size="sm">Close</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map(renderInterviewCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No upcoming interviews</p>
                <p className="text-sm text-muted-foreground">
                  Schedule interviews from the job applicants page
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {past.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {past.map(renderInterviewCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No past interviews</p>
                <p className="text-sm text-muted-foreground">
                  Completed interviews will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
