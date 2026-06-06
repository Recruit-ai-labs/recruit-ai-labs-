import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MapPin, DollarSign } from 'lucide-react'

export default async function PublicJobBoard() {
  let jobs: any[] = []
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold">RecruitAI</Link>
            <div className="flex gap-4">
              <Link href="/sign-in" className="px-4 py-2">Sign In</Link>
              <Link href="/sign-up" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">Post a Job</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Job Listings */}
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Open Positions</h1>
        
        {jobs && jobs.length > 0 ? (
          <div className="grid gap-4">
            {jobs.map((job: any) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span>{job.title}</span>
                      <Badge>{job.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                      {job.salary_min && job.salary_max && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}
                        </div>
                      )}
                      <div>Posted {formatDate(job.created)}</div>
                    </div>
                    <p className="mt-4 text-sm line-clamp-2">{job.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No open positions at the moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
