'use client'

import { useState, useEffect } from 'react'
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
import { Calendar, X, Loader2, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface Application {
  id: string
  stage: string
  jobs: {
    id: string
    title: string
  }
  candidates: {
    id: string
    name: string
    email: string
  }
}

interface User {
  id: string
  email: string
  role: string
}

interface ScheduleInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ScheduleInterviewModal({ isOpen, onClose, onSuccess }: ScheduleInterviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    applicationId: '',
    scheduledAt: '',
    interviewerId: '',
    interviewType: 'mixed' as 'technical' | 'behavioral' | 'mixed',
    generateQuestions: true,
    notes: '',
  })
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  // Fetch applications and users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setFetchingData(true)
    try {
      // Fetch applications for candidate selection
      const appsResponse = await fetch('/api/applications?status=new,screening')
      if (appsResponse.ok) {
        const appsData = await appsResponse.json()
        setApplications(appsData.applications || [])
      }

      // Fetch users for interviewer selection
      const usersResponse = await fetch('/api/users')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error)
      toast.error('Failed to load candidate and interviewer data')
    } finally {
      setFetchingData(false)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to schedule interview')
      }

      const data = await response.json()
      
      toast.success('Interview scheduled successfully!')
      
      // Show generated link
      if (data.interviewLink) {
        setGeneratedLink(data.interviewLink)
      }
      
      onSuccess()
      // Don't close modal - let user see and copy the link
      // onClose()
      
      // Reset form
      setFormData({
        applicationId: '',
        scheduledAt: '',
        interviewerId: '',
        interviewType: 'mixed',
        generateQuestions: true,
        notes: '',
      })
      setGeneratedLink(null)
      
      // Refresh data
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule interview')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-2xl font-bold">Schedule Interview</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Application Selection */}
          <div className="space-y-2">
            <Label htmlFor="applicationId">Candidate Application *</Label>
            {fetchingData ? (
              <div className="text-sm text-muted-foreground">Loading applications...</div>
            ) : (
              <Select
                value={formData.applicationId || undefined}
                onValueChange={(value: string | null) => setFormData({ ...formData, applicationId: value || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select candidate application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.length > 0 ? (
                    applications.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.candidates?.name} - {app.jobs?.title}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No applications available
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
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Interviewer */}
          <div className="space-y-2">
            <Label htmlFor="interviewerId">Interviewer *</Label>
            {fetchingData ? (
              <div className="text-sm text-muted-foreground">Loading users...</div>
            ) : (
              <Select
                value={formData.interviewerId || undefined}
                onValueChange={(value: string | null) => setFormData({ ...formData, interviewerId: value || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select interviewer" />
                </SelectTrigger>
                <SelectContent>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} ({user.role})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No users available
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Interview Type */}
          <div className="space-y-2">
            <Label htmlFor="interviewType">Interview Type</Label>
            <Select
              value={formData.interviewType}
              onValueChange={(value: any) => setFormData({ ...formData, interviewType: value })}
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

          {/* Generate Questions Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="generateQuestions"
              checked={formData.generateQuestions}
              onChange={(e) => setFormData({ ...formData, generateQuestions: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="generateQuestions" className="cursor-pointer">
              Auto-generate AI interview questions
            </Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Instructions (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special instructions or notes for the interview..."
              rows={3}
            />
          </div>

          {/* Generated Link Display */}
          {generatedLink && (
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
                  value={generatedLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-green-300 rounded text-sm font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink)
                    toast.success('Link copied to clipboard!')
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
                  onClick={() => window.open(generatedLink, '_blank')}
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
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {generatedLink ? 'Close' : 'Cancel'}
            </Button>
            {!generatedLink && (
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Interview'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
