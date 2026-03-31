import { Toaster as SonnerToaster } from 'sonner'

/**
 * Global toast host: bottom-right so toasts never cover the sticky header/nav.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={false}
      closeButton
      duration={4500}
      gap={12}
      offset={{ bottom: 24, right: 24 }}
      mobileOffset={{ bottom: 20, right: 16 }}
      visibleToasts={4}
      className="!z-[200]"
      toastOptions={{
        classNames: {
          toast:
            'group flex w-[min(100vw-2rem,24rem)] items-start gap-3 rounded-xl border border-border/80 bg-card py-3.5 pl-3.5 pr-3 text-foreground shadow-lg shadow-black/5 ring-1 ring-border/40 backdrop-blur-sm dark:bg-card/95',
          title: 'text-sm font-semibold leading-snug text-foreground',
          description: 'text-[13px] leading-relaxed text-muted-foreground mt-0.5',
          closeButton:
            'static shrink-0 translate-x-0 translate-y-0 rounded-md border border-border/60 bg-muted/40 opacity-80 hover:opacity-100',
          actionButton:
            'shrink-0 rounded-lg border-0 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90',
          cancelButton:
            'rounded-lg border border-border bg-background text-xs font-medium',
          error:
            'border-destructive/25 bg-destructive/[0.06] [&_[data-icon]]:text-destructive',
          success:
            'border-emerald-500/20 bg-emerald-500/[0.06] [&_[data-icon]]:text-emerald-600 dark:[&_[data-icon]]:text-emerald-400',
        },
      }}
    />
  )
}
