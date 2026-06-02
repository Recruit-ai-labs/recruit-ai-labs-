"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Upload, Loader2, FileText, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function UploadCandidatePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<any>(null)
  const [manualData, setManualData] = useState({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    skills: "",
    summary: "",
  })
  const [mode, setMode] = useState<'upload' | 'manual'>('upload')

  const handleFileUpload = async () => {
    if (!file) {
      toast.error("Please select a file")
      return
    }

    setUploading(true)
    setParsing(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/nim/parse-resume', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to parse resume')
      }

      const result = await response.json()
      setParseResult(result.candidate)
      toast.success("Resume parsed successfully!")
      
      // Auto-save after parsing
      setTimeout(() => {
        router.push(`/dashboard/candidates/${result.candidate.id}`)
      }, 1500)
    } catch (error: any) {
      toast.error(error.message || "Failed to process resume")
    } finally {
      setUploading(false)
      setParsing(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualData),
      })

      if (!response.ok) throw new Error('Failed to create candidate')

      toast.success("Candidate created successfully")
      router.push('/dashboard/candidates')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to create candidate")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/candidates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Candidate</h1>
          <p className="text-muted-foreground mt-1">Upload a resume or add manually</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          variant={mode === 'upload' ? 'default' : 'outline'}
          onClick={() => setMode('upload')}
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Resume
        </Button>
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          onClick={() => setMode('manual')}
          className="flex-1"
        >
          <FileText className="w-4 h-4 mr-2" />
          Manual Entry
        </Button>
      </div>

      {mode === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Resume</CardTitle>
            <CardDescription>AI will parse the resume automatically using NVIDIA NIM</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="resume-upload"
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {file ? file.name : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF or DOCX (max 10MB)
                </p>
              </label>
            </div>

            {file && (
              <Button
                onClick={handleFileUpload}
                disabled={uploading}
                className="w-full"
                size="lg"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Parsing with AI...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Parse Resume
                  </>
                )}
              </Button>
            )}

            {parseResult && (
              <Card className="mt-4 border-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold">Resume Parsed Successfully</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {parseResult.name}</p>
                    <p><strong>Email:</strong> {parseResult.email}</p>
                    <p><strong>Skills:</strong> {parseResult.parsed_skills?.join(', ')}</p>
                    {parseResult.ai_summary && (
                      <p><strong>AI Summary:</strong> {parseResult.ai_summary}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Manual Candidate Entry</CardTitle>
              <CardDescription>Add candidate information manually</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={manualData.name}
                    onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={manualData.email}
                    onChange={(e) => setManualData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={manualData.phone}
                    onChange={(e) => setManualData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    value={manualData.linkedin}
                    onChange={(e) => setManualData(prev => ({ ...prev, linkedin: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={manualData.skills}
                  onChange={(e) => setManualData(prev => ({ ...prev, skills: e.target.value }))}
                  placeholder="React, TypeScript, Node.js"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={manualData.summary}
                  onChange={(e) => setManualData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief professional summary..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Candidate
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
