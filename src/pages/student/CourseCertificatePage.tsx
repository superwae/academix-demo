import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { courseExtrasService, type CertificateDto } from '../../services/courseExtrasService';
import { ArrowLeft, Award, Clock, Loader2, Printer, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/cn';

/** Platform executive signature (shown on every certificate) */
const PLATFORM_EXECUTIVE = {
  name: 'Abedalrhman Omar',
  title: 'Chief Executive Officer',
  organization: 'AcademiX',
} as const;

function formatProgramHours(hours: number | null | undefined): string | null {
  if (hours == null || hours <= 0 || Number.isNaN(hours)) return null;
  const n = Number(hours);
  const label = n === 1 ? 'hour' : 'hours';
  return `${Number.isInteger(n) ? n : n.toFixed(1)} ${label}`;
}

/** Circular official seal — print-safe */
function CertificateOfficialSeal({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none select-none', className)}
      aria-hidden
    >
      <div className="relative flex h-[7.25rem] w-[7.25rem] items-center justify-center sm:h-[8rem] sm:w-[8rem]">
        <div
          className="absolute inset-0 rotate-[-11deg] rounded-full border-[3px] border-dashed border-[#b45309]/85 bg-[#fffbeb]/90 shadow-md ring-2 ring-[#d97706]/25"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(180,83,9,0.15)' }}
        />
        <div className="absolute inset-[10px] rotate-[-11deg] rounded-full border border-[#92400e]/40" />
        <div className="relative z-10 flex rotate-[-11deg] flex-col items-center justify-center px-3 text-center text-[#78350f]">
          <span
            className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#92400e] sm:text-[10px]"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Official
          </span>
          <span
            className="mt-0.5 text-sm font-semibold leading-tight text-[#451a03] sm:text-base"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            AcademiX
          </span>
          <ShieldCheck className="mx-auto my-1 h-5 w-5 text-[#b45309] sm:h-6 sm:w-6" strokeWidth={1.5} />
          <span
            className="text-[8px] font-semibold uppercase tracking-[0.25em] text-[#a16207] sm:text-[9px]"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Verified
          </span>
        </div>
      </div>
    </div>
  );
}

/** Formal certificate layout — screen + print (Save as PDF) */
export function CourseCertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [data, setData] = useState<CertificateDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        setLoading(true);
        const cert = await courseExtrasService.getCertificate(courseId);
        setData(cert);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load certificate');
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <Button variant="ghost" size="sm" asChild>
          <Link to={courseId ? `/student/my-classes/${courseId}/lessons` : '/student/my-classes'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to course
          </Link>
        </Button>
        <p className="text-muted-foreground">Certificate unavailable.</p>
      </div>
    );
  }

  const formattedDate =
    data.completedAt != null
      ? new Date(data.completedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

  return (
    <div
      className={[
        'certificate-page -m-4 min-h-[calc(100vh-6rem)] max-w-none rounded-2xl',
        'bg-[#faf8f5] bg-gradient-to-b from-[#faf8f5] via-[#f5f2eb] to-[#ede8df] px-4 py-8 text-slate-900',
        'sm:-m-6 sm:px-6 sm:py-10',
        'md:-m-8 md:px-8 md:py-10',
        'print:m-0 print:min-h-0 print:rounded-none print:bg-white print:p-0',
        'dark:bg-[#faf8f5] dark:from-[#faf8f5] dark:via-[#f5f2eb] dark:to-[#ede8df]',
      ].join(' ')}
    >
      {/* Toolbar — always light chrome so dark mode does not turn the page black */}
      <div className="mx-auto mb-8 flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 print:hidden">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-300 dark:bg-white dark:text-slate-800 dark:hover:bg-slate-50"
          asChild
        >
          <Link to={`/student/my-classes/${courseId}/lessons`}>
            <ArrowLeft className="h-4 w-4" />
            Back to course
          </Link>
        </Button>
        <Button
          type="button"
          onClick={handlePrint}
          className="gap-2 bg-slate-900 px-6 text-white shadow-md hover:bg-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      <div className="mx-auto max-w-6xl px-3 sm:px-6 print:max-w-none print:px-0">
        {/* Outer frame */}
        <article
          className={[
            'certificate-sheet relative mx-auto overflow-hidden rounded-sm shadow-2xl print:shadow-none',
            'min-h-[min(92vh,1040px)] w-full max-w-[1100px]',
            'border-[3px] border-[#b8974a]/90 bg-white',
            'ring-1 ring-[#1e293b]/[0.08]',
            'before:pointer-events-none before:absolute before:inset-0 before:rounded-sm',
            'before:bg-[repeating-linear-gradient(-45deg,transparent,transparent_14px,rgba(15,23,42,0.025)_14px,rgba(15,23,42,0.025)_28px)]',
            'after:pointer-events-none after:absolute after:inset-3 after:rounded-sm after:border after:border-[#1e293b]/10',
          ].join(' ')}
        >
          {/* Inner gold line */}
          <div className="pointer-events-none absolute inset-5 rounded-sm border border-[#c9a962]/50 sm:inset-6" />

          <div className="relative flex min-h-[min(92vh,1040px)] flex-col px-6 pb-10 pt-12 sm:px-12 sm:pb-14 sm:pt-16 md:px-16 md:pt-20">
            <CertificateOfficialSeal className="absolute right-4 top-20 z-10 sm:right-8 sm:top-24 print:top-20 print:right-6" />

            {/* Top: emblem + title */}
            <header className="pr-16 text-center sm:pr-0">
              <div className="mx-auto mb-8 flex justify-center">
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#c9a962] bg-gradient-to-br from-[#fefce8] via-amber-50 to-[#fef3c7] shadow-inner sm:h-28 sm:w-28"
                  aria-hidden
                >
                  <div className="absolute inset-2 rounded-full border border-[#b8974a]/45" />
                  <Award className="relative z-10 h-12 w-12 text-[#92400e] drop-shadow-sm sm:h-14 sm:w-14" strokeWidth={1.25} />
                </div>
              </div>

              <p
                className="mb-3 text-[11px] font-semibold tracking-[0.35em] text-[#64748b] sm:text-xs sm:tracking-[0.4em]"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                CERTIFICATE OF COMPLETION
              </p>

              <h1
                className="mx-auto max-w-[90%] text-balance text-3xl font-semibold leading-tight text-[#0f172a] sm:text-4xl md:text-5xl lg:text-[2.75rem]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {data.courseTitle}
              </h1>

              {formatProgramHours(data.expectedDurationHours) && (
                <div className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c9a962]/60 bg-[#fffbeb]/80 px-4 py-1.5 text-sm font-medium text-[#78350f] shadow-sm">
                    <Clock className="h-4 w-4 shrink-0 text-[#b45309]" />
                    <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                      Program duration:{' '}
                      <strong className="text-[#451a03]">{formatProgramHours(data.expectedDurationHours)}</strong>
                    </span>
                  </span>
                </div>
              )}

              {data.courseDescription && data.courseDescription.trim().length > 0 && (
                <div className="mx-auto mt-8 max-w-3xl border-y border-[#e2e8f0] bg-[#f8fafc]/60 px-5 py-5 text-left sm:px-8">
                  <p
                    className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-[#94a3b8]"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    Course description
                  </p>
                  <p
                    className="text-pretty text-center text-sm leading-relaxed text-[#475569] sm:text-base"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {data.courseDescription.trim()}
                  </p>
                </div>
              )}
            </header>

            {/* Body */}
            <div
              className={cn(
                'mt-10 flex flex-1 flex-col items-center justify-center text-center sm:mt-12',
                data.courseDescription?.trim() && 'mt-8 sm:mt-10',
              )}
            >
              <p
                className="text-lg text-[#64748b] sm:text-xl"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                This certifies that
              </p>

              <p
                className="mt-4 max-w-4xl text-balance text-4xl font-semibold text-[#0f172a] sm:text-5xl md:text-6xl"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {data.studentName}
              </p>

              <p
                className="mx-auto mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-[#475569] sm:text-xl"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                has successfully completed the course requirements
                {formattedDate ? (
                  <>
                    {' '}
                    on{' '}
                    <span className="font-semibold text-[#0f172a]">{formattedDate}</span>
                  </>
                ) : null}
                .
              </p>
            </div>

            {/* Footer: instructor · CEO · issued */}
            <footer className="mt-auto pt-12 sm:pt-16">
              <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 border-t border-[#cbd5e1]/80 pt-10 sm:gap-8 md:grid-cols-3 md:pt-12">
                <div className="text-center md:text-left">
                  <p className="text-xs font-medium uppercase tracking-widest text-[#94a3b8]">Instructor</p>
                  <p
                    className="mt-3 text-xl font-semibold text-[#0f172a] sm:text-2xl"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {data.instructorName}
                  </p>
                  <div className="mx-auto mt-6 h-px w-48 max-w-full bg-gradient-to-r from-transparent via-[#94a3b8] to-transparent md:mx-0" />
                  <p className="mt-2 text-xs text-[#94a3b8]">Course authority</p>
                </div>

                <div className="text-center">
                  <p className="text-xs font-medium uppercase tracking-widest text-[#94a3b8]">{PLATFORM_EXECUTIVE.title}</p>
                  <p className="mt-1 text-[13px] font-medium text-[#64748b]">{PLATFORM_EXECUTIVE.organization}</p>
                  <p
                    className="mt-4 text-3xl leading-none text-[#0f172a] sm:text-[2.1rem]"
                    style={{ fontFamily: "'Great Vibes', cursive" }}
                  >
                    {PLATFORM_EXECUTIVE.name}
                  </p>
                  <div className="mx-auto mt-5 h-px w-52 max-w-full bg-gradient-to-r from-transparent via-[#64748b]/70 to-transparent" />
                  <p className="mt-2 text-xs text-[#94a3b8]">Executive signature</p>
                </div>

                <div className="text-center md:text-right">
                  <p className="text-xs font-medium uppercase tracking-widest text-[#94a3b8]">Issued</p>
                  <p
                    className="mt-3 text-xl font-semibold text-[#0f172a] sm:text-2xl"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {new Date(data.issuedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="mx-auto mt-6 h-px w-48 max-w-full bg-gradient-to-r from-transparent via-[#94a3b8] to-transparent md:ml-auto md:mr-0" />
                  <p className="mt-2 text-xs text-[#94a3b8]">Date of issue</p>
                </div>
              </div>

              {!data.eligible && (
                <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-4 text-center text-sm text-amber-900 print:border-amber-300">
                  Complete the course to unlock your official certificate. Your enrollment is still in progress.
                </div>
              )}

              {data.eligible && data.certificateId && (
                <p className="mt-10 text-center font-mono text-[11px] tracking-wide text-[#94a3b8] sm:text-xs">
                  Certificate ID · {data.certificateId}
                </p>
              )}
            </footer>
          </div>
        </article>

        <p className="mx-auto mt-6 max-w-2xl px-2 text-center text-xs text-muted-foreground print:hidden">
          Use “Print / Save as PDF” and choose “Save as PDF” in the print dialog for a file copy.
        </p>
      </div>

      <style>{`
        @media print {
          .certificate-page {
            min-height: auto !important;
            background: white !important;
          }
          .certificate-sheet {
            min-height: auto !important;
            max-width: 100% !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
