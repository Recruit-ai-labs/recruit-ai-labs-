import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, DollarSign, Calendar, Users, FileText, Plus } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { readDatabase, type FullDB } from '@/lib/data-store'
import { InterviewLinksDisplay as InterviewLinks } from '@/components/interview-links-display'
import JobDeleteButton from '@/components/job-delete-button'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let userId: string | null = null
  try {
    const authResult = await auth()
    userId = authResult.userId
  } catch (error) {
    console.error('Auth error in JobDetailPage:', error)
  }

  if (!userId) {
    notFound()
  }

  // Fetch actual job from database
  let db: FullDB
  try {
    db = await readDatabase()
  } catch (error) {
    console.error('Failed to read database in JobDetailPage:', error)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/jobs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-medium">Failed to load job data. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const job = db.jobs.find(j => j.id === id)
  
  if (!job) {
    notFound()
  }

  // Fetch interviews for this job
  const interviews = db.interviews.filter(i => {
    const app = db.applications.find(a => a.id === i.applicationId)
    return app && app.jobId === id
  }) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/jobs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {job.location}
            </span>
            {(job.salaryMin || job.salary_min) && (job.salaryMax || job.salary_max) && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {formatCurrency(job.salaryMin || job.salary_min)} - {formatCurrency(job.salaryMax || job.salary_max)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Posted {formatDate(job.createdAt || job.created_at || job.created)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {interviews.length} interview{interviews.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
            {job.status}
          </Badge>
          <JobDeleteButton jobId={job.id} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Job Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none text-muted-foreground">
                {job.description?.split('\n').map((paragraph: string, i: number) => (
                  <p key={i} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {job.requirements?.split('\n').map((req: string, i: number) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">{req}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Interviews Section */}
          <InterviewLinks interviews={interviews} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>{job.status}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span>{job.location}</span>
              </div>
              {(job.salaryMin || job.salary_min) && (job.salaryMax || job.salary_max) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Salary</span>
                  <span>{formatCurrency(job.salaryMin || job.salary_min)} - {formatCurrency(job.salaryMax || job.salary_max)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(job.createdAt || job.created_at || job.created)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/dashboard/jobs/${job.id}/new`} className="block">
                <Button className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Create Interview
                </Button>
              </Link>
              <Link href={`/dashboard/jobs/${job.id}/applicants`} className="block">
                <Button variant="outline" className="w-full gap-2">
                  <Users className="w-4 h-4" />
                  View Applicants
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
