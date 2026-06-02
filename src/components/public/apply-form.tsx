"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface ApplyFormProps {
  jobId: string
}

export default function ApplyForm({ jobId }: ApplyFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      toast.error("Please upload your resume")
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('jobId', jobId)

      const response = await fetch('/api/nim/parse-resume', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit application')
      }

      const result = await response.json()
      setSubmitted(true)
      toast.success("Application submitted successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-12 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-bold mb-2">Application Submitted!</h3>
          <p className="text-muted-foreground">
            Thank you for applying. We'll review your application and get back to you soon.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply Now</CardTitle>
        <CardDescription>Submit your resume to apply for this position</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume">Resume *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="resume"
              />
              <label htmlFor="resume" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {file ? file.name : "Upload Resume"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF or DOCX
                </p>
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting} size="lg">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your resume will be processed by our AI system
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
