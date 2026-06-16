import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { courseService, type CourseDto } from '../services/courseService';
import { formatMoney } from '../lib/money';
import { cn } from '../lib/cn';
import { toast } from 'sonner';
import { Search, Star, X, ArrowRight, Sparkles, BookOpen } from 'lucide-react';

/* ----------------------------------------------------------------------------
   Public course catalog — matches the landing page's visual language:
   bold type, pill filters, lifting cards, staggered CSS entrances (no
   animation library), debounced search so the grid doesn't flicker per key.
---------------------------------------------------------------------------- */

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

function CourseCard({ course, index }: { course: CourseDto; index: number }) {
  const { t } = useTranslation(['public']);
  const isNew = !course.ratingCount;
  return (
    <Link
      to={`/courses/${course.id}`}
      className="cx-card group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
      style={{ animationDelay: `${Math.min(index, 11) * 60}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {course.category || t('public:landing.courses.fallbackCategory')}
        </span>
        <span className="flex items-center gap-2">
          {course.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-600">
              <Sparkles className="h-3 w-3" />
              {t('public:courses.featured')}
            </span>
          )}
          {isNew ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              {t('public:courses.newBadge', { defaultValue: 'New' })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-medium">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {course.rating.toFixed(1)}
              <span className="text-xs text-muted-foreground">({course.ratingCount})</span>
            </span>
          )}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug line-clamp-2 transition-colors group-hover:text-primary">
        {course.title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
        {course.description}
      </p>

      <div className="mt-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          {initialsOf(course.instructorName || '?')}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{course.instructorName}</p>
          <p className="text-xs text-muted-foreground">{course.level}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4 mt-5">
        <span className="text-lg font-bold">
          {course.price && course.price > 0 ? (
            formatMoney(course.price)
          ) : (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-600">
              {t('public:courses.free')}
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 rtl:translate-x-2 rtl:group-hover:translate-x-0">
          {t('public:courses.viewCourse', { defaultValue: 'View course' })}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </span>
      </div>
    </Link>
  );
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="cx-card rounded-2xl border border-border/70 bg-card p-6"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-5 flex items-center gap-2.5">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-6 h-6 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function PublicCoursesPage() {
  const { t } = useTranslation(['public', 'common']);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [sortDescending] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Debounce typing so the grid doesn't reload on every keystroke
  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPageNumber(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, searchTerm, sortBy, sortDescending, selectedCategory]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await courseService.getCourses({
        pageNumber,
        pageSize,
        searchTerm: searchTerm || undefined,
        sortBy: sortBy || undefined,
        sortDescending,
      });
      setCourses(response.items);
      setTotalCount(response.totalCount);

      const uniqueCategories = Array.from(new Set(response.items.map((c) => c.category))).sort();
      setCategories((prev) => Array.from(new Set([...prev, ...uniqueCategories])).sort());
    } catch (error) {
      toast.error(t('public:courses.loadError'), {
        description: error instanceof Error ? error.message : t('public:courses.tryLater'),
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredCourses = useMemo(() => {
    if (selectedCategory === 'All') return courses;
    return courses.filter((c) => c.category === selectedCategory);
  }, [courses, selectedCategory]);

  // Re-keying the grid restarts the staggered entrance whenever results change
  const gridKey = `${selectedCategory}|${searchTerm}|${sortBy}|${pageNumber}|${loading}`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-20 pt-10">
      <style>{`
        .cx-card { animation: cx-in .5s cubic-bezier(.2,.7,.3,1) both; }
        @keyframes cx-in { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .cx-card { animation: none !important; } }
      `}</style>

      {/* Header */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          {t('public:courses.kicker', { defaultValue: 'Course catalog' })}
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
          {t('public:courses.catalogHeading')}
        </h1>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground">
          {t('public:courses.catalogSubtitle')}
        </p>
      </div>

      {/* Search + sort */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={t('public:courses.searchShortPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-12 w-full rounded-full border border-border bg-card ps-11 pe-10 text-sm outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label={t('common:clear', { defaultValue: 'Clear' })}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="sm:w-56">
          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value);
              setPageNumber(1);
            }}
            options={[
              { value: 'rating', label: t('public:courses.sortByRating') },
              { value: 'title', label: t('public:courses.sortByTitle') },
              { value: 'created', label: t('public:courses.sortByDate') },
            ]}
          />
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {['All', ...categories].map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  setPageNumber(1);
                }}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {category === 'All' ? t('public:courses.allCategory') : category}
              </button>
            );
          })}
        </div>
      )}

      {/* Results count */}
      <p className="mt-6 text-sm text-muted-foreground">
        {t('public:courses.showingCountOf', { count: filteredCourses.length, total: totalCount })}
      </p>

      {/* Grid */}
      <div key={gridKey} className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} index={i} />)
          : filteredCourses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
      </div>

      {/* Empty state */}
      {!loading && filteredCourses.length === 0 && (
        <div className="cx-card mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-border p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-semibold">{t('public:courses.noResultsTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('public:courses.noResultsAdjust')}</p>
          {(searchInput || selectedCategory !== 'All') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => {
                setSearchInput('');
                setSelectedCategory('All');
              }}
            >
              <X className="me-2 h-4 w-4" />
              {t('public:courses.clearFilter')}
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber === 1}
          >
            {t('public:courses.previous')}
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t('public:courses.page', { current: pageNumber, total: totalPages })}
          </span>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
            disabled={pageNumber === totalPages}
          >
            {t('public:courses.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
