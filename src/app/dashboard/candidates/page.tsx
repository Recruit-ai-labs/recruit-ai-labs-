import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Mail, Phone } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export default async function CandidatesPage() {
  const candidates: any[] = []
  
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

      {/* Search */}
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

      {/* Candidates List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {candidates.length > 0 ? (
          candidates.map((candidate: any) => (
            <Link key={candidate.id} href={`/dashboard/candidates/${candidate.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{candidate.name}</CardTitle>
                      <CardDescription>{candidate.parsed_experience?.[0]?.title || "No title"}</CardDescription>
                    </div>
                    {candidate.ai_match_score && (
                      <Badge variant={candidate.ai_match_score >= 70 ? "default" : "secondary"}>
                        {candidate.ai_match_score}% match
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {candidate.parsed_skills?.slice(0, 3).map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                    {candidate.parsed_skills?.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{candidate.parsed_skills.length - 3}</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {candidate.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {candidate.email}
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {candidate.phone}
                      </div>
                    )}
                  </div>

                  {candidate.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">LinkedIn:</span>
                      <span className="truncate">{candidate.linkedin_url}</span>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Added {formatDate(candidate.created_at)}
                  </div>
                </CardContent>
              </Card>
            </Link>
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
