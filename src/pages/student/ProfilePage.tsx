import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { userService, type UserDto } from '../../services/userService'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/useAuthStore'
import {
  User,
  Camera,
  Award,
  GraduationCap,
  Mail,
  BookOpen,
  Calendar,
  CheckCircle2,
  Sparkles,
  Medal,
  Star,
  Zap,
  Trophy,
  Target,
  ImagePlus,
  Lock,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { cn } from '../../lib/cn'
import { fileService } from '../../services/fileService'

const MOCK_BIO =
  'Passionate learner exploring technology and science. Currently focusing on programming, data analysis, and building real-world projects.'
const MOCK_CERTIFICATES = [
  {
    id: '1',
    name: 'Introduction to Python',
    issuer: 'AcademiX',
    date: 'Sep 2024',
    credentialId: 'AX-PY101-7821',
  },
  {
    id: '2',
    name: 'Data Analysis Fundamentals',
    issuer: 'AcademiX',
    date: 'Jan 2025',
    credentialId: 'AX-DA200-3345',
  },
  {
    id: '3',
    name: 'Web Development Basics',
    issuer: 'AcademiX',
    date: 'Mar 2025',
    credentialId: 'AX-WD100-5510',
  },
]
const MOCK_MAJORS = [
  { name: 'Programming', years: '2 years' },
  { name: 'Data Science', years: '1 year' },
  { name: 'Web Development', years: '1 year' },
]
const MOCK_STATS = { courses: 5, certifications: 3, memberSince: '2024' }
// Demo images: cover PNG (place your image at public/demo/profile-cover.png); fallback is SVG
const DEMO_COVER_IMAGE = '/demo/profile-cover.png'
const DEMO_COVER_IMAGE_FALLBACK = '/demo/profile-cover.svg'
const DEMO_AVATAR_IMAGE = '/demo/profile-avatar.svg'
const DEMO_REAL_PERSON_AVATAR = 'https://i.pravatar.cc/400?img=33'

const MOCK_BADGES = [
  { id: '1', name: 'First Course', description: 'Completed first course', icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10', earnedAt: 'Oct 2024' },
  { id: '2', name: 'Quick Learner', description: 'Finished 3 lessons in a day', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-500/10', earnedAt: 'Nov 2024' },
  { id: '3', name: 'Perfect Score', description: '100% on an exam', icon: Trophy, color: 'text-primary', bg: 'bg-primary/10', earnedAt: 'Dec 2024' },
  { id: '4', name: 'Bookworm', description: 'Read all course materials', icon: Medal, color: 'text-violet-600', bg: 'bg-violet-500/10', earnedAt: 'Jan 2025' },
  { id: '5', name: 'Streak Master', description: '7-day login streak', icon: Target, color: 'text-sky-600', bg: 'bg-sky-500/10', earnedAt: 'Feb 2025' },
]

export function ProfilePage() {
  const { user: authUser } = useAuthStore()
  const [user, setUser] = useState<UserDto | null>(null)
  const [loading, setLoading] = useState(true)

  const [bio, setBio] = useState(MOCK_BIO)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(DEMO_COVER_IMAGE)
  const [avatarImageError, setAvatarImageError] = useState<'none' | 'real' | 'both'>('none')

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordFormOpen, setPasswordFormOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      return
    }
    try {
      setUploadingPhoto(true)
      const result = await fileService.uploadFile(file, 'profile-photos')
      await userService.updateCurrentUser({ profilePictureUrl: result.fileUrl })
      setPhotoUrl(result.fileUrl)
      setAvatarImageError('none')
      toast.success('Profile photo updated')
    } catch (error) {
      toast.error('Failed to upload photo', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setUploadingPhoto(false)
      // Reset so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (!authUser) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const userData = await userService.getCurrentUser()
        setUser(userData)
        setPhotoUrl(userData.profilePictureUrl || null)
        setAvatarImageError('none')
      } catch (error) {
        toast.error('Failed to load profile', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [authUser])

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    try {
      setChangingPassword(true)
      await userService.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      toast.success('Password changed successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordFormOpen(false)
    } catch (error) {
      toast.error('Failed to change password', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
        <Card className="max-w-4xl">
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Loading profile…</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-2xl font-semibold">Profile</div>
        <Card className="max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-sm font-medium">Not authenticated</div>
            <div className="mt-1 text-sm text-muted-foreground">Please sign in to view your profile.</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const displayPhotoUrl =
    photoUrl ||
    user?.profilePictureUrl ||
    (avatarImageError === 'both' ? null : avatarImageError === 'real' ? DEMO_AVATAR_IMAGE : DEMO_REAL_PERSON_AVATAR)
  const memberYear = user.createdAt ? new Date(user.createdAt).getFullYear() : MOCK_STATS.memberSince

  return (
    <div className="space-y-8 pb-20">
      {/* Hidden file input for profile photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif"
        className="hidden"
        onChange={handleFileSelected}
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your profile</p>
      </div>

      {/* Cover image + personal image (avatar) */}
      <div className="relative overflow-hidden rounded-2xl group/cover">
        {/* Cover image */}
        <div className="relative h-36 sm:h-40 w-full rounded-2xl overflow-hidden bg-muted">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() =>
                setCoverImageUrl((prev) =>
                  prev === DEMO_COVER_IMAGE ? DEMO_COVER_IMAGE_FALLBACK : null
                )
              }
            />
          ) : (
            <div
              className="h-full w-full bg-gradient-to-br from-primary/90 via-primary to-primary/70"
              aria-hidden
            />
          )}
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.2),transparent)]" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent rounded-b-2xl" />
          <button
            type="button"
            className="absolute top-3 right-3 flex items-center gap-2 rounded-lg border border-white/30 bg-black/40 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm opacity-0 transition-opacity group-hover/cover:opacity-100 focus:opacity-100 hover:bg-black/50"
            onClick={() => toast.info('Cover image upload coming soon')}
            aria-label="Change cover image"
          >
            <ImagePlus className="h-4 w-4" />
            Change cover
          </button>
        </div>

        <div className="relative px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Personal image (avatar) */}
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
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={() =>
                      setAvatarImageError((prev) => (prev === 'none' ? 'real' : 'both'))
                    }
                  />
                ) : (
                  <User className="h-14 w-14 sm:h-16 sm:w-16 text-muted-foreground" aria-hidden />
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-background bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                onClick={handlePhotoUpload}
                disabled={uploadingPhoto}
                aria-label="Change profile photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                {user.fullName || `${user.firstName} ${user.lastName}`.trim() || 'Profile'}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0" />
                  Member since {memberYear}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="font-medium">
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  {MOCK_STATS.courses} courses
                </Badge>
                <Badge variant="secondary" className="font-medium">
                  <Award className="h-3.5 w-3.5 mr-1" />
                  {MOCK_STATS.certifications} certifications
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content: two columns on large screens */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                About
              </CardTitle>
              <CardDescription>Your bio and learning interests</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your story…"
                rows={5}
                className="resize-y min-h-[120px] text-[15px] leading-relaxed"
              />
            </CardContent>
          </Card>

          {/* Certificates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                Certifications
              </CardTitle>
              <CardDescription>Verified credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {MOCK_CERTIFICATES.map((cert) => (
                  <div
                    key={cert.id}
                    className="group relative rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm leading-snug">{cert.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{cert.issuer}</div>
                        <div className="text-xs text-muted-foreground/80 mt-0.5">{cert.date}</div>
                        {cert.credentialId && (
                          <div className="text-[11px] text-muted-foreground/70 font-mono mt-1">ID: {cert.credentialId}</div>
                        )}
                      </div>
                      <div className="shrink-0 rounded-full bg-primary/10 p-1.5" title="Verified">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-primary" />
                Security
              </CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent>
              {!passwordFormOpen ? (
                <Button variant="outline" onClick={() => setPasswordFormOpen(true)}>
                  Change password
                </Button>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleChangePassword} disabled={changingPassword}>
                      {changingPassword ? 'Changing…' : 'Update password'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setPasswordFormOpen(false)} disabled={changingPassword}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Focus areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                Focus areas
              </CardTitle>
              <CardDescription>Areas of study</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {MOCK_MAJORS.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
                  >
                    <span className="font-medium text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.years}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Sidebar: Badges */}
        <div className="lg:order-none">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Medal className="h-5 w-5 text-primary" />
                Badges
              </CardTitle>
              <CardDescription>Achievements and milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_BADGES.map((b) => {
                  const Icon = b.icon
                  return (
                    <div
                      key={b.id}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/30',
                        b.bg,
                      )}
                    >
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', b.bg, b.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm">{b.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{b.description}</div>
                        <div className="text-[11px] text-muted-foreground/80 mt-1">{b.earnedAt}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
