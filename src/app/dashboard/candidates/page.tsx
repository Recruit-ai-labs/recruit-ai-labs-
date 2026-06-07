'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Mail, Phone, Trash2, Loader2 } from "lucide-react"
import { toast } from 'sonner'
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch('/api/candidates')
        if (!response.ok) throw new Error('Failed to load candidates')
        const data = await response.json()
        setCandidates(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchCandidates()
  }, [])

  const handleDeleteCandidate = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this candidate and all related data?')) return
    setDeletingId(id)
    try {
      const response = await fetch(`/api/candidates/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete')
      }
      toast.success('Candidate deleted')
      setCandidates(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete candidate')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground mt-1">Manage your talent pipeline</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Candidate
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search candidates by name, skills, or experience..." className="pl-10" />
            </div>
            <Button variant="outline">AI Match</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="col-span-full">
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground">Loading candidates...</p>
            </CardContent>
          </Card>
        ) : candidates.length > 0 ? (
          candidates.map((candidate: any) => (
            <div key={candidate.id} className="relative group">
              <Link href={`/dashboard/candidates/${candidate.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{candidate.name || 'Unnamed Candidate'}</CardTitle>
                        <CardDescription>{candidate.parsedExperience?.[0]?.title || 'No title'}</CardDescription>
                      </div>
                      {candidate.aiMatchScore != null && (
                        <Badge variant={candidate.aiMatchScore >= 70 ? 'default' : 'secondary'}>
                          {candidate.aiMatchScore}% match
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {candidate.parsedSkills?.slice(0, 3).map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                      {candidate.parsedSkills?.length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{candidate.parsedSkills.length - 3}</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {candidate.email && (
                        <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{candidate.email}</div>
                      )}
                      {candidate.phone && (
                        <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{candidate.phone}</div>
                      )}
                    </div>
                    {candidate.linkedinUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">LinkedIn:</span>
                        <span className="truncate">{candidate.linkedinUrl}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">Added {formatDate(candidate.createdAt)}</div>
                  </CardContent>
                </Card>
              </Link>
              <button
                className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-background/80 border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                onClick={(e) => handleDeleteCandidate(candidate.id, e)}
                disabled={deletingId === candidate.id}
                title="Delete candidate"
              >
                {deletingId === candidate.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground mb-4">No candidates yet</p>
              <p className="text-sm text-muted-foreground mb-4">Upload a resume to get started with AI parsing</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
