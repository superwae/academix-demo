/**
 * Was a 4-layer animated radial-gradient/blob/particle background.
 * Even after stripping the framer-motion animations, the stacked
 * radial gradients on a position-fixed full-viewport layer still
 * cost ongoing GPU compositing on high-DPI displays.
 *
 * The body already has `bg-background` (theme-aware) — that's enough.
 */
export function AnimatedBackground(_: { mixActive?: boolean }) {
  return null
}
