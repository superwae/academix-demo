import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation(['public'])
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="text-3xl font-semibold">{t('public:notFound.code')}</div>
      <div className="text-sm text-muted-foreground">{t('public:notFound.message')}</div>
      <Button asChild>
        <Link to="/dashboard">{t('public:notFound.goToDashboard')}</Link>
      </Button>
    </div>
  )
}



