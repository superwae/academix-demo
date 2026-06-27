import { SupportInboxPage } from './SupportInboxPage'

/** Admin URL alias — Support staff can also reach this path. */
export function AdminSupportInboxPage() {
  return <SupportInboxPage basePath="/admin/support-tickets" />
}
