import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings as SettingsIcon, CreditCard, Users, Key, Bell } from "lucide-react"

export default async function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your organization and integrations</p>
      </div>

      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Organization
          </CardTitle>
          <CardDescription>Manage your organization details and team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Organization Name</label>
              <p className="text-muted-foreground">Your organization name</p>
            </div>
            <div>
              <label className="text-sm font-medium">Plan</label>
              <div className="mt-1">
                <Badge>Free</Badge>
              </div>
            </div>
          </div>
          <Button>Manage Team</Button>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Billing & Subscription
          </CardTitle>
          <CardDescription>Manage your subscription and payment methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Current Plan: Free</h3>
                <p className="text-sm text-muted-foreground">100 NIM credits/month</p>
              </div>
              <a href="/dashboard/billing">
                <Button>Upgrade Plan</Button>
              </a>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">NIM Credits Used</p>
              <p className="text-2xl font-bold">0 / 100</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Active Jobs</p>
              <p className="text-2xl font-bold">0 / 5</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">1 / 1</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Integrations
          </CardTitle>
          <CardDescription>Connect external services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              { name: "Google Calendar", description: "Sync interviews with your calendar", connected: false },
              { name: "SendGrid", description: "Email notifications and templates", connected: false },
              { name: "Twilio", description: "SMS notifications", connected: false },
              { name: "GitHub", description: "Developer profile enrichment", connected: false },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </div>
                <Button variant={integration.connected ? "secondary" : "outline"}>
                  {integration.connected ? "Connected" : "Connect"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[
              "New application received",
              "Candidate stage changes",
              "Interview reminders",
              "NIM usage alerts",
            ].map((notification) => (
              <div key={notification} className="flex items-center justify-between p-3">
                <span>{notification}</span>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
