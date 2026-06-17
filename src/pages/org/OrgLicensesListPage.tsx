import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Ticket, ShoppingCart, ArrowRight, BookOpen } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { useOrgStore } from '../../store/useOrgStore'
import { courseLicenseService, type CourseLicense } from '../../services/courseLicenseService'
import { courseService, type CourseDto } from '../../services/courseService'

type LiteCourse = Pick<CourseDto, 'id' | 'title' | 'description' | 'price' | 'thumbnailUrl'>

export function OrgLicensesListPage() {
  const { t, i18n } = useTranslation(['org', 'common'])
  const { currentOrg } = useOrgStore()

  const [licenses, setLicenses] = useState<CourseLicense[]>([])
  const [catalog, setCatalog] = useState<LiteCourse[]>([])
  const [loading, setLoading] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [chosenCourse, setChosenCourse] = useState<LiteCourse | null>(null)
  const [seats, setSeats] = useState(10)
  const [buying, setBuying] = useState(false)

  const refresh = async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const [lic, cat] = await Promise.all([
        courseLicenseService.list(currentOrg.id),
        courseService
          .getCourses({ pageNumber: 1, pageSize: 24 })
          .catch(() => ({ items: [] as CourseDto[] })),
      ])
      setLicenses(lic)
      setCatalog(cat.items as LiteCourse[])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrg?.id])

  const paidCatalog = useMemo(
    () => catalog.filter((c) => typeof c.price === 'number' && c.price > 0),
    [catalog]
  )

  const openPurchase = (course: LiteCourse) => {
    setChosenCourse(course)
    setSeats(10)
    setPurchaseOpen(true)
  }

  const purchase = async () => {
    if (!currentOrg || !chosenCourse) return
    setBuying(true)
    try {
      await courseLicenseService.purchase(currentOrg.id, {
        courseId: chosenCourse.id,
        seats,
      })
      toast.success(t('org:licenses.purchasedToast'))
      setPurchaseOpen(false)
      void refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBuying(false)
    }
  }

  const formatMoney = (n: number, cur = 'ILS') =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: cur }).format(n)
  const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(i18n.language) : '—')

  if (!currentOrg) return null

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{t('org:licenses.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('org:licenses.subtitle')}</p>
      </header>

      {/* Current licenses */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t('org:licenses.active')}
        </h2>
        {loading && licenses.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('common:loading')}</div>
        ) : licenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            {t('org:licenses.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {licenses.map((l) => {
              const used = l.seatsUsed
              const total = l.seatsTotal
              const pct = total === 0 ? 0 : Math.round((used / total) * 100)
              return (
                <Link
                  key={l.id}
                  to={`/org/${currentOrg.slug}/licenses/${l.id}`}
                  className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Ticket className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold truncate">{l.courseTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        {t(`org:licenses.status.${l.status}`)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition rtl:rotate-180" />
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('org:licenses.seatsLabel')}</span>
                      <span className="font-medium">
                        {used} / {total}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>{t('org:licenses.perSeat', { defaultValue: '{{price}} / seat', price: formatMoney(l.pricePerSeat, l.currency) })}</span>
                      <span>{formatDate(l.validUntil)}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Catalog to buy from */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t('org:licenses.browseCatalog')}
        </h2>
        {paidCatalog.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            {t('org:licenses.catalogEmpty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paidCatalog.slice(0, 9).map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="relative h-32 w-full overflow-hidden bg-muted">
                  {c.thumbnailUrl ? (
                    <img
                      src={c.thumbnailUrl}
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
                    style={{ display: c.thumbnailUrl ? 'none' : 'flex' }}
                  >
                    <BookOpen className="h-8 w-8" />
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-base line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium">{formatMoney(c.price!, 'ILS')}</span>
                    <Button size="sm" className="gap-1" onClick={() => openPurchase(c)}>
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {t('org:licenses.licenseForTeam')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('org:licenses.purchaseDialog.title')}</DialogTitle>
            <DialogDescription>
              {chosenCourse &&
                t('org:licenses.purchaseDialog.description', { course: chosenCourse.title })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="seats">{t('org:licenses.purchaseDialog.seatsLabel')}</Label>
              <Input
                id="seats"
                type="number"
                min={1}
                max={10000}
                value={seats}
                onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            {chosenCourse && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {formatMoney(chosenCourse.price!, 'ILS')} × {seats}
                  </span>
                  <span className="font-semibold">
                    {formatMoney(chosenCourse.price! * seats, 'ILS')}
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
