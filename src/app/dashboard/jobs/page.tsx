import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Plus, Search, MapPin, DollarSign, Users } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { auth } from '@clerk/nextjs/server'
import { readDatabase } from '@/lib/data-store'

export default async function JobsPage() {
  const { userId, orgId } = await auth()
  const db = await readDatabase()
  const jobs = db.jobs || []

  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground mt-1">Manage your job postings</p>
        </div>
        <Link href="/dashboard/jobs/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search jobs..." className="pl-10" />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="grid gap-4">
        {jobs.length > 0 ? (
          jobs.map((job: any) => (
            <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      <CardDescription className="mt-1">{job.location}</CardDescription>
                    </div>
                    <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                      {job.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                    {(job.salaryMin || job.salary_min) && (job.salaryMax || job.salary_max) && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(job.salaryMin || job.salary_min)} - {formatCurrency(job.salaryMax || job.salary_max)}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      0 applicants
                    </div>
                    <div>Posted {formatDate(job.createdAt || job.created_at)}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground mb-4">No jobs posted yet</p>
              <Link href="/dashboard/jobs/new">
                <Button>Post Your First Job</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
