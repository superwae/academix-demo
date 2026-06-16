import { useTranslation } from 'react-i18next';
import { FlaskConical } from 'lucide-react';
import { cn } from '../../../lib/cn';

/**
 * Tiny inline badge marking a section that still renders sample/mock data
 * (no backing API endpoint yet). Import wherever demo content is shown.
 */
export function DemoDataBadge({ className }: { className?: string }) {
  const { t } = useTranslation(['common']);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600',
        className
      )}
      title={t('common:demoDataTooltip', {
        defaultValue: 'This section shows sample data for demonstration purposes',
      })}
    >
      <FlaskConical className="h-3 w-3" />
      {t('common:demoData', { defaultValue: 'Demo data' })}
    </span>
  );
}
