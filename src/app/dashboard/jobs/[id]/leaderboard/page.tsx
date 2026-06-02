'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Trophy, Medal, Award, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface LeaderboardEntry {
  interviewId: string
  candidateName: string
  candidateEmail: string
  skills: string[]
  overallScore: number
  technicalScore: number
  communicationScore: number
  confidenceScore: number
  bodyLanguageScore: number
  recommendation: string
  cheatingWarnings: number
  interviewDate: string
  professionalSummary: string
  rank: number
}

export default function JobLeaderboardPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'overall' | 'technical' | 'communication'>('overall')

  useEffect(() => {
    fetchLeaderboard()
  }, [jobId])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/leaderboard`)
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
      setJob(data.job)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      toast.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />
      case 2: return <Medal className="w-6 h-6 text-gray-400" />
      case 3: return <Award className="w-6 h-6 text-amber-600" />
      default: return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRecommendationBadge = (recommendation: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      hire: 'default',
      reject: 'destructive',
      consider: 'secondary',
    }
    return (
      <Badge variant={variants[recommendation] || 'secondary'}>
        {recommendation.toUpperCase()}
      </Badge>
    )
  }

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sortBy === 'technical') return b.technicalScore - a.technicalScore
    if (sortBy === 'communication') return b.communicationScore - a.communicationScore
    return b.overallScore - a.overallScore
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading leaderboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Interview Leaderboard</h1>
          {job && (
            <p className="text-muted-foreground">{job.title} - {leaderboard.length} candidates</p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{leaderboard.length}</div>
            <p className="text-sm text-muted-foreground">Total Interviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {leaderboard.filter(l => l.recommendation === 'hire').length}
            </div>
            <p className="text-sm text-muted-foreground">Recommended to Hire</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {leaderboard.length > 0 
                ? Math.round(leaderboard.reduce((sum, l) => sum + l.overallScore, 0) / leaderboard.length)
                : 0}
            </div>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {leaderboard.filter(l => l.cheatingWarnings > 0).length}
            </div>
            <p className="text-sm text-muted-foreground">With Warnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Sort Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Candidate Rankings</CardTitle>
              <CardDescription>Sorted by interview performance</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'overall' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('overall')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Overall
              </Button>
              <Button
                variant={sortBy === 'technical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('technical')}
              >
                Technical
              </Button>
              <Button
                variant={sortBy === 'communication' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('communication')}
              >
                Communication
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No completed interviews yet</p>
          ) : (
            <div className="space-y-4">
              {sortedLeaderboard.map((entry) => (
                <div
                  key={entry.interviewId}
                  className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                    entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex flex-col items-center min-w-[60px]">
                      {getRankIcon(entry.rank)}
                      <span className="text-xs text-muted-foreground mt-1">
                        of {leaderboard.length}
                      </span>
                    </div>

                    {/* Candidate Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{entry.candidateName}</h3>
                          <p className="text-sm text-muted-foreground">{entry.candidateEmail}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRecommendationBadge(entry.recommendation)}
                          {entry.cheatingWarnings > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {entry.cheatingWarnings}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Overall</div>
                          <div className={`font-bold text-lg ${getScoreColor(entry.overallScore)}`}>
                            {entry.overallScore}%
                          </div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Technical</div>
                          <div className={`font-bold ${getScoreColor(entry.technicalScore)}`}>
                            {entry.technicalScore}%
                          </div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Communication</div>
                          <div className={`font-bold ${getScoreColor(entry.communicationScore)}`}>
                            {entry.communicationScore}%
                          </div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Interview Date</div>
                          <div className="font-semibold text-sm">
                            {formatDate(entry.interviewDate)}
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      {entry.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {entry.skills.slice(0, 6).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {entry.skills.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{entry.skills.length - 6} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Summary Preview */}
                      {entry.professionalSummary && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {entry.professionalSummary.substring(0, 150)}...
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/candidates/${entry.interviewId}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
