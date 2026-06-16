import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { UserPlus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { organizationService } from '../../services/organizationService'
import { useOrgStore } from '../../store/useOrgStore'
import type { OrgMemberRole, OrganizationMember } from '../../types/organization'

const ROLES_BY_TYPE: Record<string, OrgMemberRole[]> = {
  TeachingInstitution: ['OrgAdmin', 'OrgTeacher', 'OrgStudent'],
  Employer: ['OrgAdmin', 'OrgManager', 'OrgEmployee'],
}

export function OrgMembersPage() {
  const { t, i18n } = useTranslation(['org', 'common'])
  const { slug = '' } = useParams<{ slug: string }>()
  const { currentOrg, memberships } = useOrgStore()
  const myRole = memberships.find((m) => m.slug === slug)?.roleInOrg

  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgMemberRole>('OrgEmployee')
  const [inviteExtRef, setInviteExtRef] = useState('')
  const [inviting, setInviting] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<OrganizationMember | null>(null)

  const canManage = myRole === 'OrgAdmin'
  const availableRoles = currentOrg ? ROLES_BY_TYPE[currentOrg.type] ?? ['OrgAdmin'] : []
  const defaultRole: OrgMemberRole = currentOrg?.type === 'Employer' ? 'OrgEmployee' : 'OrgTeacher'

  const refresh = async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const list = await organizationService.getMembers(currentOrg.id)
      setMembers(list)
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

  useEffect(() => {
    if (inviteOpen) setInviteRole(defaultRole)
  }, [inviteOpen, defaultRole])

  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await organizationService.inviteMember(currentOrg.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
        externalReference: inviteExtRef.trim() || undefined,
      })
      toast.success(t('org:members.invitedToast', { email: inviteEmail.trim() }))
      setInviteOpen(false)
      setInviteEmail('')
      setInviteExtRef('')
      void refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (member: OrganizationMember, role: OrgMemberRole) => {
    if (!currentOrg) return
    try {
      await organizationService.updateMemberRole(currentOrg.id, member.id, role)
      toast.success(t('org:members.roleUpdatedToast'))
      void refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleRemove = async () => {
    if (!currentOrg || !removeTarget) return
    try {
      await organizationService.removeMember(currentOrg.id, removeTarget.id)
      toast.success(t('org:members.removedToast'))
      setRemoveTarget(null)
      void refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(i18n.language)

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('org:members.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('org:members.subtitle')}</p>
        </div>
        {canManage && (
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {t('org:members.invite')}
          </Button>
        )}
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">{t('common:loading')}</div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t('org:members.empty')}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Desktop table */}
          <table className="hidden xl:table w-full text-sm">
            <thead className="bg-muted/50 text-start">
              <tr>
                <th className="px-4 py-3 text-start">{t('org:members.columnName')}</th>
                <th className="px-4 py-3 text-start">{t('org:members.columnEmail')}</th>
                <th className="px-4 py-3 text-start">{t('org:members.columnRole')}</th>
                <th className="px-4 py-3 text-start">{t('org:members.columnStatus')}</th>
                <th className="px-4 py-3 text-start">{t('org:members.columnJoined')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3">
                    {canManage && m.isActive ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) => handleRoleChange(m, v as OrgMemberRole)}
                        className="h-8 w-36"
                        options={availableRoles.map((r) => ({ value: r, label: t(`org:roles.${r}`) }))}
                      />
                    ) : (
                      <span>{t(`org:roles.${m.role}`)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!m.isActive
                      ? t('org:members.statusInactive')
                      : !m.inviteAccepted
                      ? t('org:members.statusPending')
                      : t('org:members.statusActive')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(m.joinedAt)}</td>
                  <td className="px-4 py-3 text-end">
                    {canManage && m.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoveTarget(m)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Compact cards */}
          <ul className="xl:hidden divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {m.firstName} {m.lastName}
                    </div>
                    <div className="break-all text-xs text-muted-foreground">{m.email}</div>
                  </div>
                  {canManage && m.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoveTarget(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    {canManage && m.isActive ? (
                      <Select
                        value={m.role}
                        onValueChange={(v) => handleRoleChange(m, v as OrgMemberRole)}
                        className="h-9 w-full min-w-40 sm:w-48"
                        options={availableRoles.map((r) => ({ value: r, label: t(`org:roles.${r}`) }))}
                      />
                    ) : (
                      <span>{t(`org:roles.${m.role}`)}</span>
                    )}
                  </div>
                  <span>
                    {!m.isActive
                      ? t('org:members.statusInactive')
                      : !m.inviteAccepted
                      ? t('org:members.statusPending')
                      : t('org:members.statusActive')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('org:members.dialog.title')}</DialogTitle>
            <DialogDescription>{t('org:members.dialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">{t('org:members.dialog.emailLabel')}</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('org:members.dialog.emailPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('org:members.dialog.roleLabel')}</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as OrgMemberRole)}
                options={availableRoles.map((r) => ({ value: r, label: t(`org:roles.${r}`) }))}
              />
            </div>
            <div>
              <Label htmlFor="invite-extref">{t('org:members.dialog.externalRefLabel')}</Label>
              <Input
                id="invite-extref"
                value={inviteExtRef}
                onChange={(e) => setInviteExtRef(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={inviting}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? t('common:loading') : t('org:members.dialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={t('org:members.removeConfirmTitle')}
        description={
          removeTarget
            ? t('org:members.removeConfirmMessage', {
                name: `${removeTarget.firstName} ${removeTarget.lastName}`,
              })
            : ''
        }
        confirmLabel={t('common:delete')}
        cancelLabel={t('common:cancel')}
        variant="destructive"
        onConfirm={handleRemove}
      />
    </div>
  )
}
