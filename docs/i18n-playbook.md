# i18n Playbook

A practical reference for migrating any page to the translation system, verifying Arabic + RTL, and adding new languages. Skim it; don't read it end to end.

---

## 1. Architecture at a glance

| Piece | Where | What it does |
|---|---|---|
| Library | `react-i18next` + `i18next-browser-languagedetector` | Runtime translation + browser language detection |
| Config | `src/i18n/index.ts` | Registers resources, sets fallback, applies `<html lang>` / `<html dir>` / font class |
| Locale files | `src/i18n/locales/<lang>/<namespace>.json` | One JSON per namespace per language |
| Locale registry | `SUPPORTED_LOCALES` in `src/i18n/index.ts` | Single source of truth — add a row, the picker and router pick it up |
| Namespaces | `common`, `nav`, `auth`, `errors`, `public`, `student`, `teacher`, `admin` | Keeps keys scoped; import only what you need |
| Language picker | `src/components/LanguagePicker.tsx` | Renders `SUPPORTED_LOCALES` into a dropdown. Rendered in each layout's header |
| Fonts | `html.font-sans-latin` / `html.font-sans-arabic` in `src/style.css` | Swapped on `<html>` by `applyLocaleToDocument` |
| Direction | `<html dir="rtl">` | Set automatically when locale.dir is `rtl` |
| RTL helper | `.rtl-flip` in `src/style.css` | `transform: scaleX(-1)` for directional icons when RTL |

