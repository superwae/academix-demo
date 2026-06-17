import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, BookOpen, Building2, CheckCircle2, Loader2, ShoppingCart, Ticket } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { formatMoney } from '../../lib/money'
import { useOrgStore } from '../../store/useOrgStore'
import { courseLicenseService, type CourseLicense } from '../../services/courseLicenseService'
import { courseService, type CourseDto } from '../../services/courseService'

type LiteCourse = Pick<
  CourseDto,
  'id' | 'title' | 'description' | 'category' | 'price' | 'thumbnailUrl' | 'providerName' | 'organizationId'
>

export function OrgCatalogPage() {
  const { t } = useTranslation(['org', 'common'])
  const { currentOrg } = useOrgStore()
  const [courses, setCourses] = useState<LiteCourse[]>([])
  const [licenses, setLicenses] = useState<CourseLicense[]>([])
  const [loading, setLoading] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<LiteCourse | null>(null)
  const [seats, setSeats] = useState(10)
  const [buying, setBuying] = useState(false)

  const refresh = async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const [coursePage, licenseRows] = await Promise.all([
        courseService.getCourses({ pageNumber: 1, pageSize: 60, sortBy: 'createdAt', sortDescending: true }),
        courseLicenseService.list(currentOrg.id),
      ])
      setCourses(coursePage.items)
      setLicenses(licenseRows)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id])

  const licenseByCourseId = useMemo(() => {
    const map = new Map<string, CourseLicense>()
    licenses.forEach((license) => {
      if (license.status === 'Active') map.set(license.courseId, license)
    })
    return map
  }, [licenses])

  const orgCourses = useMemo(
    () => courses.filter((course) => course.organizationId === currentOrg?.id),
    [courses, currentOrg?.id]
  )

  const publicCourses = useMemo(
    () => courses.filter((course) => course.organizationId !== currentOrg?.id),
    [courses, currentOrg?.id]
  )

  const openPurchase = (course: LiteCourse) => {
    setSelectedCourse(course)
    setSeats(10)
    setPurchaseOpen(true)
  }

  const purchase = async () => {
    if (!currentOrg || !selectedCourse) return
    setBuying(true)
    try {
      await courseLicenseService.purchase(currentOrg.id, {
        courseId: selectedCourse.id,
        seats,
      })
      toast.success(t('org:licenses.purchasedToast'))
      setPurchaseOpen(false)
      await refresh()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBuying(false)
    }
  }

  if (!currentOrg) return null

  const renderCourse = (course: LiteCourse) => {
    const license = licenseByCourseId.get(course.id)
    const canLicense = typeof course.price === 'number' && course.price > 0

    return (
      <article key={course.id} className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="relative h-36 w-full overflow-hidden bg-muted">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(event) => {
                const image = event.currentTarget
                image.style.display = 'none'
                const fallback = image.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = 'flex'
              }}
            />
          ) : null}
          <div
            className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
            style={{ display: course.thumbnailUrl ? 'none' : 'flex' }}
          >
            <BookOpen className="h-8 w-8" />
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{course.category}</span>
              <span>/</span>
              <span>{course.providerName}</span>
            </div>
            <h3 className="line-clamp-2 text-base font-semibold">{course.title}</h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold">{formatMoney(course.price ?? 0)}</span>
            {license ? (
              <Link
                to={`/org/${currentOrg.slug}/licenses/${license.id}`}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
              >
                <CheckCircle2 className="h-4 w-4 text-success" />
                {t('org:catalog.manageLicense')}
              </Link>
            ) : canLicense ? (
              <Button size="sm" className="gap-1" onClick={() => openPurchase(course)}>
                <ShoppingCart className="h-4 w-4" />
                {t('org:licenses.licenseForTeam')}
              </Button>
            ) : (
              <Link
                to={`/courses/${course.id}`}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
              >
                {t('org:catalog.openCourse')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('org:catalog.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('org:catalog.subtitle')}</p>
        </div>
        <Link
          to={`/org/${currentOrg.slug}/licenses`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
        >
          <Ticket className="h-4 w-4" />
          {t('org:catalog.viewLicenses')}
        </Link>
      </header>

      {loading && courses.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
          {t('common:loading')}
        </div>
      ) : (
        <>
          {orgCourses.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('org:catalog.orgCourses')}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {orgCourses.map(renderCourse)}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('org:catalog.publicCourses')}
            </h2>
            {publicCourses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                {t('org:catalog.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {publicCourses.map(renderCourse)}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('org:licenses.purchaseDialog.title')}</DialogTitle>
            <DialogDescription>
              {selectedCourse &&
                t('org:licenses.purchaseDialog.description', { course: selectedCourse.title })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="org-catalog-seats">{t('org:licenses.purchaseDialog.seatsLabel')}</Label>
              <Input
                id="org-catalog-seats"
                type="number"
                min={1}
                max={10000}
                value={seats}
                onChange={(event) => setSeats(Math.max(1, parseInt(event.target.value, 10) || 1))}
              />
            </div>
            {selectedCourse && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {formatMoney(selectedCourse.price ?? 0)} x {seats}
                  </span>
                  <span className="font-semibold">
                    {formatMoney((selectedCourse.price ?? 0) * seats)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPurchaseOpen(false)} disabled={buying}>
              {t('common:cancel')}
            </Button>
            <Button onClick={purchase} disabled={buying || seats < 1}>
              {buying ? t('common:loading') : t('org:licenses.purchaseDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
