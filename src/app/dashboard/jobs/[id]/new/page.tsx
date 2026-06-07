'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Loader2, Copy, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function CreateInterviewPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [loading, setLoading] = useState(false)
  const [interviewLink, setInterviewLink] = useState<string | null>(null)
  const [interviewId, setInterviewId] = useState<string | null>(null)

  const handleCreateInterview = async () => {
    setLoading(true)
    try {
      // Create with default scheduled date (tomorrow at 2 PM)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(14, 0, 0, 0)

      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobId,
          scheduledAt: tomorrow.toISOString(),
          interviewType: 'technical',
          status: 'scheduled',
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to create interview')
      }

      const data = await response.json()
      const interview = data.interview || data

      const publicToken = interview.publicToken || interview.public_token
      const link = `${window.location.origin}/interview/${publicToken}`

      setInterviewId(interview.id)
      setInterviewLink(link)
      toast.success('Interview created successfully!')
    } catch (error: any) {
      console.error('Error creating interview:', error)
      toast.error(error.message || 'Failed to create interview')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (interviewLink) {
      navigator.clipboard.writeText(interviewLink)
      toast.success('Link copied to clipboard!')
    }
  }

  if (interviewLink) {
    return (
      <div className="space-y-6">
        <Link href={`/dashboard/jobs/${jobId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Job
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Interview Created Successfully!
            </CardTitle>
            <CardDescription>Share this link with candidates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Interview Link:</p>
              <div className="bg-white p-3 rounded border border-gray-200 font-mono text-sm break-all">
                {interviewLink}
              </div>
            </div>

            <Button onClick={copyToClipboard} className="w-full gap-2" size="lg">
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">📋 Next Steps:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Send this link to candidates</li>
                <li>• Candidates can complete the interview without authentication</li>
                <li>• Interview data will be saved to their profile</li>
                <li>• You can view results in the Candidates section</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Link href={`/dashboard/jobs/${jobId}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  Back to Job
                </Button>
              </Link>
              <Button
                onClick={() => {
                  setInterviewLink(null)
                  setInterviewId(null)
                }}
                className="flex-1"
              >
                Create Another Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href={`/dashboard/jobs/${jobId}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Job
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create Interview for This Job</CardTitle>
          <CardDescription>Generate a shareable link for candidates to complete the interview</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-medium mb-2">What happens next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ A unique public link will be generated</li>
                <li>✓ Candidates can access the interview without logging in</li>
                <li>✓ They'll upload resume and complete questions</li>
                <li>✓ AI analysis will be generated automatically</li>
                <li>✓ Results appear in your Candidates section</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Interview Features:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• AI Proctoring (tab switch detection, face tracking)</li>
                <li>• Speech Recognition for answers</li>
                <li>• Tech DNA Generation</li>
                <li>• Automatic scoring & analysis</li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleCreateInterview}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Interview...
              </>
            ) : (
              'Create Interview Link'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
