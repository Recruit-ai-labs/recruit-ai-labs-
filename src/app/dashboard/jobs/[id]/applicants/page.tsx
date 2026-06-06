import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const stageColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  screening: 'bg-yellow-100 text-yellow-800',
  interview: 'bg-purple-100 text-purple-800',
  offer: 'bg-green-100 text-green-800',
  hired: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
}

export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId, orgId } = await auth()

  if (!userId) {
    notFound()
  }

  let job: any = {
    id,
    title: 'Mock Job',
  }

  let applications: any[] = []


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/jobs/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Job
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{job.title} — Applicants</h1>
        <p className="text-muted-foreground mt-1">
          {applications?.length || 0} applicant{(applications?.length || 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {applications && applications.length > 0 ? (
        <div className="grid gap-4">
          {applications.map((app: any) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{app.candidates?.name || 'Unknown'}</CardTitle>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      {app.candidates?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {app.candidates.email}
                        </span>
                      )}
                      {app.candidates?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {app.candidates.phone}
                        </span>
                      )}
                      {app.candidates?.linkedin_url && (
                        <a href={app.candidates.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          LinkedIn
                        </a>
                      )}
                      {app.candidates?.github_url && (
                        <a href={app.candidates.github_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          GitHub
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.candidates?.ai_match_score != null && (
                      <Badge variant="outline" className="font-semibold">
                        {app.candidates.ai_match_score}% match
                      </Badge>
                    )}
                    <Badge className={stageColors[app.stage] || 'bg-gray-100 text-gray-800'}>
                      {app.stage}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {app.candidates?.parsed_skills?.slice(0, 8).map((skill: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                  {app.candidates?.parsed_skills?.length > 8 && (
                    <Badge variant="secondary" className="text-xs">+{app.candidates.parsed_skills.length - 8} more</Badge>
                  )}
                </div>
                {app.candidates?.ai_summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{app.candidates.ai_summary}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Applied {formatDate(app.applied_at || app.created)}
                  </span>
                  {app.candidates?.resume_url && (
                    <a href={app.candidates.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <FileText className="w-3.5 h-3.5" />
                      View Resume
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-20 text-center">
            <p className="text-muted-foreground mb-4">No applicants yet</p>
            <p className="text-sm text-muted-foreground">
              Share the job posting or activate it to start receiving applications.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
