import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['student', 'common', 'errors'])
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
        toast.error(t('student:settings.errors.loadAccountFailed'))
      } finally {
        setLoadingUser(false)
      }
    }
    load()
  }, [authUser, t])

  const handleSave = async () => {
    if (!user) return
    if (password || confirmPassword) {
      if (password.length < 8) {
        toast.error(t('student:settings.errors.passwordTooShort'))
        return
      }
      if (password !== confirmPassword) {
        toast.error(t('student:settings.errors.passwordsMismatch'))
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
          toast.error(t('student:settings.errors.enterCurrentPassword'))
          return
        }
        await userService.changePassword(currentPassword, password)
        toast.success(t('student:settings.passwordUpdated'))
      } else {
        toast.success(t('student:settings.profileUpdated'))
      }
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(t('student:settings.errors.updateProfileFailed'), { description: error instanceof Error ? error.message : undefined })
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
        toast.success(t('student:settings.accountDeleted'))
      } catch {
        toast.info(t('student:settings.loggedOut'))
      }
      authService.logout()
      logout()
      localStorage.clear()
      navigate('/register')
    } catch {
      toast.error(t('student:settings.errors.deleteAccountFailed'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">{t('student:settings.title')}</div>
        <div className="text-sm text-muted-foreground">{t('student:settings.subtitle')}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Account */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('student:settings.accountSection')}</CardTitle>
            <CardDescription>{t('student:settings.accountSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingUser ? (
              <div className="text-sm text-muted-foreground">{t('student:settings.loadingAccount')}</div>
            ) : user ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('student:settings.nameLabel')}</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('student:settings.namePlaceholder')} className="h-9" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('student:settings.emailLabel')}</label>
                  <Input value={user.email} disabled className="h-9 bg-muted" />
                  <p className="text-[11px] text-muted-foreground">{t('student:settings.emailCannotChange')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('student:settings.changePassword')}</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('student:settings.currentPasswordPlaceholder')}
                    className="h-9"
                    autoComplete="current-password"
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('student:settings.newPasswordPlaceholder')}
                    className="h-9"
                  />
                  {password && (
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('student:settings.confirmPasswordPlaceholder')}
                      className="h-9"
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">{t('student:settings.minChars')}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? t('student:settings.saving') : t('student:settings.saveChanges')}
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={deleting}>
                    {deleting ? t('student:settings.deleting') : t('student:settings.deleteAccount')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">{t('student:settings.signInToManage')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('student:settings.themeTitle')}</CardTitle>
            <CardDescription>{t('student:settings.themeCurrent', { theme })}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t('student:settings.themeHelp')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('student:settings.notificationsSection')}</CardTitle>
            <CardDescription>{t('student:settings.notificationsLocal')}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-medium">{t('student:settings.enableNotifications')}</div>
              <div className="text-muted-foreground">{t('student:settings.notificationsDesc')}</div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                updateProfile({ notificationsEnabled: !profile.notificationsEnabled })
                toast.success(t('student:settings.preferenceUpdated'))
              }}
            >
              {profile.notificationsEnabled ? t('student:settings.enabled') : t('student:settings.disabled')}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('student:settings.resetDemo')}</CardTitle>
            <CardDescription>{t('student:settings.resetDemoSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {t('student:settings.resetDemoBody')}
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                resetDemoData()
                toast.success(t('student:settings.demoReset'), { description: t('student:settings.demoResetDesc') })
              }}
            >
              {t('student:settings.resetDemo')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('student:settings.deleteDialogTitle')}
        description={t('student:settings.deleteDialogDescription')}
        confirmLabel={t('student:settings.deleteDialogConfirm')}
        variant="destructive"
        loading={deleting}
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}
