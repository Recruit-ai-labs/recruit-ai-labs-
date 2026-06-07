'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Search, Globe, Linkedin, Github, Mail, Phone, MapPin, Loader2,
  UserPlus, CheckCircle2, Download, Filter, Radar, Briefcase,
  ChevronDown, ChevronUp, X, ExternalLink, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface DiscoveredCandidate {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  currentTitle: string
  currentCompany: string
  skills: string[]
  source: 'LinkedIn' | 'GitHub' | 'Web'
  profileUrl: string
  location: { city: string; country: string }
  isOpenToWork: boolean
  willingToRelocate: boolean
  snippet: string
  matchScore?: number
  discoveredAt?: string
}

export default function DiscoverPage() {
  // Form state
  const [jobRole, setJobRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [location, setLocation] = useState('')
  const [skills, setSkills] = useState('')
  const [customSearch, setCustomSearch] = useState('')

  // Results state
  const [candidates, setCandidates] = useState<DiscoveredCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingId, setSavingId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchMode, setSearchMode] = useState<'global' | 'filtered'>('global')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Saved candidates from DB
  const [existingCandidates, setExistingCandidates] = useState<any[]>([])

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await fetch('/api/candidates')
        if (res.ok) {
          const data = await res.json()
          setExistingCandidates(data)
        }
      } catch (err) {
        console.error('Failed to fetch existing candidates:', err)
      }
    }
    fetchExisting()
  }, [])

  const handleDiscover = async () => {
    if (!jobRole && !jobDescription) {
      toast.error('Please enter a job role or description')
      return
    }

    setLoading(true)
    setCandidates([])
    setSavedIds(new Set())

    try {
      const payload: any = {
        jobRole,
        jobDescription,
        customSearch,
      }

      if (searchMode === 'filtered' && location) {
        payload.location = location
      } else {
        payload.location = 'Worldwide'
      }

      if (skills) {
        payload.skills = skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      }

      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Discovery failed')
      }

      setCandidates(data.data || [])
      toast.success(`Found ${data.count || 0} candidates`)
    } catch (err: any) {
      toast.error(err.message || 'Discovery failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCandidate = async (candidate: DiscoveredCandidate) => {
    setSavingId(candidate.id)
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${candidate.firstName} ${candidate.lastName}`,
          email: candidate.email,
          phone: candidate.phone,
          linkedinUrl: candidate.source === 'LinkedIn' ? candidate.profileUrl : null,
          githubUrl: candidate.source === 'GitHub' ? candidate.profileUrl : null,
          parsedSkills: candidate.skills || [],
          parsedExperience: candidate.currentTitle ? [{
            company: candidate.currentCompany || 'Unknown',
            title: candidate.currentTitle || 'Unknown',
            dates: 'Present',
            description: candidate.snippet || '',
          }] : [],
          parsedEducation: [],
          aiSummary: candidate.snippet || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save')
      }

      setSavedIds(prev => new Set(prev).add(candidate.id))
      toast.success(`${candidate.firstName} ${candidate.lastName} saved to candidates`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save candidate')
    } finally {
      setSavingId(null)
    }
  }

  const handleSaveAll = async () => {
    let savedCount = 0
    for (const candidate of candidates) {
      if (!savedIds.has(candidate.id)) {
        await handleSaveCandidate(candidate)
        savedCount++
      }
    }
    toast.success(`Saved ${savedCount} candidates to your pool`)
  }

  const exportToCSV = () => {
    if (candidates.length === 0) return

    const headers = ['Name', 'Email', 'Phone', 'Title', 'Company', 'Skills', 'Source', 'Location', 'Open to Work', 'Profile URL']
    const rows = candidates.map(c => [
      `${c.firstName} ${c.lastName}`,
      c.email,
      c.phone,
      c.currentTitle,
      c.currentCompany,
      (c.skills || []).join('; '),
      c.source,
      `${c.location?.city || ''}, ${c.location?.country || ''}`.trim(),
      c.isOpenToWork ? 'Yes' : 'No',
      c.profileUrl,
    ])

    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `discovered-candidates-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Exported to CSV')
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'LinkedIn': return <Linkedin className="w-4 h-4 text-blue-600" />
      case 'GitHub': return <Github className="w-4 h-4 text-gray-900 dark:text-gray-100" />
      default: return <Globe className="w-4 h-4 text-green-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Radar className="w-8 h-8 text-primary" />
            Discover Candidates
          </h1>
          <p className="text-muted-foreground mt-1">
            OSINT-powered talent discovery across LinkedIn & GitHub worldwide
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={candidates.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={candidates.length === 0 || candidates.every(c => savedIds.has(c.id))}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Save All
          </Button>
        </div>
      </div>

      {/* Search Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5" />
                OSINT Search Parameters
              </CardTitle>
              <CardDescription>
                Find candidates globally or with location filters — powered by Google Search + AI extraction
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={searchMode === 'global' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('global')}
                className="gap-1"
              >
                <Globe className="w-3 h-3" />
                Global
              </Button>
              <Button
                variant={searchMode === 'filtered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1"
              >
                <Filter className="w-3 h-3" />
                With Filters
                {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobRole">Job Role *</Label>
              <Input
                id="jobRole"
                placeholder="e.g. Full Stack Developer, Data Scientist, DevOps Engineer"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Key Skills (comma-separated)</Label>
              <Input
                id="skills"
                placeholder="e.g. React, Node.js, Python, AWS"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobDesc">Job Description (optional, improves results)</Label>
            <Textarea
              id="jobDesc"
              placeholder="Paste job description for more targeted candidate discovery..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Filters (collapsible) */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="location">Location Filter</Label>
                <Input
                  id="location"
                  placeholder="e.g. San Francisco, India, Remote"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customSearch">Custom Search Terms</Label>
                <Input
                  id="customSearch"
                  placeholder="e.g. 'Google', 'MIT', 'open to work'"
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => { setLocation(''); setCustomSearch(''); }}
                  className="gap-1 w-full"
                >
                  <X className="w-3 h-3" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Search button */}
          <Button
            onClick={handleDiscover}
            disabled={loading || (!jobRole && !jobDescription)}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning LinkedIn, GitHub & Professional Networks...
              </>
            ) : (
              <>
                <Radar className="w-4 h-4" />
                Discover Candidates {searchMode === 'global' ? 'Worldwide' : `(Filtered: ${location || 'Custom'})`}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div>
                <p className="text-lg font-medium">Scanning Professional Networks</p>
                <p className="text-sm text-muted-foreground">
                  Searching LinkedIn, GitHub, and web sources for &quot;{jobRole}&quot; candidates...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : candidates.length > 0 ? (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium">{candidates.length} candidates discovered</span>
            <Badge variant="secondary">
              <Linkedin className="w-3 h-3 mr-1" />
              {candidates.filter(c => c.source === 'LinkedIn').length} from LinkedIn
            </Badge>
            <Badge variant="secondary">
              <Github className="w-3 h-3 mr-1" />
              {candidates.filter(c => c.source === 'GitHub').length} from GitHub
            </Badge>
            <Badge variant="secondary">
              <Sparkles className="w-3 h-3 mr-1" />
              {candidates.filter(c => c.isOpenToWork).length} Open to Work
            </Badge>
          </div>

          {/* Candidate cards */}
          <div className="grid gap-4">
            {candidates.map((candidate) => (
              <Card key={candidate.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Main row */}
                  <div className="p-4 flex items-start gap-4">
                    {/* Source icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getSourceIcon(candidate.source)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {candidate.firstName} {candidate.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {candidate.currentTitle} at {candidate.currentCompany || 'Unknown'}
                          </p>
                        </div>
                        {candidate.matchScore && (
                          <Badge variant={candidate.matchScore >= 80 ? 'default' : 'secondary'}>
                            {candidate.matchScore}% match
                          </Badge>
                        )}
                      </div>

                      {/* Contact info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                        {candidate.email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {candidate.email}
                          </span>
                        )}
                        {candidate.phone && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {candidate.phone}
                          </span>
                        )}
                        {candidate.location && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {candidate.location.city}{candidate.location.city && candidate.location.country ? ', ' : ''}{candidate.location.country}
                          </span>
                        )}
                      </div>

                      {/* Skills */}
                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {candidate.skills.map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Status badges */}
                      <div className="flex gap-2 mt-2">
                        {candidate.isOpenToWork && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
                            Open to Work
                          </Badge>
                        )}
                        {candidate.willingToRelocate && (
                          <Badge variant="outline">Willing to Relocate</Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        onClick={() => handleSaveCandidate(candidate)}
                        disabled={savedIds.has(candidate.id) || savingId === candidate.id}
                        size="sm"
                        className="gap-1"
                      >
                        {savingId === candidate.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : savedIds.has(candidate.id) ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Saved
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(expandedId === candidate.id ? null : candidate.id)}
                        className="gap-1 text-xs"
                      >
                        {expandedId === candidate.id ? 'Less' : 'More'}
                      </Button>
                      {candidate.profileUrl && (
                        <a
                          href={candidate.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Profile
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedId === candidate.id && (
                    <div className="px-4 pb-4 pt-2 border-t bg-muted/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Source:</span>{' '}
                          <span className="text-muted-foreground">{candidate.source}</span>
                        </div>
                        <div>
                          <span className="font-medium">Profile URL:</span>{' '}
                          <a
                            href={candidate.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate inline-block max-w-[200px]"
                          >
                            {candidate.profileUrl}
                          </a>
                        </div>
                        {candidate.snippet && (
                          <div className="col-span-full">
                            <span className="font-medium">Summary:</span>{' '}
                            <span className="text-muted-foreground">{candidate.snippet}</span>
                          </div>
                        )}
                        {candidate.discoveredAt && (
                          <div className="col-span-full text-xs text-muted-foreground">
                            Discovered: {new Date(candidate.discoveredAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="flex flex-col items-center gap-4 opacity-50">
              <Radar className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Ready to Discover Talent</p>
                <p className="text-sm text-muted-foreground">
                  Enter a job role above and click Discover to find candidates globally via OSINT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Linkedin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">LinkedIn OSINT</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Searches public LinkedIn profiles with &quot;open to work&quot; signals and extracts contact information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Github className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">GitHub Intelligence</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Finds developer profiles on GitHub with email, contributions, and tech stack analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Global Coverage</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Searches across all regions worldwide. Filter by location, company, or institution for targeted results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