**Tailwind rule:** use logical classes (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`). They swap automatically under `dir="rtl"`. Never use `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right` in new code.

Active language is persisted in `localStorage` under the key `academix.locale`. On boot, the detector checks `localStorage` → `navigator` → `htmlTag`.

---

## 2. How to migrate a page

### Step 1 — Import the hook

```tsx
import { useTranslation } from 'react-i18next'
```

### Step 2 — Pick namespaces

Pass only the namespaces the page actually uses. Most pages need `common` plus one role-specific namespace.

```tsx
const { t } = useTranslation(['student', 'common'])
```

### Step 3 — Replace hardcoded strings

Use fully-qualified keys (`namespace:key`) so grep-ability is preserved.

### Step 4 — Add keys to BOTH `en/` and `ar/`

Every key you add to `src/i18n/locales/en/<ns>.json` MUST also land in `src/i18n/locales/ar/<ns>.json` with an Arabic translation. Missing keys fall back to English — that's a silent UX regression for Arabic users.

### Step 5 — Don't forget non-visible text

Toast messages, `aria-label`, `title`, `placeholder`, validation errors, dialog confirmation copy — all of it gets translated.

### Step 6 — Verify

1. `npm run build` (or let TS check the file) — catches missing imports.
2. Switch language via the picker in the header and eyeball every line of the page.
3. Scroll, open modals, trigger toasts. Arabic text should flow right-to-left with no stray English words in chrome.

### Before / after example

**Before:**

```tsx
export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this course?')) return
    await api.deleteCourse(courseId)
    toast.success('Course deleted')
  }
  return (
    <Button onClick={handleDelete} aria-label="Delete course">
      Delete
    </Button>
  )
}
```

**After:**

```tsx
import { useTranslation } from 'react-i18next'

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const { t } = useTranslation(['teacher', 'common'])
  const handleDelete = async () => {
    if (!confirm(t('teacher:courses.deleteConfirm'))) return
    await api.deleteCourse(courseId)
    toast.success(t('teacher:courses.deleteSuccess'))
  }
  return (
    <Button onClick={handleDelete} aria-label={t('teacher:courses.deleteAria')}>
      {t('common:delete')}
    </Button>
  )
}
```

Then, in `src/i18n/locales/en/teacher.json`:

```json
{
  "courses": {
    "deleteConfirm": "Are you sure you want to delete this course?",
    "deleteSuccess": "Course deleted",
    "deleteAria": "Delete course"
  }
}
```

And `src/i18n/locales/ar/teacher.json`:

```json
{
  "courses": {
    "deleteConfirm": "هل أنت متأكد أنك تريد حذف هذه الدورة؟",
    "deleteSuccess": "تم حذف الدورة",
    "deleteAria": "حذف الدورة"
  }
}
```

---

## 3. Adding a new namespace

Only do this if an existing namespace doesn't fit (e.g. a whole new role portal). Otherwise nest under an existing namespace.

1. Create `src/i18n/locales/en/<new-ns>.json` with `{}`.
2. Create `src/i18n/locales/ar/<new-ns>.json` with `{}`.
3. In `src/i18n/index.ts`:
   - Add imports at the top:
     ```ts
     import enSecretary from './locales/en/secretary.json'
     import arSecretary from './locales/ar/secretary.json'
     ```
   - Add to the `resources` object under both `en` and `ar`:
     ```ts
     secretary: enSecretary,
     // ...
     secretary: arSecretary,
     ```
   - Add the string to the `NAMESPACES` array:
     ```ts
     export const NAMESPACES = [
       'common', 'nav', 'auth', 'errors', 'public',
       'student', 'teacher', 'admin', 'secretary',
     ] as const
     ```

That's it. Restart the dev server to pick up new JSON imports.

---

## 4. Adding a new language

Example: adding French.

1. Create `src/i18n/locales/fr/` and copy every file from `src/i18n/locales/en/` into it. Translate each value. Keep the JSON structure identical — missing keys fall back to English.
2. In `src/i18n/index.ts`:
   - Import all `fr*` namespace files the same way English is imported.
   - Add them under `resources.fr`.
   - Add one row to `SUPPORTED_LOCALES`:
     ```ts
     { code: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr', fontClass: 'font-sans-latin' },
     ```
3. Font stack: French uses Latin glyphs, so `font-sans-latin` is fine. For non-Latin scripts (Hebrew, Thai, Hindi) add a new `html.font-sans-<script>` rule in `src/style.css` with an appropriate webfont and point `fontClass` at it.
4. Restart the dev server.
5. `LanguagePicker` reads `SUPPORTED_LOCALES` at render time, so French appears in the dropdown with no further edits.

---

## 5. RTL checklist

Before marking a page done, run through this:

- **Tailwind directionals**: grep the file for `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `translate-x-`, `-ml-`, `-mr-`. Replace with `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`. Negative margins use `-ms-` / `-me-`.
- **Directional icons**: `ChevronLeft`, `ChevronRight`, `ArrowLeft`, `ArrowRight`, `CornerDownLeft`, etc. If the icon means "next" / "previous" / "back" semantically, wrap it:
  ```tsx
  <span className="rtl-flip"><ChevronRight className="h-4 w-4" /></span>
  ```
  Do NOT flip icons that encode a fixed direction (e.g. a compass arrow, a map pin, an up-arrow).
- **Mixed-script content**: English phrases embedded in Arabic paragraphs (URLs, code, brand names) can render awkwardly. Wrap pure-English inline spans:
  ```tsx
  <span dir="ltr">AcademiX</span>
  ```
- **Dates and numbers**: don't use `date-fns` default `format()` — it ignores locale. Use `Intl`:
  ```tsx
  new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(date)
  new Intl.NumberFormat(i18n.language).format(1234.56)
  ```
- **Flex direction**: `flex-row-reverse` is almost never what you want. Let logical properties handle it.
- **Absolute positioning**: `right-0` becomes `end-0`, `left-4` becomes `start-4`.

---

## 6. Common pitfalls

- **Don't call `useTranslation` at module scope.** Hooks only run inside components. For arrays of nav items or static config, store `labelKey: 'nav:dashboard'` and resolve via `t(item.labelKey)` inside the component that renders the list.
- **Don't concat translated strings.** Use interpolation. Arabic and French may need variables in a different grammatical position.
  ```tsx
  // Wrong
  t('welcome') + ' ' + user.name
  // Right
  t('welcome', { name: user.name })  // "Welcome, {{name}}" / "مرحباً، {{name}}"
  ```
- **Don't translate user-generated content.** Course titles, lesson descriptions, teacher names, assignment prompts — those are authored data, not UI chrome. Translate only the frame around them.
- **Don't hardcode formatting.** No manual comma-as-thousands, no `.toFixed(2) + ' USD'`. Use `Intl.NumberFormat` with `style: 'currency'`.
- **Don't assume fallback is fine.** An untranslated Arabic page with English fallbacks looks broken, not bilingual. Every key needs an `ar` entry before you ship.
- **Test both directions.** The picker is in every layout header — switch, then click through the page. Mixed-LTR breakage shows up instantly when the full UI mirrors.

---

## 7. Progress tracker

Only `PublicLayout` and `LoginPage` currently consume `useTranslation`. Everything else is unmigrated.

### Layouts / shared

- [x] `src/components/PublicLayout.tsx`
- [x] `src/components/LanguagePicker.tsx`
- [ ] `src/components/Layout.tsx`
- [ ] `src/components/TeacherLayout.tsx`
- [ ] `src/components/NotificationBell.tsx`
- [ ] `src/components/OnboardingModal.tsx`
- [ ] `src/components/ErrorBoundary.tsx`
- [ ] `src/components/Toaster.tsx`
- [ ] `src/components/CourseDiscussion.tsx`
- [ ] `src/components/EnhancedVideoPlayer.tsx`
- [ ] `src/components/LessonNotesPanel.tsx`
- [ ] `src/components/ProtectedRoute.tsx`
- [ ] `src/components/layouts/*`
- [ ] `src/components/admin/*`
- [ ] `src/components/course/*`
- [ ] `src/components/ui/*` (only if any hardcoded copy — most are primitives)

### Public / auth pages (`src/pages/`)

- [x] `LoginPage.tsx`
- [ ] `HomePage.tsx`
- [ ] `RegisterPage.tsx`
- [ ] `ForgotPasswordPage.tsx`
- [ ] `ResetPasswordPage.tsx`
- [ ] `VerifyEmailPage.tsx`
- [ ] `PublicCoursesPage.tsx`
- [ ] `CourseDetailsPage.tsx`
- [ ] `NotFoundPage.tsx`

### Mixed-role pages (`src/pages/`)

- [ ] `DashboardPage.tsx`
- [ ] `CatalogPage.tsx`
- [ ] `MyClassesPage.tsx`
- [ ] `AssignmentsPage.tsx`
- [ ] `ExamsPage.tsx`
- [ ] `CalendarPage.tsx`
- [ ] `MessagesPage.tsx`
- [ ] `ProfilePage.tsx`
- [ ] `SettingsPage.tsx`

### Student portal (`src/pages/student/`)

- [ ] `DashboardPage.tsx`
- [ ] `CatalogPage.tsx`
- [ ] `MyClassesPage.tsx`
- [ ] `CourseLessonsPage.tsx`
- [ ] `LessonViewerPage.tsx`
- [ ] `CourseCertificatePage.tsx`
- [ ] `AssignmentsPage.tsx`
- [ ] `ExamsPage.tsx`
- [ ] `CalendarPage.tsx`
- [ ] `LiveSessionsPage.tsx`
- [ ] `MessagesPage.tsx`
- [ ] `ProfilePage.tsx`
- [ ] `SettingsPage.tsx`
- [ ] `CheckoutPage.tsx`
- [ ] `PaymentCallbackPage.tsx`
- [ ] `PaymentHistoryPage.tsx`

### Teacher portal (`src/pages/teacher/`)

- [ ] `TeacherDashboardPage.tsx`
- [ ] `TeacherMyCoursesPage.tsx`
- [ ] `CreateCoursePage.tsx`
- [ ] `EditCoursePage.tsx`
- [ ] `CourseLessonsManagementPage.tsx`
- [ ] `LessonsContentPage.tsx`
- [ ] `CourseStudentsPage.tsx`
- [ ] `CourseDiscountsPage.tsx`
- [ ] `TeacherStudentsPage.tsx`
- [ ] `StudentDetailPage.tsx`
- [ ] `TeacherAtRiskStudentsPage.tsx`
- [ ] `TeacherAssignmentsPage.tsx`
- [ ] `CreateAssignmentPage.tsx`
- [ ] `EditAssignmentPage.tsx`
- [ ] `TeacherAssignmentSubmissionsPage.tsx`
- [ ] `TeacherAssignmentGradePage.tsx`
- [ ] `TeacherExamsPage.tsx`
- [ ] `CreateExamPage.tsx`
- [ ] `TeacherExamDetailPage.tsx`
- [ ] `TeacherCalendarPage.tsx`
- [ ] `TeacherLiveSessionsPage.tsx`
- [ ] `SubscriptionPage.tsx`

### Admin portal (`src/pages/admin/`)

- [ ] `AdminDashboardPage.tsx`
- [ ] `AdminUsersPage.tsx`
- [ ] `AdminCoursesPage.tsx`
- [ ] `AdminReportsPage.tsx`
- [ ] `AdminAuditLogsPage.tsx`
- [ ] `AdminSettingsPage.tsx`
- [ ] `SubscriptionPage.tsx`
- [ ] `SubscriptionPlansPage.tsx`
- [ ] `finance/*`

### Accountant portal (`src/pages/accountant/`)

- [ ] `AccountantDashboardPage.tsx`
- [ ] `AccountantInvoicesPage.tsx`
- [ ] `AccountantPayoutsPage.tsx`
- [ ] `AccountantReportsPage.tsx`
- [ ] `AccountantTransactionsPage.tsx`

### Secretary portal (`src/pages/secretary/`)

- [ ] `SecretaryDashboardPage.tsx`
- [ ] `SecretaryDirectoryPage.tsx`
- [ ] `SecretaryEnrollmentsPage.tsx`
- [ ] `SecretaryCalendarPage.tsx`

### Staff (`src/pages/staff/`)

- [ ] `StaffSettingsPage.tsx`

---

## 8. Backend considerations (future)

Not implemented — note for when we wire a `User.PreferredLanguage` column:

- **Login response** should return the user's stored preferred language alongside the auth token.
- **Boot sequence**: after login, call `changeLanguage(user.preferredLanguage)` BEFORE any first render that uses `t()`. This overrides browser detection with the user's saved choice.
- **Sync on change**: when a logged-in user picks a language via the header picker, PATCH the preference to the backend so it persists across devices.
- **Email templates** (password reset, email verification, invoice notifications): the backend must pick the template variant matching the user's preferred language, falling back to English. Template keys can mirror frontend namespaces for consistency.
- **SignalR / push notifications**: include the target user's language in the payload, or translate server-side before emitting.
