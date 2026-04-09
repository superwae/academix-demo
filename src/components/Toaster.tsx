import { Toaster as SonnerToaster } from 'sonner'

/**
 * Global toast host. Top-center, prominent — errors and successes are equally
 * visible. Errors get larger styling and a longer auto-dismiss timer so the
 * user has time to read them.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      expand={true}
      closeButton
      richColors={false}
      duration={5000}
      gap={14}
      offset={{ top: 28 }}
      mobileOffset={{ top: 20 }}
      visibleToasts={4}
      className="!z-[200]"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'group flex w-[min(100vw-2rem,30rem)] items-start gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 text-foreground shadow-2xl shadow-black/15 backdrop-blur-md dark:bg-card/95',
          title: 'text-[15px] font-semibold leading-snug text-foreground',
          description: 'text-sm leading-relaxed text-muted-foreground mt-1',
          closeButton:
            'static shrink-0 translate-x-0 translate-y-0 rounded-md border border-border/60 bg-muted/40 opacity-80 hover:opacity-100',
          actionButton:
            'shrink-0 rounded-lg border-0 bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90',
          cancelButton:
            'rounded-lg border border-border bg-background text-xs font-medium',
          // Error: red border + tinted background, slightly bigger
          error:
            '!border-destructive/40 !bg-destructive/[0.08] !ring-2 !ring-destructive/20 [&_[data-icon]]:text-destructive [&_[data-title]]:text-destructive',
          // Success: emerald border + tinted background
          success:
            '!border-emerald-500/40 !bg-emerald-500/[0.08] !ring-2 !ring-emerald-500/20 [&_[data-icon]]:text-emerald-600 dark:[&_[data-icon]]:text-emerald-400',
          // Warning
          warning:
            '!border-amber-500/40 !bg-amber-500/[0.08] !ring-2 !ring-amber-500/20 [&_[data-icon]]:text-amber-600 dark:[&_[data-icon]]:text-amber-400',
          // Info
          info:
            '!border-blue-500/30 !bg-blue-500/[0.06] !ring-1 !ring-blue-500/15 [&_[data-icon]]:text-blue-600 dark:[&_[data-icon]]:text-blue-400',
        },
      }}
    />
  )
}
