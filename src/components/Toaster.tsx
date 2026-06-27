import { Toaster as SonnerToaster } from 'sonner'
import { useAppStore } from '../store/useAppStore'

/**
 * Global toast host. Top-center, prominent — errors and successes are equally
 * visible. Syncs Sonner's theme with the app color mode and relies on
 * theme-token CSS overrides in style.css for readable text in every theme.
 */
export function Toaster() {
  const colorMode = useAppStore((s) => s.data.colorMode)

  return (
    <SonnerToaster
      theme={colorMode === 'dark' ? 'dark' : 'light'}
      position="top-center"
      expand={true}
      closeButton
      richColors={false}
      duration={5000}
      gap={14}
      offset={{ top: 28 }}
      mobileOffset={{ top: 20 }}
      visibleToasts={4}
      className="academix-toaster !z-[200]"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'group flex w-[min(100vw-2rem,30rem)] items-start gap-3 rounded-2xl border-2 px-4 py-4 shadow-2xl shadow-black/20',
          title: 'text-[15px] font-semibold leading-snug',
          description: 'text-sm leading-relaxed mt-1',
          closeButton:
            'static shrink-0 translate-x-0 translate-y-0 rounded-md border opacity-80 hover:opacity-100',
          actionButton:
            'shrink-0 rounded-lg border-0 bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90',
          cancelButton:
            'rounded-lg border border-border bg-background text-xs font-medium text-foreground',
          error: 'academix-toast-error',
          success: 'academix-toast-success',
          warning: 'academix-toast-warning',
          info: 'academix-toast-info',
        },
      }}
    />
  )
}
