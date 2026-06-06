'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, Download, FileText, AlertTriangle, CheckCircle, 
  XCircle, Minus, Video, Calendar, Mail, Phone, Link as LinkIcon
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { TechDNADisplay } from '@/components/interviews/tech-dna-display'

export default function CandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string

  const [candidate, setCandidate] = useState<any>(null)
  const [interviews, setInterviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInterview, setSelectedInterview] = useState<any>(null)
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)

  useEffect(() => {
    fetchCandidateData()
  }, [candidateId])

  const fetchCandidateData = async () => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`)
      if (!response.ok) throw new Error('Failed to fetch candidate')
      
      const data = await response.json()
      setCandidate(data.candidate)
      setInterviews(data.interviews || [])
    } catch (error) {
      console.error('Error fetching candidate:', error)
      toast.error('Failed to load candidate data')
    } finally {
      setLoading(false)
    }
  }

  const exportToInterviewTxt = (interview: any) => {
    const answers = interview.answers || []
    let content = `INTERVIEW TRANSCRIPT\n`
    content += `==================\n\n`
    content += `Candidate: ${interview.applications?.candidates?.name}\n`
    content += `Position: ${interview.applications?.jobs?.title}\n`
    content += `Date: ${new Date(interview.createdAt || interview.created_at).toLocaleString()}\n`
    content += `Overall Score: ${interview.technicalScore ?? interview.technical_score || 'N/A'}/100\n`
    content += `Recommendation: ${interview.overallRecommendation || interview.overall_recommendation || 'N/A'}\n`
    content += `Cheating Warnings: ${interview.cheatingWarnings ?? interview.cheating_warnings || 0}\n\n`
    
    if (interview.professional_summary || interview.aiSummary || interview.ai_summary) {
      content += `PROFESSIONAL SUMMARY:\n${interview.professional_summary || interview.aiSummary || interview.ai_summary}\n\n`
    }
    
    content += `==================\n`
    content += `QUESTIONS & ANSWERS\n`
    content += `==================\n\n`
    
    answers.forEach((a: any, i: number) => {
      content += `Q${i + 1}: ${a.question}\n`
      content += `Type: ${a.type} | Difficulty: ${a.difficulty}\n`
      content += `Score: ${a.score}/100\n\n`
      content += `Candidate Answer:\n${a.answer}\n\n`
      content += `Strengths: ${(a.strengths || []).join(', ')}\n`
      content += `Weaknesses: ${(a.weaknesses || []).join(', ')}\n`
      content += `Feedback: ${a.feedback}\n`
      content += `\n${'='.repeat(50)}\n\n`
    })

    content += `CHEATING EVENTS:\n`
    const cheatingEvents = interview.cheating_events || []
    if (cheatingEvents.length > 0) {
      cheatingEvents.forEach((e: any, i: number) => {
        content += `${i + 1}. ${e.event_type} at ${new Date(e.timestamp).toLocaleString()}\n`
      })
    } else {
      content += `No cheating events detected\n`
    }
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview-${candidate?.name}-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Interview transcript exported!')
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'hire': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'reject': return <XCircle className="w-4 h-4 text-red-600" />
      default: return <Minus className="w-4 h-4 text-yellow-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading candidate data...</p>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Candidate not found</p>
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
          <h1 className="text-3xl font-bold">{candidate.name}</h1>
          <p className="text-muted-foreground">Candidate Profile & Interview History</p>
        </div>
      </div>

      {/* Candidate Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{candidate.email}</span>
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{candidate.phone}</span>
              </div>
            )}
            {(candidate.linkedinUrl || candidate.linkedin_url) && (
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <a href={candidate.linkedinUrl || candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  LinkedIn Profile
                </a>
              </div>
            )}
            {(candidate.githubUrl || candidate.github_url) && (
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <a href={candidate.githubUrl || candidate.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  GitHub Profile
                </a>
              </div>
            )}
          </div>

          {(candidate.parsedSkills || candidate.parsed_skills)?.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {(candidate.parsedSkills || candidate.parsed_skills).map((skill: string, i: number) => (
                  <Badge key={i} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {(candidate.resumeUrl || candidate.resume_url) && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold mb-2">Resume</h4>
              <Button variant="outline" onClick={() => window.open(candidate.resumeUrl || candidate.resume_url, '_blank')}>
                <FileText className="w-4 h-4 mr-2" />
                Download Resume
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interviews */}
      <Card>
        <CardHeader>
          <CardTitle>Interview History ({interviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {interviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No interviews yet</p>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <div key={interview.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{interview.applications?.jobs?.title}</h3>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(interview.created_at)}
                        </span>
                        <span>Status: {interview.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={interview.status === 'completed' ? 'default' : 'outline'}>
                        {interview.status}
                      </Badge>
                      {(interview.cheatingWarnings ?? interview.cheating_warnings) > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {interview.cheatingWarnings ?? interview.cheating_warnings} warnings
                        </Badge>
                      )}
                      {(interview.overallRecommendation || interview.overall_recommendation) && (
                        <Badge variant={
                          (interview.overallRecommendation || interview.overall_recommendation) === 'hire' ? 'default' :
                          (interview.overallRecommendation || interview.overall_recommendation) === 'reject' ? 'destructive' :
                          'secondary'
                        } className="gap-1">
                          {getRecommendationIcon(interview.overallRecommendation || interview.overall_recommendation)}
                          {(interview.overallRecommendation || interview.overall_recommendation).toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* AI Summary - shown inline */}
                  {interview.professional_summary && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">AI Summary</h4>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedSummary(expandedSummary === interview.id ? null : interview.id)}>
                          {expandedSummary === interview.id ? 'Collapse' : 'Expand'}
                        </Button>
                      </div>
                      {expandedSummary === interview.id ? (
                        <p className="text-sm whitespace-pre-wrap">{interview.professional_summary}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground line-clamp-2">{interview.professional_summary.substring(0, 150)}...</p>
                      )}
                    </div>
                  )}

                  {/* Scores */}
                  {(interview.technicalScore != null || interview.technical_score != null) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="p-3 bg-muted rounded">
                        <div className="text-muted-foreground">Technical</div>
                        <div className="font-bold text-lg">{interview.technicalScore ?? interview.technical_score}/100</div>
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <div className="text-muted-foreground">Communication</div>
                        <div className="font-bold text-lg">{interview.communicationScore ?? interview.communication_score || 'N/A'}/100</div>
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <div className="text-muted-foreground">Confidence</div>
                        <div className="font-bold text-lg">{interview.confidenceScore ?? interview.confidence_score || 'N/A'}/100</div>
                      </div>
                      <div className="p-3 bg-muted rounded">
                        <div className="text-muted-foreground">Body Language</div>
                        <div className="font-bold text-lg">{interview.bodyLanguageScore ?? interview.body_language_score || 'N/A'}/100</div>
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  {(interview.overallRecommendation || interview.overall_recommendation) && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Recommendation:</span>
                      <Badge variant={
                        (interview.overallRecommendation || interview.overall_recommendation) === 'hire' ? 'default' :
                        (interview.overallRecommendation || interview.overall_recommendation) === 'reject' ? 'destructive' :
                        'secondary'
                      } className="gap-1">
                        {getRecommendationIcon(interview.overallRecommendation || interview.overall_recommendation)}
                        {(interview.overallRecommendation || interview.overall_recommendation).toUpperCase()}
                      </Badge>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInterview(interview)}
                    >
                      View Full Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToInterviewTxt(interview)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Q&A (.txt)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interview Detail Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Interview Details</h2>
              <Button variant="ghost" onClick={() => setSelectedInterview(null)}>
                Close
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <Tabs defaultValue="summary">
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="tech-dna">Tech DNA</TabsTrigger>
                  <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
                  <TabsTrigger value="body-language">Body Language</TabsTrigger>
                  <TabsTrigger value="qa">Q&A ({(selectedInterview.answers || []).length})</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  {(selectedInterview.professional_summary || selectedInterview.aiSummary || selectedInterview.ai_summary) ? (
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{selectedInterview.professional_summary || selectedInterview.aiSummary || selectedInterview.ai_summary}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No summary generated yet</p>
                  )}
                </TabsContent>

                <TabsContent value="tech-dna">
                  {(selectedInterview.tech_dna || selectedInterview.techDna) ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedInterview.tech_dna || selectedInterview.techDna).map(([key, value]) => (
                          <div key={key} className="p-4 border rounded-lg">
                            <h4 className="font-semibold capitalize mb-2">
                              {key.replace(/_/g, ' ')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Tech DNA not available</p>
                  )}
                </TabsContent>

                <TabsContent value="behavioral" className="space-y-4">
                  {selectedInterview.behavioral_analysis ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedInterview.behavioral_analysis).map(([key, value]) => (
                        <div key={key} className="p-4 border rounded-lg">
                          <h4 className="font-semibold capitalize mb-2">
                            {key.replace(/_/g, ' ')}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Behavioral analysis not available</p>
                  )}
                </TabsContent>

                <TabsContent value="body-language" className="space-y-4">
                  {selectedInterview.body_language_analysis ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(selectedInterview.body_language_analysis).map(([key, value]) => (
                        <div key={key} className="p-4 border rounded-lg">
                          <h4 className="font-semibold capitalize mb-2">
                            {key.replace(/_/g, ' ')}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Body language analysis not available</p>
                  )}
                </TabsContent>

                <TabsContent value="qa" className="space-y-4">
                  {(selectedInterview.answers || []).map((answer: any, i: number) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Question {i + 1}</h4>
                        <Badge>{answer.score}/100</Badge>
                      </div>
                      <p className="text-sm font-medium">{answer.question}</p>
                      <div className="p-3 bg-muted rounded">
                        <p className="text-xs font-semibold mb-1">Answer:</p>
                        <p className="text-sm">{answer.answer}</p>
                      </div>
                      {answer.feedback && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold">Feedback:</span> {answer.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
