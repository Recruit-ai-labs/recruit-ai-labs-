import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Users, Calendar, TrendingUp, Activity } from "lucide-react"
import Link from "next/link"

const stats = [
  {
    title: "Active Jobs",
    value: "0",
    description: "Currently open positions",
    icon: Briefcase,
    href: "/dashboard/jobs",
  },
  {
    title: "Total Candidates",
    value: "0",
    description: "In your pipeline",
    icon: Users,
    href: "/dashboard/candidates",
  },
  {
    title: "Scheduled Interviews",
    value: "0",
    description: "Upcoming this week",
    icon: Calendar,
    href: "/dashboard/interviews",
  },
  {
    title: "Time to Hire",
    value: "0 days",
    description: "Average",
    icon: TrendingUp,
    href: "/dashboard/analytics",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to your AI-powered recruitment platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with AI-powered recruitment</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/jobs/new" className="p-4 border rounded-lg hover:bg-accent transition-colors">
            <Briefcase className="h-6 w-6 mb-2" />
            <h3 className="font-semibold">Post a Job</h3>
            <p className="text-sm text-muted-foreground">Create a job with AI-generated description</p>
          </Link>
          <Link href="/dashboard/candidates" className="p-4 border rounded-lg hover:bg-accent transition-colors">
            <Users className="h-6 w-6 mb-2" />
            <h3 className="font-semibold">Add Candidate</h3>
            <p className="text-sm text-muted-foreground">Upload resume for AI parsing</p>
          </Link>
          <Link href="/dashboard/analytics" className="p-4 border rounded-lg hover:bg-accent transition-colors">
            <Activity className="h-6 w-6 mb-2" />
            <h3 className="font-semibold">View Analytics</h3>
            <p className="text-sm text-muted-foreground">Track NIM usage and pipeline metrics</p>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from your recruitment pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No activity yet. Start by posting a job or adding a candidate.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
