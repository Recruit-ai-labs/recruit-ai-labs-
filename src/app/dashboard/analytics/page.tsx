import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Users, Briefcase, Clock, DollarSign } from "lucide-react"

export default async function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your recruitment performance and usage</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">Application to hire rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Hire</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 days</div>
            <p className="text-xs text-muted-foreground">From application to offer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">Estimated API costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="nim">Usage</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Funnel</CardTitle>
              <CardDescription>Candidate progression through hiring stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { stage: "New", count: 0, color: "bg-blue-500" },
                  { stage: "Screening", count: 0, color: "bg-purple-500" },
                  { stage: "Interview", count: 0, color: "bg-yellow-500" },
                  { stage: "Offer", count: 0, color: "bg-orange-500" },
                  { stage: "Hired", count: 0, color: "bg-green-500" },
                  { stage: "Rejected", count: 0, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.stage} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{item.stage}</div>
                    <div className="flex-1 bg-secondary rounded-full h-8 overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full transition-all`}
                        style={{ width: `${item.count > 0 ? (item.count / Math.max(item.count, 1)) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="w-16 text-sm text-right">{item.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nim" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>AI inference consumption and costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>sage data will appear here once you start using AI features</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Sources</CardTitle>
              <CardDescription>Where your candidates are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { source: "Direct Application", count: 0 },
                  { source: "Job Board", count: 0 },
                  { source: "AI Sourcing", count: 0 },
                  { source: "Referral", count: 0 },
                ].map((item) => (
                  <div key={item.source} className="flex items-center justify-between p-4 border rounded-lg">
                    <span className="font-medium">{item.source}</span>
                    <span className="text-2xl font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
