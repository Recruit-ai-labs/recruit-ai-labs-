'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Award,
  Brain,
  MessageSquare,
  Eye,
  UserCheck
} from 'lucide-react'

interface TechDNAData {
  technical_score: number
  communication_score: number
  confidence_score: number
  body_language_score: number
  strengths: string[]
  weaknesses: string[]
  key_skills: string[]
  experience_level: string
  cultural_fit: string
  overall_recommendation: 'hire' | 'consider' | 'reject'
  detailed_feedback: string
}

interface TechDNADisplayProps {
  techDNA: TechDNAData
  candidateName?: string
  cheatingWarnings?: number
  cheatingEvents?: any[]
}

export function TechDNADisplay({ 
  techDNA, 
  candidateName = 'Candidate',
  cheatingWarnings = 0,
  cheatingEvents = []
}: TechDNADisplayProps) {
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'hire': return 'bg-green-500 text-white'
      case 'consider': return 'bg-yellow-500 text-white'
      case 'reject': return 'bg-red-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Redlisted Warning */}
      {cheatingWarnings >= 3 && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h3 className="font-bold text-lg">CANDIDATE REDLISTED</h3>
                <p className="text-sm">This candidate was flagged for cheating ({cheatingWarnings} warnings)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">{candidateName}</h2>
              <p className="text-muted-foreground mt-1">Technical DNA Assessment</p>
            </div>
            <Badge className={getRecommendationColor(techDNA.overall_recommendation)} style={{ fontSize: '1.1rem', padding: '0.75rem 1.5rem' }}>
              {techDNA.overall_recommendation.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Technical Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getScoreColor(techDNA.technical_score)}`}>
              {techDNA.technical_score}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getScoreBarColor(techDNA.technical_score)}`}
                style={{ width: `${techDNA.technical_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Communication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getScoreColor(techDNA.communication_score)}`}>
              {techDNA.communication_score}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getScoreBarColor(techDNA.communication_score)}`}
                style={{ width: `${techDNA.communication_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getScoreColor(techDNA.confidence_score)}`}>
              {techDNA.confidence_score}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getScoreBarColor(techDNA.confidence_score)}`}
                style={{ width: `${techDNA.confidence_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Body Language
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getScoreColor(techDNA.body_language_score)}`}>
              {techDNA.body_language_score}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getScoreBarColor(techDNA.body_language_score)}`}
                style={{ width: `${techDNA.body_language_score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">out of 100</p>
          </CardContent>
        </Card>
      </div>

      {/* Skills Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Key Skills Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {techDNA.key_skills.map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-sm">
                {skill}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Experience Level: <span className="font-semibold">{techDNA.experience_level}</span>
          </p>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="w-5 h-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {techDNA.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="w-5 h-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {techDNA.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                  <span className="text-sm">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Cultural Fit */}
      <Card>
        <CardHeader>
          <CardTitle>Cultural Fit Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{techDNA.cultural_fit}</p>
        </CardContent>
      </Card>

      {/* Detailed Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-sm whitespace-pre-wrap">{techDNA.detailed_feedback}</p>
          </div>
        </CardContent>
      </Card>

      {/* Cheating Events Report */}
      {cheatingEvents.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Cheating Events Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cheatingEvents.map((event: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-medium text-sm">{event.event_type.replace('_', ' ').toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {event.warning_issued && (
                    <Badge variant="destructive">Warning Issued</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
