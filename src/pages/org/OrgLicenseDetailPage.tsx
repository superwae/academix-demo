import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, UserCheck, UserPlus2 } from 'lucide-react'
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
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { useOrgStore } from '../../store/useOrgStore'
import { organizationService } from '../../services/organizationService'
import {
  courseLicenseService,
  type CourseLicense,
  type LicenseAssignment,
} from '../../services/courseLicenseService'
import type { OrganizationMember } from '../../types/organization'

export function OrgLicenseDetailPage() {
  const { t, i18n } = useTranslation(['org', 'common'])
  const { licenseId = '' } = useParams<{ licenseId: string }>()
  const { currentOrg } = useOrgStore()

  const [license, setLicense] = useState<CourseLicense | null>(null)
  const [assignments, setAssignments] = useState<LicenseAssignment[]>([])
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<LicenseAssignment | null>(null)

  const refresh = useCallback(async () => {
    if (!currentOrg || !licenseId) return
    setLoading(true)
    try {
      const [lic, asg, mem] = await Promise.all([
        courseLicenseService.getById(currentOrg.id, licenseId),
        courseLicenseService.getAssignments(currentOrg.id, licenseId),
        organizationService.getMembers(currentOrg.id),
      ])
      setLicense(lic)
      setAssignments(asg)
      setMembers(mem)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [currentOrg, licenseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const assignedUserIds = useMemo(() => new Set(assignments.map((a) => a.userId)), [assignments])

  const eligibleMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          m.isActive &&
          m.inviteAccepted &&
          (m.role === 'OrgEmployee' || m.role === 'OrgTeacher' || m.role === 'OrgStudent') &&
          !assignedUserIds.has(m.userId)
      ),
    [members, assignedUserIds]
  )

  const togglePick = (userId: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })

  const assignPicked = async () => {
    if (!currentOrg || !license || picked.size === 0) return
    setAssigning(true)
    try {
      await courseLicenseService.assignSeats(currentOrg.id, license.id, {
        memberUserIds: Array.from(picked),
        dueDate: dueDate || undefined,
      })
      toast.success(t('org:licenses.assignedToast', { count: picked.size }))
      setAssignOpen(false)
      setPicked(new Set())
      setDueDate('')
      void refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAssigning(false)
    }
  }

  const revoke = async () => {
    if (!currentOrg || !license || !revokeTarget) return
    try {
      await courseLicenseService.revokeAssignment(
        currentOrg.id,
        license.id,
        revokeTarget.enrollmentId
      )
      toast.success(t('org:licenses.revokedToast'))
      setRevokeTarget(null)
      void refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(i18n.language) : '—')
  const fmtMoney = (n: number, cur = 'ILS') =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: cur }).format(n)

  if (!currentOrg) return null

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <Link
          to={`/org/${currentOrg.slug}/licenses`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('org:licenses.backToList')}
        </Link>
      </div>

      {loading && !license ? (
        <div className="text-sm text-muted-foreground">{t('common:loading')}</div>
      ) : !license ? (
        <div className="text-sm text-destructive">{t('common:somethingWrong')}</div>
      ) : (
        <>
          <header className="rounded-xl border border-border bg-card p-6">
            <h1 className="text-2xl font-bold">{license.courseTitle}</h1>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label={t('org:licenses.seatsAssigned')}
                value={`${license.seatsUsed} / ${license.seatsTotal}`}
              />
              <Stat
                label={t('org:licenses.seatsAvailable')}
                value={license.seatsAvailable}
              />
              <Stat label={t('org:licenses.validUntil')} value={fmtDate(license.validUntil)} />
              <Stat
                label={t('org:licenses.totalSpent')}
                value={fmtMoney(license.totalAmount, license.currency)}
              />
            </div>
          </header>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{t('org:licenses.currentAssignments')}</h2>
              {license.seatsAvailable > 0 && (
                <Button onClick={() => setAssignOpen(true)} className="gap-2">
                  <UserPlus2 className="h-4 w-4" />
                  {t('org:licenses.assignSeats')}
                </Button>
              )}
            </div>

            {assignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                {t('org:licenses.noAssignments')}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="hidden md:table w-full text-sm">
                  <thead className="bg-muted/50 text-start">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('org:licenses.columnName')}</th>
                      <th className="px-4 py-3 text-start">{t('org:licenses.columnEmail')}</th>
                      <th className="px-4 py-3 text-start">{t('org:licenses.columnProgress')}</th>
                      <th className="px-4 py-3 text-start">{t('org:licenses.columnDueDate')}</th>
                      <th className="px-4 py-3 text-start">{t('org:licenses.columnStatus')}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assignments.map((a) => (
                      <tr key={a.enrollmentId}>
                        <td className="px-4 py-3 font-medium">{a.userName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${a.progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(a.progressPercentage)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(a.dueDate)}</td>
                        <td className="px-4 py-3">
                          {a.completedAt ? (
                            <span className="inline-flex items-center gap-1 text-success">
                              <UserCheck className="h-3.5 w-3.5" />
                              {t('org:licenses.status.Completed')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{a.status}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRevokeTarget(a)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile */}
                <ul className="md:hidden divide-y divide-border">
                  {assignments.map((a) => (
                    <li key={a.enrollmentId} className="p-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{a.userName}</div>
                          <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevokeTarget(a)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{Math.round(a.progressPercentage)}%</span>
                        <span>•</span>
                        <span>{a.completedAt ? t('org:licenses.status.Completed') : a.status}</span>
                        <span>•</span>
                        <span>{fmtDate(a.dueDate)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Assign dialog */}
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('org:licenses.assignDialog.title')}</DialogTitle>
                <DialogDescription>
                  {t('org:licenses.assignDialog.description', {
                    available: license.seatsAvailable,
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="due">{t('org:licenses.assignDialog.dueDateLabel')}</Label>
                  <Input
                    id="due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    {t('org:licenses.assignDialog.pickMembers', {
                      picked: picked.size,
                      available: license.seatsAvailable,
                    })}
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {eligibleMembers.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {t('org:licenses.assignDialog.noEligible')}
                      </div>
                    ) : (
                      eligibleMembers.map((m) => (
                        <label
                          key={m.id}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={picked.has(m.userId)}
                            onChange={() => togglePick(m.userId)}
                            disabled={
                              !picked.has(m.userId) && picked.size >= license.seatsAvailable
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">
                              {m.firstName} {m.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAssignOpen(false)} disabled={assigning}>
                  {t('common:cancel')}
                </Button>
                <Button
                  onClick={assignPicked}
                  disabled={assigning || picked.size === 0}
                >
                  {assigning
                    ? t('common:loading')
                    : t('org:licenses.assignDialog.submit', { count: picked.size })}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            open={!!revokeTarget}
            onOpenChange={(open) => !open && setRevokeTarget(null)}
            title={t('org:licenses.revokeConfirmTitle')}
            description={
              revokeTarget
                ? t('org:licenses.revokeConfirmMessage', { name: revokeTarget.userName })
                : ''
            }
            confirmLabel={t('common:delete')}
            cancelLabel={t('common:cancel')}
            variant="destructive"
            onConfirm={revoke}
          />
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  )
}
