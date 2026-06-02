import { createServerClient } from '@/lib/supabase-server'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, DollarSign, Calendar, Users, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId, orgId } = await auth()

  if (!userId) {
    notFound()
  }

  const supabase = createServerClient()

  const contextId = orgId || await (async () => {
    const { data: user } = await (supabase as any)
      .from('users')
      .select('org_id')
      .eq('id', userId)
      .single()
    return user?.org_id || userId
  })()

  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('org_id', contextId)
    .single()

  if (!job) {
    notFound()
  }

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
            {job.salary_min && job.salary_max && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Posted {formatDate(job.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              0 applicants
            </span>
          </div>
        </div>
        <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
          {job.status}
        </Badge>
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
              {job.salary_min && job.salary_max && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Salary</span>
                  <span>{formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(job.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/dashboard/jobs/${job.id}/applicants`} className="block">
                <Button variant="outline" className="w-full gap-2">
                  <Users className="w-4 h-4" />
                  View Applicants
                </Button>
              </Link>
              <Link href={`/jobs/${job.id}`} className="block">
                <Button variant="outline" className="w-full gap-2">
                  Public Preview
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
