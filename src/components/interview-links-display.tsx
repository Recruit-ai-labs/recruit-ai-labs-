'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

export default function InterviewLinks({ interviews }: { interviews: any[] }) {
  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success('Link copied to clipboard!')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Links</CardTitle>
        <CardDescription>Public links for candidates to complete interviews</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {interviews.length > 0 ? (
          interviews.map((interview: any) => {
            const publicToken = interview.publicToken || interview.public_token
            const link = `http://localhost:3001/interview/${publicToken}`

            return (
              <div key={interview.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Interview {interview.id.slice(0, 8)}</span>
                  <Badge variant="outline">{interview.status}</Badge>
                </div>
                <div className="bg-gray-100 p-2 rounded text-xs break-all font-mono">
                  {link}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(link)}
                  className="w-full gap-2"
                >
                  <Copy className="w-3 h-3" />
                  Copy Link
                </Button>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-muted-foreground">No interviews created yet. Create one to get a shareable link.</p>
        )}
      </CardContent>
    </Card>
  )
}
