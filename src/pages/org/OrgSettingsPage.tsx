import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { organizationService } from '../../services/organizationService'
import { useOrgStore } from '../../store/useOrgStore'

export function OrgSettingsPage() {
  const { t } = useTranslation(['org', 'common'])
  const { currentOrg, loadOrg } = useOrgStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [platformFee, setPlatformFee] = useState(0)
  const [orgFee, setOrgFee] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!currentOrg) return
    setName(currentOrg.name)
    setDescription(currentOrg.description ?? '')
    setWebsite(currentOrg.website ?? '')
    setContactEmail(currentOrg.contactEmail ?? '')
    setLogoUrl(currentOrg.logoUrl ?? '')
    setPlatformFee(currentOrg.platformFeePercent)
    setOrgFee(currentOrg.orgFeePercent)
  }, [currentOrg])

  if (!currentOrg) return null

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await organizationService.update(currentOrg.id, {
        name,
        description: description || null,
        website: website || null,
        contactEmail: contactEmail || null,
        logoUrl: logoUrl || null,
        platformFeePercent: platformFee,
        orgFeePercent: orgFee,
      })
      toast.success(t('org:settings.savedToast'))
      await loadOrg(currentOrg.slug)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{t('org:settings.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('org:settings.subtitle')}</p>
        </header>

        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="org-name">{t('org:settings.nameLabel')}</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="org-desc">{t('org:settings.descriptionLabel')}</Label>
            <Textarea
              id="org-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="org-site">{t('org:settings.websiteLabel')}</Label>
              <Input
                id="org-site"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
              />
            </div>
            <div>
              <Label htmlFor="org-contact">{t('org:settings.contactEmailLabel')}</Label>
              <Input
                id="org-contact"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="org-logo">{t('org:settings.logoUrlLabel')}</Label>
            <Input id="org-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </div>

          {currentOrg.type === 'TeachingInstitution' && (
            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="org-platform-fee">{t('org:settings.platformFeeLabel')}</Label>
                  <Input
                    id="org-platform-fee"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={platformFee}
                    onChange={(e) => setPlatformFee(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="org-org-fee">{t('org:settings.orgFeeLabel')}</Label>
                  <Input
                    id="org-org-fee"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={orgFee}
                    onChange={(e) => setOrgFee(parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t('org:settings.feeHelp')}</p>
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? t('common:saving') : t('common:save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
