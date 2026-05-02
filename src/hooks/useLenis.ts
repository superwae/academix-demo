/**
 * No-op replacement for the previous Lenis-based smooth scroll hook.
 * Native browser scrolling is used instead — Lenis ran a 60fps RAF loop
 * that produced constant GPU compositing on client machines.
 */
export function useLenis(_enabled: boolean) {
  // intentionally empty
}
