# 2. Arabic Language Support (i18n + RTL)

## Why
Our target market includes Arabic-speaking users (Palestine, Jordan, Saudi,
etc. — Lahza is the Palestinian gateway we integrated with). The app must
ship with full Arabic UI and proper RTL layout before launch.

## Current state

- All UI strings are hardcoded English inside `.tsx` files.
- No i18n library is installed.
- No RTL stylesheet or `dir="rtl"` switching.
- Documentation in `docs/` includes some Arabic files (`تحليل-منصة-أكاديمكس.md`)
  but the app itself is English-only.
- Tailwind is configured LTR-only (no `rtl:` variants in use anywhere).

## Approach

### Library
Use **`react-i18next`** (mature, tree-shakeable, supports namespaces, plural
forms, interpolation, lazy-loaded translation JSON).

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

### Folder layout
```
src/
├── i18n/
│   ├── index.ts             # initialization
│   ├── locales/
│   │   ├── en/
│   │   │   ├── common.json
│   │   │   ├── auth.json
│   │   │   ├── course.json
│   │   │   ├── payment.json
│   │   │   └── ...
│   │   └── ar/
│   │       └── ... (same keys)
```

### RTL strategy

- Install `@tailwindcss/forms` and enable `direction: rtl` on `<html>` when
  Arabic is active.
- Replace directional utility classes with logical equivalents:
  - `ml-2` → `ms-2` (margin-start)
  - `mr-2` → `me-2` (margin-end)
  - `pl-4` → `ps-4`
  - `pr-4` → `pe-4`
  - `left-0` → `start-0`
  - `right-0` → `end-0`
  - `text-left` → `text-start`
  - `text-right` → `text-end`
- Tailwind 3.3+ supports logical properties — verify our version or upgrade.
- Icons that indicate direction (chevrons, arrows) need to flip in RTL:
  wrap them in a `<DirectionalIcon>` helper that mirrors when `dir="rtl"`.

### Date / number formatting
- Use `Intl.DateTimeFormat` with locale instead of `date-fns` default format.
- Use `Intl.NumberFormat` for currency (ILS/USD/JOD all need proper locales).

## Work items

### Setup
- [ ] Install `react-i18next` + deps.
- [ ] Create `src/i18n/index.ts` with language detection (persisted to
      localStorage as `academix.locale`, fallback to browser language).
- [ ] Add `<I18nextProvider>` around the app in `main.tsx`.
- [ ] Add a language toggle to the header (next to the theme toggle), persists
      the choice, applies `dir="rtl"` / `dir="ltr"` on `<html>`.

### String extraction
- [ ] Walk every `.tsx` file, replace hardcoded strings with `t('namespace.key')`.
- [ ] Prioritize order: auth → public catalog → student portal → teacher portal →
      admin portal.
- [ ] Toast messages and error descriptions must also be translatable.
- [ ] Backend validation errors: either have the backend return a key the
      frontend can translate, or keep English errors for now and translate
      in a second pass.

### RTL layout audit
- [ ] Apply logical Tailwind classes globally (automated search/replace on
      `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`, `left-`, `right-`).
- [ ] Audit every layout with `dir="rtl"` active — many `flex-row` rows need
      `flex-row-reverse` only in specific cases (usually not; logical props
      handle it).
- [ ] Mirror directional icons (ChevronRight, ArrowLeft, etc.).
- [ ] Calendar (FullCalendar) has RTL support via `direction: 'rtl'` option —
      wire it to the current locale.
- [ ] Charts (Recharts) may need `reverse` on axes for RTL.

### Content considerations
- [ ] Course titles, descriptions, lesson titles: these are user-generated
      content, NOT UI strings — they stay in whatever language the author
      wrote them. Don't translate them.
- [ ] Email templates (password reset, verification) — create Arabic versions
      in `MailjetEmailService` and pick based on the user's stored language
      (add `PreferredLanguage` column to `Users` table).

### Testing
- [ ] Manually verify every primary flow in both languages.
- [ ] Add a visual-regression or screenshot check for at least the landing,
      login, dashboard, and checkout pages in each language.

## Gotchas

- **Mixed content**: When Arabic text contains English words or numbers,
  bidirectional algorithms kick in. Wrap pure-English spans with
  `<span dir="ltr">` if they look misaligned.
- **Font**: English font (Inter) doesn't render Arabic glyphs well. Add a
  secondary Arabic webfont (e.g. "Cairo", "Noto Sans Arabic") and switch
  via a CSS class on `<html>`.
- **Pluralization**: Arabic has six plural forms vs English's two. Use
  i18next's `Intl.PluralRules`-backed plurals, don't manually string-concat.

## Definition of done

- [ ] Language toggle in the header switches the entire UI between Arabic
      and English.
- [ ] No English leaks through when Arabic is active (no hardcoded strings
      left in any `.tsx`).
- [ ] Layout mirrors correctly in RTL: sidebar swaps sides, icons flip where
      directional, text aligns to the right.
- [ ] Dates, times, and currency are formatted with the active locale.
- [ ] Choice persists across sessions (localStorage + backend `Users.PreferredLanguage`).
