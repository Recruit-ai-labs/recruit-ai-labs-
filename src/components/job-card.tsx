'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, DollarSign, Users, Trash2, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function JobCard({ job }: { job: any }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this job and all related applications/interviews?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete')
      }
      toast.success('Job deleted')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete job')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="relative group">
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
        className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-background/80 border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
        onClick={handleDelete}
        disabled={deleting}
        title="Delete job"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
