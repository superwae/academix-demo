import { useTranslation } from 'react-i18next'
import { Hourglass } from 'lucide-react'

interface OrgStubPageProps {
  titleKey: string
  subtitleKey: string
  comingSoonKey: string
}

export function OrgStubPage({ titleKey, subtitleKey, comingSoonKey }: OrgStubPageProps) {
  const { t } = useTranslation(['org', 'common'])
  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(subtitleKey)}</p>
      </header>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-3">
        <Hourglass className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{t(comingSoonKey)}</p>
      </div>
    </div>
  )
}

export const OrgCatalogPage = () => (
  <OrgStubPage
    titleKey="org:catalog.title"
    subtitleKey="org:catalog.subtitle"
    comingSoonKey="org:catalog.comingSoon"
  />
)

export const OrgLicensesPage = () => (
  <OrgStubPage
    titleKey="org:licenses.title"
    subtitleKey="org:licenses.subtitle"
    comingSoonKey="org:licenses.comingSoon"
  />
)

export const OrgCompliancePage = () => (
  <OrgStubPage
    titleKey="org:compliance.title"
    subtitleKey="org:compliance.subtitle"
    comingSoonKey="org:compliance.comingSoon"
  />
)
