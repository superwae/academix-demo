# 1. Responsive Design — Mobile & Tablet

## Why
The app was built desktop-first. The header, sidebar, grid layouts, tables,
and dialogs look broken or unusable on phones and tablets. Before public
launch, every primary flow (login, browse, enroll, pay, take a lesson,
view a class live) must work cleanly from a 375px-wide phone up to desktop.

## Current state

- Tailwind breakpoints are `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`.
- Sidebar layouts (Student, Teacher, Admin) hide the sidebar below `lg` and
  replace it with a Menu button — this works but the mobile menu dialog
  hasn't been audited for every route.
- Several pages use tables that overflow on mobile (e.g. `AdminUsersPage`,
  `PaymentHistoryPage`, `SubscriptionPlansPage`).
- Dialogs have `max-w-lg` set but content inside can still push past the
  viewport on small screens.
- FullCalendar week view does not work on phones — the grid cells become
  unreadable.
- The new "Start New Batch" dialog has 4 switches stacked vertically which
  works, but the meeting-time row in `CreateCoursePage` is too wide on
  phones.

## Breakpoints to support

| Width | Device | Treatment |
|-------|--------|-----------|
| 320–479 | small phone | single-column, compact text, stacked controls |
| 480–767 | phone / phablet | single-column, full-width cards, bottom-sheet dialogs |
| 768–1023 | tablet | two-column where meaningful, sidebar becomes collapsible |
| 1024+ | desktop | current layout |

## Work items

### Layouts
- [ ] Audit the mobile menu dialog in each layout — make sure every nav item
      is there, including new ones (Live Sessions, Payments, Subscription).
- [ ] Header search bar: move to an icon-trigger bottom sheet on phones.
- [ ] Dashboard grids: use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` so
      cards stack on phones.

### Tables
- [ ] Introduce a reusable `ResponsiveTable` wrapper that renders as a
      proper `<table>` on ≥md and as stacked label/value cards on phones.
- [ ] Apply to: AdminUsersPage, AdminCoursesPage, SubscriptionPlansPage,
      PaymentHistoryPage, FinanceTransactionsPage, TeacherStudentsPage,
      TeacherAssignmentSubmissionsPage, CourseDiscountsPage.

### Dialogs
- [ ] On phones, Dialog content should slide up from the bottom and be full
      width (`inset-x-0 bottom-0 rounded-t-2xl` instead of centered).
- [ ] Audit every form dialog: no horizontal scroll, all inputs reachable.

### Calendar
- [ ] FullCalendar: use `listWeek` view as the default below `md`; offer a
      "Show grid" toggle that requires horizontal scroll.
- [ ] Our new `LiveSessionsPage` list view already works well on mobile —
      promote it as the default entry point on phones.

### Specific hot spots
- [ ] `CreateCoursePage` meeting-time row: on phones, stack day / start /
      end vertically with a clear remove button.
- [ ] `ProfilePage` cover image + avatar: avatar should overlap the cover
      image at a safe spot that doesn't overflow on phones.
- [ ] `CheckoutPage` order summary: sticky at bottom of viewport on phones.
- [ ] Lesson viewer: video player should be full-width, controls sized for
      touch (min 44×44 hit targets).

## Technical notes

- Use Tailwind's `container` + `max-w-screen-lg` consistently rather than
  fixed pixel widths.
- Prefer `clamp()` in CSS for font-size/gap instead of breakpoint-specific
  classes when the value is continuous.
- Don't use `window.innerWidth` inside React state — use CSS media queries
  wherever possible to avoid extra re-renders.
- Every touch target must be ≥ 44×44 px (WCAG).
- Test with Chrome DevTools device emulation AND on a real phone (tunnel
  URL opens on the phone without a VPN).

## Definition of done

- [ ] Every page renders without horizontal scroll at 375px width.
- [ ] Every interactive element has a ≥ 44px hit target on mobile.
- [ ] All dialogs open and close cleanly on mobile without clipping.
- [ ] The full flow (browse → enroll → pay → take lesson → join live class)
      is testable end-to-end on a phone.
- [ ] A reviewer walks through the app on a phone and doesn't flag any
      broken layout.
