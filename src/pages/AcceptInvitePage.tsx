import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { GraduationCap, Building2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { organizationService } from '../services/organizationService'
import { useAuthStore } from '../store/useAuthStore'
import type { InvitePreview } from '../types/organization'

export function AcceptInvitePage() {
  const { t } = useTranslation(['org', 'common', 'auth'])
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const login = useAuthStore((s) => s.login)

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError(t('org:invite.missingToken'))
      setLoading(false)
      return
    }
    let cancelled = false
    organizationService
      .previewInvite(token)
      .then((p) => {
        if (cancelled) return
        setPreview(p)
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [token, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!preview || !token) return
    if (password.length < 8) {
      toast.error(t('org:invite.passwordTooShort'))
      return
    }
    setSubmitting(true)
    try {
      const result = await organizationService.acceptInvite({
        token,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
      })
      toast.success(t('org:invite.acceptedToast'))
      // Auto-login the new member
      try {
        await login(result.email, password)
      } catch {
        /* fall through — user will log in manually */
      }
      navigate(`/org/${result.organizationSlug}/dashboard`, { replace: true })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground">
        {t('common:loading')}
      </div>
    )
  }

  if (error || !preview) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-destructive/30 bg-card p-8 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
          <h1 className="text-lg font-semibold">{t('org:invite.invalid')}</h1>
          <p className="text-sm text-muted-foreground">{error ?? t('org:invite.notFound')}</p>
          <Button variant="outline" onClick={() => navigate('/login')}>
            {t('common:login')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
            <GraduationCap className="h-3.5 w-3.5" />
            AcademiX
          </div>
          <h1 className="text-2xl font-bold">{t('org:invite.title')}</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t('org:invite.subtitle')}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{preview.organizationName}</div>
              <div className="text-xs text-muted-foreground">
                {t(`org:types.${preview.organizationType}`)} · {t(`org:roles.${preview.role}`)}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3" />
            {t('org:invite.invitedEmail', { email: preview.email })}
          </div>
          {preview.expiresAt && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {t('org:invite.expiresAt', {
                date: new Date(preview.expiresAt).toLocaleString(),
              })}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first-name">{t('auth:register.firstNameLabel')}</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div>
                <Label htmlFor="last-name">{t('auth:register.lastNameLabel')}</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">{t('auth:register.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('org:invite.passwordHint')}</p>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t('common:loading') : t('org:invite.submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
