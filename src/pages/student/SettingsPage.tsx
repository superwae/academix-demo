import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useAuthStore } from '../../store/useAuthStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { toast } from 'sonner'
import { userService, type UserDto } from '../../services/userService'
import { authService } from '../../services/authService'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'

export function SettingsPage() {
  const navigate = useNavigate()
  const { user: authUser, logout } = useAuthStore()
  const theme = useAppStore((s) => s.data.theme)
  const profile = useAppStore((s) => s.data.profile)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const resetDemoData = useAppStore((s) => s.resetDemoData)

  const [user, setUser] = useState<UserDto | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!authUser) {
        setLoadingUser(false)
        return
      }
      try {
        setLoadingUser(true)
        const data = await userService.getCurrentUser()
        setUser(data)
        setName(data.fullName || `${data.firstName} ${data.lastName}`.trim())
      } catch {
        toast.error('Failed to load account')
      } finally {
        setLoadingUser(false)
      }
    }
    load()
  }, [authUser])

  const handleSave = async () => {
    if (!user) return
    if (password || confirmPassword) {
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long')
        return
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
    }
    try {
      setSaving(true)
      const nameParts = name.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      const updated = await userService.updateCurrentUser({ firstName, lastName })
      setUser(updated)
      const { useAuthStore } = await import('../../store/useAuthStore')
      useAuthStore.getState().user = {
        ...useAuthStore.getState().user!,
        firstName: updated.firstName,
        lastName: updated.lastName,
      }
      if (password) {
        if (!currentPassword) {
          toast.error('Please enter your current password')
          return
        }
        await userService.changePassword(currentPassword, password)
        toast.success('Password updated')
      } else {
        toast.success('Profile updated')
      }
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error('Failed to update profile', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    try {
      setDeleting(true)
      try {
        await userService.deleteCurrentUser()
        toast.success('Account deleted')
      } catch {
        toast.info('Logged out')
      }
      authService.logout()
      logout()
      localStorage.clear()
      navigate('/register')
    } catch {
      toast.error('Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Settings</div>
        <div className="text-sm text-muted-foreground">Theme, preferences, and account</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Account */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Name, email, and password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingUser ? (
              <div className="text-sm text-muted-foreground">Loading account…</div>
            ) : user ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="h-9" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={user.email} disabled className="h-9 bg-muted" />
                  <p className="text-[11px] text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Change password</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="h-9"
                    autoComplete="current-password"
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className="h-9"
                  />
                  {password && (
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="h-9"
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">Min. 8 characters</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Delete account'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Sign in to manage your account.</div>
            )}
          </CardContent>
        </Card>

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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete account"
        description="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
        confirmLabel="Delete my account"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}



