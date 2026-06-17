import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Award,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ImagePlus,
  Lock,
  Mail,
  Sparkles,
  User,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { userService, type UserDto } from '../../services/userService'
import { enrollmentService, type EnrollmentDto } from '../../services/enrollmentService'
import { courseExtrasService, type CertificateDto } from '../../services/courseExtrasService'
import { fileService } from '../../services/fileService'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/cn'

type CertificateSummary = CertificateDto & {
  courseId: string
  enrollmentId: string
}

function isCompletedEnrollment(enrollment: EnrollmentDto): boolean {
  return enrollment.status === 'Completed' || enrollment.progressPercentage >= 100
}

function initialsFor(user: UserDto): string {
  const first = user.firstName?.trim()?.[0] ?? ''
  const last = user.lastName?.trim()?.[0] ?? ''
  return `${first}${last}`.toUpperCase() || user.email.slice(0, 2).toUpperCase()
}

function formatDate(date?: string | null): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ProfilePage() {
  const { t } = useTranslation(['student', 'common', 'errors'])
  const { user: authUser, updateUser: updateAuthUser } = useAuthStore()
  const [user, setUser] = useState<UserDto | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([])
  const [certificates, setCertificates] = useState<CertificateSummary[]>([])
  const [loading, setLoading] = useState(true)

  const [bio, setBio] = useState('')
  const [bioSaving, setBioSaving] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [passwordFormOpen, setPasswordFormOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      if (!authUser) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [userData, enrollmentResult] = await Promise.all([
          userService.getCurrentUser(),
          enrollmentService.getMyEnrollments({ pageSize: 500 }),
        ])

        setUser(userData)
        setPhotoUrl(userData.profilePictureUrl || null)
        setCoverImageUrl(userData.coverImageUrl || null)
        setBio(userData.bio || '')
        setEnrollments(enrollmentResult.items)

        updateAuthUser({
          profilePictureUrl: userData.profilePictureUrl,
          bio: userData.bio,
          coverImageUrl: userData.coverImageUrl,
        })

        const completed = enrollmentResult.items.filter(isCompletedEnrollment)
        const certificateResults = await Promise.allSettled(
          completed.map(async (enrollment) => {
            const certificate = await courseExtrasService.getCertificate(enrollment.courseId)
            return { ...certificate, courseId: enrollment.courseId, enrollmentId: enrollment.id }
          }),
        )

        setCertificates(
          certificateResults
            .filter((result): result is PromiseFulfilledResult<CertificateSummary> => result.status === 'fulfilled')
            .map((result) => result.value)
            .filter((certificate) => certificate.eligible),
        )
      } catch (error) {
        toast.error(t('student:profile.errors.loadProfileFailed'), {
          description: error instanceof Error ? error.message : t('student:calendar.errors.tryLater'),
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id])

  const stats = useMemo(() => {
    const active = enrollments.filter((e) => e.status === 'Active').length
    const completed = enrollments.filter(isCompletedEnrollment).length
    return {
      courses: enrollments.length,
      active,
      completed,
      certifications: certificates.length,
    }
  }, [enrollments, certificates])

  const handlePhotoUpload = () => fileInputRef.current?.click()
  const handleCoverUpload = () => coverInputRef.current?.click()

  const uploadImage = async (file: File, folder: 'profile-photos' | 'cover-images') => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('student:profile.errors.imageTooLarge'))
      return null
    }
    return fileService.uploadFile(file, folder)
  }

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingPhoto(true)
      const result = await uploadImage(file, 'profile-photos')
      if (!result) return
      const updated = await userService.updateCurrentUser({ profilePictureUrl: result.fileUrl })
      setUser(updated)
      setPhotoUrl(result.fileUrl)
      updateAuthUser({ profilePictureUrl: result.fileUrl })
      toast.success(t('student:profile.photoUpdated'))
    } catch (error) {
      toast.error(t('student:profile.errors.uploadPhotoFailed'), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleCoverSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingCover(true)
      const result = await uploadImage(file, 'cover-images')
      if (!result) return
      const updated = await userService.updateCurrentUser({ coverImageUrl: result.fileUrl })
      setUser(updated)
      setCoverImageUrl(result.fileUrl)
      updateAuthUser({ coverImageUrl: result.fileUrl })
      toast.success(t('student:profile.coverUpdated'))
    } catch (error) {
      toast.error(t('student:profile.errors.uploadCoverFailed'), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const handleSaveBio = async () => {
    try {
      setBioSaving(true)
      const updated = await userService.updateCurrentUser({ bio })
      setUser(updated)
      updateAuthUser({ bio })
      toast.success(t('student:profile.bioUpdated'))
    } catch (error) {
      toast.error(t('student:profile.errors.saveBioFailed'), {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setBioSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error(t('student:profile.errors.fillAllFields'))
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error(t('student:profile.errors.newPasswordMin'))
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('student:profile.errors.newPasswordsMismatch'))
      return
    }

    try {
      setChangingPassword(true)
      await userService.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      toast.success(t('student:profile.passwordChangedSuccess'))
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordFormOpen(false)
    } catch (error) {
      toast.error(t('student:profile.errors.changePasswordFailed'), {
        description: error instanceof Error ? error.message : t('student:calendar.errors.tryLater'),
      })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 rounded-2xl bg-muted/50 animate-pulse" />
        <Card className="max-w-4xl">
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <span className="text-sm text-muted-foreground">{t('student:profile.loadingProfile')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-2xl font-semibold">{t('student:profile.title')}</div>
        <Card className="max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-sm font-medium">{t('student:profile.notAuthenticated')}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t('student:profile.pleaseSignIn')}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const memberYear = new Date(user.createdAt).getFullYear()
  const displayPhotoUrl = photoUrl || user.profilePictureUrl || null

  return (
    <div className="space-y-8 pb-20">
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={handleFileSelected} />
      <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/gif" className="hidden" onChange={handleCoverSelected} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('student:profile.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('student:profile.subtitle')}</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl group/cover">
        <div className="relative h-36 sm:h-44 w-full rounded-2xl overflow-hidden bg-muted">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setCoverImageUrl(null)}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/85 via-sky-500/70 to-emerald-500/60" aria-hidden />
          )}
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.28),transparent)]" />
          <div className="absolute bottom-0 start-0 end-0 h-24 bg-gradient-to-t from-background to-transparent rounded-b-2xl" />
          <button
            type="button"
            className="absolute top-3 end-3 flex items-center gap-2 rounded-lg border border-white/30 bg-black/40 px-3 py-2 text-sm font-medium text-white opacity-0 transition-opacity group-hover/cover:opacity-100 focus:opacity-100 hover:bg-black/50"
            onClick={handleCoverUpload}
            disabled={uploadingCover}
            aria-label={t('student:profile.changeCoverAria')}
          >
            <ImagePlus className="h-4 w-4" />
            {t('student:profile.changeCover')}
          </button>
        </div>

        <div className="relative px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="relative shrink-0">
              <div
                className={cn(
                  'h-28 w-28 sm:h-32 sm:w-32 rounded-2xl flex items-center justify-center overflow-hidden',
                  'border-4 border-background bg-muted shadow-xl ring-2 ring-primary/20',
                )}
              >
                {displayPhotoUrl ? (
                  <img
                    src={displayPhotoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setPhotoUrl(null)}
                  />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">{initialsFor(user)}</span>
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-background bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                onClick={handlePhotoUpload}
                disabled={uploadingPhoto}
                aria-label={t('student:profile.changeProfilePhotoAria')}
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                {user.fullName || `${user.firstName} ${user.lastName}`.trim() || t('student:profile.title')}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {t('student:profile.memberSince', { year: memberYear })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="font-medium">
                  <BookOpen className="h-3.5 w-3.5 me-1" />
                  {t('student:profile.coursesCount', { count: stats.courses })}
                </Badge>
                <Badge variant="secondary" className="font-medium">
                  <Award className="h-3.5 w-3.5 me-1" />
                  {t('student:profile.certificationsCount', { count: stats.certifications })}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<BookOpen className="h-5 w-5 text-primary" />} label={t('student:profile.coursesCount', { count: stats.courses })} value={stats.courses} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} label={t('student:profile.completedCourses')} value={stats.completed} />
        <StatCard icon={<Award className="h-5 w-5 text-amber-600" />} label={t('student:profile.certifications')} value={stats.certifications} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('student:profile.about')}
              </CardTitle>
              <CardDescription>{t('student:profile.aboutSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('student:profile.bioPlaceholder')}
                rows={5}
                className="resize-y min-h-[120px] text-[15px] leading-relaxed"
              />
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSaveBio} disabled={bioSaving}>
                  {bioSaving ? t('student:profile.saving') : t('student:profile.saveBio')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                {t('student:profile.certifications')}
              </CardTitle>
              <CardDescription>{t('student:profile.certificationsSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Award className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">{t('student:profile.noCertifications')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('student:profile.noCertificationsBody')}</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {certificates.map((cert) => (
                    <div
                      key={cert.certificateId || cert.enrollmentId}
                      className="group relative rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm leading-snug">{cert.courseTitle}</div>
                          <div className="text-xs text-muted-foreground mt-1">{cert.instructorName}</div>
                          <div className="text-xs text-muted-foreground/80 mt-0.5">{formatDate(cert.issuedAt)}</div>
                          {cert.certificateId && (
                            <div className="text-[11px] text-muted-foreground/70 font-mono mt-1">
                              {t('student:profile.credentialId', { id: cert.certificateId })}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 rounded-full bg-primary/10 p-1.5" title={t('student:profile.verified')}>
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                {t('student:profile.learningSnapshot')}
              </CardTitle>
              <CardDescription>{t('student:profile.learningSnapshotSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SnapshotRow label={t('student:profile.activeCourses')} value={stats.active} />
              <SnapshotRow label={t('student:profile.completedCourses')} value={stats.completed} />
              <SnapshotRow label={t('student:profile.certifications')} value={stats.certifications} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-primary" />
                {t('student:profile.security')}
              </CardTitle>
              <CardDescription>{t('student:profile.securitySubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!passwordFormOpen ? (
                <Button variant="outline" onClick={() => setPasswordFormOpen(true)}>
                  {t('student:profile.changePassword')}
                </Button>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">{t('student:profile.currentPassword')}</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      placeholder={t('student:profile.enterCurrentPassword')}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t('student:profile.newPassword')}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                      placeholder={t('student:profile.atLeast8')}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t('student:profile.confirmPassword')}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder={t('student:profile.confirmPassword')}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleChangePassword} disabled={changingPassword}>
                      {changingPassword ? t('student:profile.changing') : t('student:profile.updatePassword')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setPasswordFormOpen(false)} disabled={changingPassword}>
                      {t('common:cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SnapshotRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
