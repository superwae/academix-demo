import { useAppStore } from '../store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'

export function SettingsPage() {
  const theme = useAppStore((s) => s.data.theme)
  const profile = useAppStore((s) => s.data.profile)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const resetDemoData = useAppStore((s) => s.resetDemoData)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Settings</div>
        <div className="text-sm text-muted-foreground">Theme, preferences, and demo tools</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Current: {theme}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use the theme dropdown in the top navbar.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Demo preference stored locally</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-medium">Enable notifications</div>
              <div className="text-muted-foreground">Toasts and reminders in the demo</div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                updateProfile({ notificationsEnabled: !profile.notificationsEnabled })
                toast.success('Preference updated')
              }}
            >
              {profile.notificationsEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reset Demo Data</CardTitle>
            <CardDescription>Clears localStorage state and reseeds initial demo content</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              This will reset enrollments, submissions, exam attempts, message read status, and profile edits.
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                resetDemoData()
                toast.success('Demo data reset', { description: 'You’re back to the initial seed.' })
              }}
            >
              Reset Demo Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



