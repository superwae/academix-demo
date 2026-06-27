import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HelpCircle, LifeBuoy, Inbox, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ContactSupportDialog } from './ContactSupportDialog'
import { useAuthStore } from '../store/useAuthStore'
import { isPlatformAdminAccount, isSupportStaffAccount } from '../lib/userRoles'

/**
 * Universal "Help" button mounted in every portal header.
 * - Contact support → opens the create-ticket dialog
 * - My tickets → links to the user-facing tickets list
 * - Support inbox (admins only) → admin triage view
 */
export function HelpButton() {
  const { t } = useTranslation(['support'])
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)

  const isAdmin = isPlatformAdminAccount(user?.roles)
  const isSupportStaff = isSupportStaffAccount(user?.roles)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">{t('support:helpButton')}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t('support:title')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <LifeBuoy className="me-2 h-4 w-4" />
            {t('support:helpMenu')}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/support/help">
              <BookOpen className="me-2 h-4 w-4" />
              {t('support:kb.title')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/support">
              <Inbox className="me-2 h-4 w-4" />
              {t('support:myTickets')}
            </Link>
          </DropdownMenuItem>
          {(isAdmin || isSupportStaff) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/support-tickets">
                  <Inbox className="me-2 h-4 w-4" />
                  {t('support:admin.title')}
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ContactSupportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(id) => navigate(`/support/${id}`)}
      />
    </>
  )
}
