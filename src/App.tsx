import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { StudentLayout } from './components/layouts/StudentLayout'
import { TeacherLayout } from './components/layouts/TeacherLayout'
import { AdminLayout } from './components/layouts/AdminLayout'
import { AccountantLayout, SecretaryLayout } from './components/layouts/StaffPortalLayout'
import { PublicLayout } from './components/PublicLayout'
import { RoleGuard } from './auth/RoleGuard'
import { AdminPortalGuard, SupportStaffGuard } from './auth/SupportStaffGuard'
import { SupportTeamRouteRedirect } from './auth/SupportTeamRouteRedirect'
import { AuthGuard } from './auth/AuthGuard'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { AppThemeSync } from './theme/AppThemeSync'
import { SupportPageShell } from './components/layouts/SupportPageShell'

// Public pages (lazy)
const PublicCoursesPage = lazy(() =>
  import('./pages/PublicCoursesPage').then((m) => ({ default: m.PublicCoursesPage }))
)
const CourseDetailsPage = lazy(() =>
  import('./pages/CourseDetailsPage').then((m) => ({ default: m.CourseDetailsPage }))
)

// Student pages (lazy)
const DashboardPage = lazy(() =>
  import('./pages/student/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const CatalogPage = lazy(() =>
  import('./pages/student/CatalogPage').then((m) => ({ default: m.CatalogPage }))
)
const MyClassesPage = lazy(() =>
  import('./pages/student/MyClassesPage').then((m) => ({ default: m.MyClassesPage }))
)
const CourseLessonsPage = lazy(() =>
  import('./pages/student/CourseLessonsPage').then((m) => ({ default: m.CourseLessonsPage }))
)
const LessonViewerPage = lazy(() =>
  import('./pages/student/LessonViewerPage').then((m) => ({ default: m.LessonViewerPage }))
)
const CourseCertificatePage = lazy(() =>
  import('./pages/student/CourseCertificatePage').then((m) => ({ default: m.CourseCertificatePage }))
)
const CalendarPage = lazy(() =>
  import('./pages/student/CalendarPage').then((m) => ({ default: m.CalendarPage }))
)
const StudentLiveSessionsPage = lazy(() =>
  import('./pages/student/LiveSessionsPage').then((m) => ({ default: m.LiveSessionsPage }))
)
const AssignmentsPage = lazy(() =>
  import('./pages/student/AssignmentsPage').then((m) => ({ default: m.AssignmentsPage }))
)
const ExamsPage = lazy(() =>
  import('./pages/student/ExamsPage').then((m) => ({ default: m.ExamsPage }))
)
const StudentMessagesPage = lazy(() =>
  import('./pages/student/MessagesPage').then((m) => ({ default: m.MessagesPage }))
)
const StudentProfilePage = lazy(() =>
  import('./pages/student/ProfilePage').then((m) => ({ default: m.ProfilePage }))
)
const StudentSettingsPage = lazy(() =>
  import('./pages/student/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)

// Teacher pages (lazy)
const TeacherDashboardPage = lazy(() =>
  import('./pages/teacher/TeacherDashboardPage').then((m) => ({ default: m.TeacherDashboardPage }))
)
const TeacherMyCoursesPage = lazy(() =>
  import('./pages/teacher/TeacherMyCoursesPage').then((m) => ({ default: m.TeacherMyCoursesPage }))
)
const CreateCoursePage = lazy(() =>
  import('./pages/teacher/CreateCoursePage').then((m) => ({ default: m.CreateCoursePage }))
)
const EditCoursePage = lazy(() =>
  import('./pages/teacher/EditCoursePage').then((m) => ({ default: m.EditCoursePage }))
)
const LessonsContentPage = lazy(() =>
  import('./pages/teacher/LessonsContentPage').then((m) => ({ default: m.LessonsContentPage }))
)
const CourseLessonsManagementPage = lazy(() =>
  import('./pages/teacher/CourseLessonsManagementPage').then((m) => ({
    default: m.CourseLessonsManagementPage,
  }))
)
const TeacherAssignmentsPage = lazy(() =>
  import('./pages/teacher/TeacherAssignmentsPage').then((m) => ({ default: m.TeacherAssignmentsPage }))
)
const CreateAssignmentPage = lazy(() =>
  import('./pages/teacher/CreateAssignmentPage').then((m) => ({ default: m.CreateAssignmentPage }))
)
const EditAssignmentPage = lazy(() =>
  import('./pages/teacher/EditAssignmentPage').then((m) => ({ default: m.EditAssignmentPage }))
)
const TeacherAssignmentSubmissionsPage = lazy(() =>
  import('./pages/teacher/TeacherAssignmentSubmissionsPage').then((m) => ({
    default: m.TeacherAssignmentSubmissionsPage,
  }))
)
const TeacherAssignmentGradePage = lazy(() =>
  import('./pages/teacher/TeacherAssignmentGradePage').then((m) => ({
    default: m.TeacherAssignmentGradePage,
  }))
)
const TeacherExamsPage = lazy(() =>
  import('./pages/teacher/TeacherExamsPage').then((m) => ({ default: m.TeacherExamsPage }))
)
const CreateExamPage = lazy(() =>
  import('./pages/teacher/CreateExamPage').then((m) => ({ default: m.CreateExamPage }))
)
const TeacherExamDetailPage = lazy(() =>
  import('./pages/teacher/TeacherExamDetailPage').then((m) => ({ default: m.TeacherExamDetailPage }))
)
const TeacherCalendarPage = lazy(() =>
  import('./pages/teacher/TeacherCalendarPage').then((m) => ({ default: m.TeacherCalendarPage }))
)
const TeacherLiveSessionsPage = lazy(() =>
  import('./pages/teacher/TeacherLiveSessionsPage').then((m) => ({ default: m.TeacherLiveSessionsPage }))
)
const TeacherStudentsPage = lazy(() =>
  import('./pages/teacher/TeacherStudentsPage').then((m) => ({ default: m.TeacherStudentsPage }))
)
const TeacherAtRiskStudentsPage = lazy(() =>
  import('./pages/teacher/TeacherAtRiskStudentsPage').then((m) => ({
    default: m.TeacherAtRiskStudentsPage,
  }))
)
const CourseStudentsPage = lazy(() =>
  import('./pages/teacher/CourseStudentsPage').then((m) => ({ default: m.CourseStudentsPage }))
)
const StudentDetailPage = lazy(() =>
  import('./pages/teacher/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage }))
)
// MessagesPage, ProfilePage, SettingsPage for teacher reuse student modules
const TeacherMessagesPage = lazy(() =>
  import('./pages/student/MessagesPage').then((m) => ({ default: m.MessagesPage }))
)
const TeacherProfilePage = lazy(() =>
  import('./pages/student/ProfilePage').then((m) => ({ default: m.ProfilePage }))
)
const TeacherSettingsPage = lazy(() =>
  import('./pages/student/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)

// Subscription & Payment pages (lazy)
const SubscriptionPlansPage = lazy(() =>
  import('./pages/admin/SubscriptionPlansPage').then((m) => ({ default: m.SubscriptionPlansPage }))
)
const AdminSubscriptionPage = lazy(() =>
  import('./pages/admin/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage }))
)
const TeacherSubscriptionPage = lazy(() =>
  import('./pages/teacher/SubscriptionPage').then((m) => ({ default: m.TeacherSubscriptionPage }))
)
const TeacherEarningsPage = lazy(() =>
  import('./pages/teacher/TeacherEarningsPage').then((m) => ({ default: m.TeacherEarningsPage }))
)
const CourseDiscountsPage = lazy(() =>
  import('./pages/teacher/CourseDiscountsPage').then((m) => ({ default: m.CourseDiscountsPage }))
)
const PaymentHistoryPage = lazy(() =>
  import('./pages/student/PaymentHistoryPage').then((m) => ({ default: m.PaymentHistoryPage }))
)
const CheckoutPage = lazy(() =>
  import('./pages/student/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
)
const PaymentCallbackPage = lazy(() =>
  import('./pages/student/PaymentCallbackPage').then((m) => ({ default: m.PaymentCallbackPage }))
)

import { Toaster } from './components/Toaster'
import { ErrorBoundary } from './components/ErrorBoundary'

// Admin pages (lazy)
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
)
const AdminUsersPage = lazy(() =>
  import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
)
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
)
const AdminCoursesPage = lazy(() =>
  import('./pages/admin/AdminCoursesPage').then((m) => ({ default: m.AdminCoursesPage }))
)
const AdminReportsPage = lazy(() =>
  import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage }))
)
const AdminAuditLogsPage = lazy(() =>
  import('./pages/admin/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage }))
)
const AdminMessagesPage = lazy(() =>
  import('./pages/student/MessagesPage').then((m) => ({ default: m.MessagesPage }))
)

// Admin Finance pages (lazy)
const FinanceOverviewPage = lazy(() =>
  import('./pages/admin/finance/FinanceOverviewPage').then((m) => ({
    default: m.FinanceOverviewPage,
  }))
)
const FinanceTransactionsPage = lazy(() =>
  import('./pages/admin/finance/FinanceTransactionsPage').then((m) => ({
    default: m.FinanceTransactionsPage,
  }))
)
const FinancePayoutsPage = lazy(() =>
  import('./pages/admin/finance/FinancePayoutsPage').then((m) => ({ default: m.FinancePayoutsPage }))
)
// Accountant & Secretary portals (lazy)
const AccountantDashboardPage = lazy(() =>
  import('./pages/accountant/AccountantDashboardPage').then((m) => ({
    default: m.AccountantDashboardPage,
  }))
)
const AccountantTransactionsPage = lazy(() =>
  import('./pages/accountant/AccountantTransactionsPage').then((m) => ({
    default: m.AccountantTransactionsPage,
  }))
)
const AccountantPayoutsPage = lazy(() =>
  import('./pages/accountant/AccountantPayoutsPage').then((m) => ({
    default: m.AccountantPayoutsPage,
  }))
)
const AccountantInvoicesPage = lazy(() =>
  import('./pages/accountant/AccountantInvoicesPage').then((m) => ({
    default: m.AccountantInvoicesPage,
  }))
)
const AccountantReportsPage = lazy(() =>
  import('./pages/accountant/AccountantReportsPage').then((m) => ({
    default: m.AccountantReportsPage,
  }))
)
const SecretaryDashboardPage = lazy(() =>
  import('./pages/secretary/SecretaryDashboardPage').then((m) => ({
    default: m.SecretaryDashboardPage,
  }))
)
const SecretaryEnrollmentsPage = lazy(() =>
  import('./pages/secretary/SecretaryEnrollmentsPage').then((m) => ({
    default: m.SecretaryEnrollmentsPage,
  }))
)
const SecretaryDirectoryPage = lazy(() =>
  import('./pages/secretary/SecretaryDirectoryPage').then((m) => ({
    default: m.SecretaryDirectoryPage,
  }))
)
const SecretaryCalendarPage = lazy(() =>
  import('./pages/secretary/SecretaryCalendarPage').then((m) => ({
    default: m.SecretaryCalendarPage,
  }))
)
const StaffSettingsPage = lazy(() =>
  import('./pages/staff/StaffSettingsPage').then((m) => ({ default: m.StaffSettingsPage }))
)
const StaffMessagesPage = lazy(() =>
  import('./pages/student/MessagesPage').then((m) => ({ default: m.MessagesPage }))
)

// Organization portal
import { OrgLayout } from './components/layouts/OrgLayout'
import { OrgGuard } from './auth/OrgGuard'
const OrgDashboardPage = lazy(() =>
  import('./pages/org/OrgDashboardPage').then((m) => ({ default: m.OrgDashboardPage }))
)
const OrgMembersPage = lazy(() =>
  import('./pages/org/OrgMembersPage').then((m) => ({ default: m.OrgMembersPage }))
)
const OrgSettingsPage = lazy(() =>
  import('./pages/org/OrgSettingsPage').then((m) => ({ default: m.OrgSettingsPage }))
)
const OrgCatalogPage = lazy(() =>
  import('./pages/org/OrgStubPage').then((m) => ({ default: m.OrgCatalogPage }))
)
const OrgLicensesListPage = lazy(() =>
  import('./pages/org/OrgLicensesListPage').then((m) => ({ default: m.OrgLicensesListPage }))
)
const OrgLicenseDetailPage = lazy(() =>
  import('./pages/org/OrgLicenseDetailPage').then((m) => ({ default: m.OrgLicenseDetailPage }))
)
const OrgComplianceDashboardPage = lazy(() =>
  import('./pages/org/OrgComplianceDashboardPage').then((m) => ({
    default: m.OrgComplianceDashboardPage,
  }))
)

// Support pages (lazy)
const MyTicketsPage = lazy(() =>
  import('./pages/support/MyTicketsPage').then((m) => ({ default: m.MyTicketsPage }))
)
const SupportHelpCenterPage = lazy(() =>
  import('./pages/support/SupportHelpCenterPage').then((m) => ({ default: m.SupportHelpCenterPage }))
)
const TicketDetailPage = lazy(() =>
  import('./pages/support/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage }))
)
const AdminSupportInboxPage = lazy(() =>
  import('./pages/support/AdminSupportInboxPage').then((m) => ({
    default: m.AdminSupportInboxPage,
  }))
)

function MinimalLoader() {
  const { t } = useTranslation(['common'])
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">{t('common:loading')}</p>
    </div>
  )
}

/**
 * Redirect legacy /my-classes/... URLs to the /student/... equivalents.
 * <Navigate to> does NOT interpolate :params, so we rebuild the path with useParams().
 */
function LegacyMyClassesRedirect() {
  const { courseId = '', lessonId } = useParams<{ courseId: string; lessonId?: string }>()
  const target = lessonId
    ? `/student/my-classes/${courseId}/lessons/${lessonId}`
    : `/student/my-classes/${courseId}/lessons`
  return <Navigate to={target} replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppThemeSync />
      <Suspense fallback={<MinimalLoader />}>
        <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/accept-invite" element={<AcceptInvitePage />} />
              <Route path="/courses" element={<PublicCoursesPage />} />
              <Route path="/courses/:id" element={<CourseDetailsPage />} />
              {/* Payment callback (public so it works for any role after Lahza redirect) */}
              <Route path="/payment/callback" element={<PaymentCallbackPage />} />
            </Route>

            {/* Student Portal - /student/* */}
            <Route
              path="/student/*"
              element={
                <RoleGuard allowedRole="Student">
                  <StudentLayout />
                </RoleGuard>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="my-classes" element={<MyClassesPage />} />
              <Route path="my-classes/:courseId/lessons" element={<CourseLessonsPage />} />
              <Route path="my-classes/:courseId/lessons/:lessonId" element={<LessonViewerPage />} />
              <Route path="my-classes/:courseId/certificate" element={<CourseCertificatePage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="live-sessions" element={<StudentLiveSessionsPage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="messages" element={<StudentMessagesPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
              <Route path="settings" element={<StudentSettingsPage />} />
              <Route path="payments" element={<PaymentHistoryPage />} />
              <Route path="checkout/:courseId" element={<CheckoutPage />} />
              <Route path="payment/callback" element={<PaymentCallbackPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Teacher Portal - /teacher/* */}
            <Route
              path="/teacher/*"
              element={
                <RoleGuard allowedRole="Teacher">
                  <TeacherLayout />
                </RoleGuard>
              }
            >
              <Route index element={<Navigate to="/teacher/dashboard" replace />} />
              <Route path="dashboard" element={<TeacherDashboardPage />} />
              <Route path="courses" element={<TeacherMyCoursesPage />} />
              {/* /teacher/courses/new is natural URL for create; aliased to /teacher/create-course. */}
              <Route path="courses/new" element={<CreateCoursePage />} />
              <Route path="courses/:id" element={<Navigate to="edit" replace />} />
              <Route path="courses/:id/edit" element={<EditCoursePage />} />
              <Route path="courses/:id/lessons" element={<CourseLessonsManagementPage />} />
              <Route path="courses/:id/students" element={<CourseStudentsPage />} />
              <Route path="create-course" element={<CreateCoursePage />} />
              <Route path="lessons" element={<LessonsContentPage />} />
              <Route path="assignments" element={<TeacherAssignmentsPage />} />
              <Route path="assignments/create" element={<CreateAssignmentPage />} />
              <Route path="assignments/:assignmentId/submissions" element={<TeacherAssignmentSubmissionsPage />} />
              <Route path="assignments/:assignmentId/grade" element={<TeacherAssignmentGradePage />} />
              <Route path="assignments/:assignmentId/edit" element={<EditAssignmentPage />} />
              <Route path="exams" element={<TeacherExamsPage />} />
              <Route path="exams/create" element={<CreateExamPage />} />
              <Route path="exams/:id" element={<TeacherExamDetailPage />} />
              <Route path="calendar" element={<TeacherCalendarPage />} />
              <Route path="live-sessions" element={<TeacherLiveSessionsPage />} />
              <Route path="students" element={<TeacherStudentsPage />} />
              <Route path="students/:id" element={<StudentDetailPage />} />
              <Route path="at-risk-students" element={<TeacherAtRiskStudentsPage />} />
              <Route path="messages" element={<TeacherMessagesPage />} />
              <Route path="profile" element={<TeacherProfilePage />} />
              <Route path="settings" element={<TeacherSettingsPage />} />
              <Route path="subscription" element={<TeacherSubscriptionPage />} />
              <Route path="earnings" element={<TeacherEarningsPage />} />
              <Route path="payment/callback" element={<PaymentCallbackPage />} />
              <Route path="courses/:id/discounts" element={<CourseDiscountsPage />} />
              {/* Old QA URL — discounts now live per-course under /teacher/courses/:id/discounts */}
              <Route path="discounts" element={<Navigate to="/teacher/courses" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Admin Portal - /admin/* */}
            <Route
              path="/admin/*"
              element={
                <AdminPortalGuard>
                  <AdminLayout />
                </AdminPortalGuard>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="messages" element={<AdminMessagesPage />} />
              <Route path="courses" element={<AdminCoursesPage />} />

              {/* Finance Sub-Routes */}
              <Route path="finance" element={<FinanceOverviewPage />} />
              <Route path="finance/transactions" element={<FinanceTransactionsPage />} />
              <Route path="finance/payouts" element={<FinancePayoutsPage />} />
              <Route path="finance/revenue-split" element={<Navigate to="/admin/finance" replace />} />

              <Route path="transactions" element={<Navigate to="/admin/finance/transactions" replace />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="subscription-plans" element={<SubscriptionPlansPage />} />
              <Route path="payment/callback" element={<PaymentCallbackPage />} />
              <Route path="subscription" element={<AdminSubscriptionPage />} />
              <Route path="support-tickets" element={<AdminSupportInboxPage />} />
              <Route path="support-tickets/:ticketId" element={<TicketDetailPage staffView basePath="/admin/support-tickets" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Legacy /support-team/* → admin portal */}
            <Route
              path="/support-team/*"
              element={
                <SupportStaffGuard>
                  <SupportTeamRouteRedirect />
                </SupportStaffGuard>
              }
            />

            {/* Accountant portal */}
            <Route
              path="/accountant/*"
              element={
                <RoleGuard allowedRole="Accountant">
                  <AccountantLayout />
                </RoleGuard>
              }
            >
              <Route index element={<Navigate to="/accountant/dashboard" replace />} />
              <Route path="dashboard" element={<AccountantDashboardPage />} />
              <Route path="transactions" element={<AccountantTransactionsPage />} />
              <Route path="payouts" element={<AccountantPayoutsPage />} />
              <Route path="invoices" element={<AccountantInvoicesPage />} />
              <Route path="reports" element={<AccountantReportsPage />} />
              <Route path="messages" element={<StaffMessagesPage />} />
              <Route path="settings" element={<StaffSettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Secretary portal */}
            <Route
              path="/secretary/*"
              element={
                <RoleGuard allowedRole="Secretary">
                  <SecretaryLayout />
                </RoleGuard>
              }
            >
              <Route index element={<Navigate to="/secretary/dashboard" replace />} />
              <Route path="dashboard" element={<SecretaryDashboardPage />} />
              <Route path="enrollments" element={<SecretaryEnrollmentsPage />} />
              <Route path="directory" element={<SecretaryDirectoryPage />} />
              <Route path="calendar" element={<SecretaryCalendarPage />} />
              <Route path="messages" element={<StaffMessagesPage />} />
              <Route path="settings" element={<StaffSettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Organization Portal - /org/:slug/* */}
            <Route
              path="/org/:slug/*"
              element={
                <OrgGuard>
                  <OrgLayout />
                </OrgGuard>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<OrgDashboardPage />} />
              <Route path="members" element={<OrgMembersPage />} />
              <Route path="courses" element={<OrgCatalogPage />} />
              {/* Licenses & compliance: OrgManager and up (OrgAdmin always passes OrgGuard). */}
              <Route
                path="licenses"
                element={
                  <OrgGuard requireRole="OrgManager">
                    <OrgLicensesListPage />
                  </OrgGuard>
                }
              />
              <Route
                path="licenses/:licenseId"
                element={
                  <OrgGuard requireRole="OrgManager">
                    <OrgLicenseDetailPage />
                  </OrgGuard>
                }
              />
              <Route
                path="compliance"
                element={
                  <OrgGuard requireRole="OrgManager">
                    <OrgComplianceDashboardPage />
                  </OrgGuard>
                }
              />
              {/* Settings: OrgAdmin only. */}
              <Route
                path="settings"
                element={
                  <OrgGuard requireRole="OrgAdmin">
                    <OrgSettingsPage />
                  </OrgGuard>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Shortcut: /org or /org/dashboard (no slug) -> route to the user's first org */}
            <Route path="/org" element={<OrgGuard><Navigate to="/" replace /></OrgGuard>} />
            <Route path="/org/dashboard" element={<OrgGuard><Navigate to="/" replace /></OrgGuard>} />

            {/* Support Tickets — available to any authenticated user */}
            <Route
              path="/support"
              element={
                <AuthGuard>
                  <SupportPageShell />
                </AuthGuard>
              }
            >
              <Route index element={<MyTicketsPage />} />
              <Route path="help" element={<SupportHelpCenterPage />} />
              <Route path=":ticketId" element={<TicketDetailPage />} />
            </Route>

            {/* Legacy route redirects - redirect old paths to new portal paths */}
            <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/catalog" element={<Navigate to="/student/catalog" replace />} />
            <Route path="/my-classes" element={<Navigate to="/student/my-classes" replace />} />
            <Route path="/my-classes/:courseId/lessons" element={<LegacyMyClassesRedirect />} />
            <Route path="/my-classes/:courseId/lessons/:lessonId" element={<LegacyMyClassesRedirect />} />
            <Route path="/calendar" element={<Navigate to="/student/calendar" replace />} />
            <Route path="/assignments" element={<Navigate to="/student/assignments" replace />} />
            <Route path="/exams" element={<Navigate to="/student/exams" replace />} />
            <Route path="/messages" element={<Navigate to="/student/messages" replace />} />
            <Route path="/profile" element={<Navigate to="/student/profile" replace />} />
            <Route path="/settings" element={<Navigate to="/student/settings" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster />
    </ErrorBoundary>
  )
}
