import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { StudentLayout } from './components/layouts/StudentLayout'
import { TeacherLayout } from './components/layouts/TeacherLayout'
import { AdminLayout } from './components/layouts/AdminLayout'
import { AccountantLayout, SecretaryLayout } from './components/layouts/StaffPortalLayout'
import { PublicLayout } from './components/PublicLayout'
import { RoleGuard } from './auth/RoleGuard'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { PublicCoursesPage } from './pages/PublicCoursesPage'
import { CourseDetailsPage } from './pages/CourseDetailsPage'
import { NotFoundPage } from './pages/NotFoundPage'

// Student pages
import { DashboardPage } from './pages/student/DashboardPage'
import { CatalogPage } from './pages/student/CatalogPage'
import { MyClassesPage } from './pages/student/MyClassesPage'
import { CourseLessonsPage } from './pages/student/CourseLessonsPage'
import { LessonViewerPage } from './pages/student/LessonViewerPage'
import { CourseCertificatePage } from './pages/student/CourseCertificatePage'
import { CalendarPage } from './pages/student/CalendarPage'
import { AssignmentsPage } from './pages/student/AssignmentsPage'
import { ExamsPage } from './pages/student/ExamsPage'
import { MessagesPage as StudentMessagesPage } from './pages/student/MessagesPage'
import { ProfilePage as StudentProfilePage } from './pages/student/ProfilePage'
import { SettingsPage as StudentSettingsPage } from './pages/student/SettingsPage'

// Teacher pages
import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage'
import { TeacherMyCoursesPage } from './pages/teacher/TeacherMyCoursesPage'
import { CreateCoursePage } from './pages/teacher/CreateCoursePage'
import { EditCoursePage } from './pages/teacher/EditCoursePage'
import { LessonsContentPage } from './pages/teacher/LessonsContentPage'
import { CourseLessonsManagementPage } from './pages/teacher/CourseLessonsManagementPage'
import { TeacherAssignmentsPage } from './pages/teacher/TeacherAssignmentsPage'
import { CreateAssignmentPage } from './pages/teacher/CreateAssignmentPage'
import { EditAssignmentPage } from './pages/teacher/EditAssignmentPage'
import { TeacherAssignmentSubmissionsPage } from './pages/teacher/TeacherAssignmentSubmissionsPage'
import { TeacherAssignmentGradePage } from './pages/teacher/TeacherAssignmentGradePage'
import { TeacherExamsPage } from './pages/teacher/TeacherExamsPage'
import { CreateExamPage } from './pages/teacher/CreateExamPage'
import { TeacherExamDetailPage } from './pages/teacher/TeacherExamDetailPage'
import { TeacherCalendarPage } from './pages/teacher/TeacherCalendarPage'
import { TeacherStudentsPage } from './pages/teacher/TeacherStudentsPage'
import { TeacherAtRiskStudentsPage } from './pages/teacher/TeacherAtRiskStudentsPage'
import { CourseStudentsPage } from './pages/teacher/CourseStudentsPage'
import { MessagesPage as TeacherMessagesPage } from './pages/student/MessagesPage'
import { ProfilePage as TeacherProfilePage } from './pages/student/ProfilePage'
import { SettingsPage as TeacherSettingsPage } from './pages/student/SettingsPage'

import { Toaster } from './components/Toaster'
import { ErrorBoundary } from './components/ErrorBoundary'

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage'
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage'
import { AdminReportsPage } from './pages/admin/AdminReportsPage'
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage'
import { MessagesPage as AdminMessagesPage } from './pages/student/MessagesPage'

// Admin Finance pages
import { FinanceOverviewPage } from './pages/admin/finance/FinanceOverviewPage'
import { FinanceTransactionsPage } from './pages/admin/finance/FinanceTransactionsPage'
import { FinancePayoutsPage } from './pages/admin/finance/FinancePayoutsPage'
import { FinanceRevenueSplitPage } from './pages/admin/finance/FinanceRevenueSplitPage'

// Accountant & Secretary portals
import { AccountantDashboardPage } from './pages/accountant/AccountantDashboardPage'
import { AccountantTransactionsPage } from './pages/accountant/AccountantTransactionsPage'
import { AccountantPayoutsPage } from './pages/accountant/AccountantPayoutsPage'
import { AccountantInvoicesPage } from './pages/accountant/AccountantInvoicesPage'
import { AccountantReportsPage } from './pages/accountant/AccountantReportsPage'
import { SecretaryDashboardPage } from './pages/secretary/SecretaryDashboardPage'
import { SecretaryEnrollmentsPage } from './pages/secretary/SecretaryEnrollmentsPage'
import { SecretaryDirectoryPage } from './pages/secretary/SecretaryDirectoryPage'
import { SecretaryCalendarPage } from './pages/secretary/SecretaryCalendarPage'
import { StaffSettingsPage } from './pages/staff/StaffSettingsPage'
import { MessagesPage as StaffMessagesPage } from './pages/student/MessagesPage'

export default function App() {
  const location = useLocation()

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="min-h-dvh"
        >
          <Routes location={location}>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/courses" element={<PublicCoursesPage />} />
              <Route path="/courses/:id" element={<CourseDetailsPage />} />
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
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="messages" element={<StudentMessagesPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
              <Route path="settings" element={<StudentSettingsPage />} />
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
              <Route path="students" element={<TeacherStudentsPage />} />
              <Route path="at-risk-students" element={<TeacherAtRiskStudentsPage />} />
              <Route path="messages" element={<TeacherMessagesPage />} />
              <Route path="profile" element={<TeacherProfilePage />} />
              <Route path="settings" element={<TeacherSettingsPage />} />
            </Route>

            {/* Admin Portal - /admin/* */}
            <Route
              path="/admin/*"
              element={
                <RoleGuard allowedRole="Admin">
                  <AdminLayout />
                </RoleGuard>
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
              <Route path="finance/revenue-split" element={<FinanceRevenueSplitPage />} />
              
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

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
            </Route>

            {/* Legacy route redirects - redirect old paths to new portal paths */}
            <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/catalog" element={<Navigate to="/student/catalog" replace />} />
            <Route path="/my-classes" element={<Navigate to="/student/my-classes" replace />} />
            <Route path="/my-classes/:courseId/lessons" element={<Navigate to="/student/my-classes/:courseId/lessons" replace />} />
            <Route path="/my-classes/:courseId/lessons/:lessonId" element={<Navigate to="/student/my-classes/:courseId/lessons/:lessonId" replace />} />
            <Route path="/calendar" element={<Navigate to="/student/calendar" replace />} />
            <Route path="/assignments" element={<Navigate to="/student/assignments" replace />} />
            <Route path="/exams" element={<Navigate to="/student/exams" replace />} />
            <Route path="/messages" element={<Navigate to="/student/messages" replace />} />
            <Route path="/profile" element={<Navigate to="/student/profile" replace />} />
            <Route path="/settings" element={<Navigate to="/student/settings" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <Toaster />
    </ErrorBoundary>
  )
}
