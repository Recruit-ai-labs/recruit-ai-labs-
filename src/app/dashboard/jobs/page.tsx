'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Plus, Search, MapPin, DollarSign, Users, Trash2, Loader2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from 'sonner'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs')
      if (res.ok) {
        const data = await res.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteJob = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this job and all related applications/interviews?')) return
    setDeletingId(jobId)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete')
      }
      toast.success('Job deleted')
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete job')
    } finally {
      setDeletingId(null)
    }
  }

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

      <div className="grid gap-4">
        {loading ? (
          <Card><CardContent className="py-20 text-center"><p className="text-muted-foreground">Loading jobs...</p></CardContent></Card>
        ) : jobs.length > 0 ? (
          jobs.map((job: any) => (
            <div key={job.id} className="relative group">
              <Link href={`/dashboard/jobs/${job.id}`}>
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
              <button
                type="button"
                className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-background/80 border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                onClick={(e) => handleDeleteJob(job.id, e)}
                disabled={deletingId === job.id}
                title="Delete job"
              >
                {deletingId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
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
