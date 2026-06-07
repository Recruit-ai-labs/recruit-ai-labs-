'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function JobDeleteButton({ jobId, onDeleted }: { jobId: string; onDeleted?: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this job? This will also remove all related applications and interviews.')) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete job')
      toast.success('Job deleted successfully')
      if (onDeleted) {
        onDeleted()
      } else {
        router.refresh()
      }
    } catch {
      toast.error('Failed to delete job')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </Button>
  )
}
