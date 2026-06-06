import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, DollarSign, Calendar } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import ApplyForm from '@/components/public/apply-form'

export default async function PublicJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  let job: any = {
    id,
    title: 'Mock Public Job',
    location: 'Remote',
    salary_min: 50000,
    salary_max: 100000,
    created: new Date().toISOString(),
    description: 'This is a mocked public job description.',
    requirements: 'Mock requirement 1\nMock requirement 2'
  }
  
  if (!job) {
    notFound()
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold">RecruitAI</Link>
            <Link href="/jobs" className="text-primary hover:underline">
              Back to Jobs
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{job.title}</h1>
              <div className="flex flex-wrap gap-4 text-muted-foreground">
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
                  Posted {formatDate(job.created)}
                </span>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>About This Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {job.description.split('\n').map((paragraph: string, i: number) => (
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
                  {job.requirements.split('\n').map((req: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Apply Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <ApplyForm jobId={job.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
