/**
 * Lightweight stand-in for `framer-motion`.
 *
 * The real library was driving constant GPU compositing on client machines
 * via long-running animations and a global RAF loop. We aliased
 * `framer-motion` to this file in `vite.config.ts`, so every existing
 * `import { motion, AnimatePresence } from 'framer-motion'` resolves here.
 *
 * Behavior:
 *   - `motion.div`, `motion.button`, etc. render the underlying HTML element.
 *   - All animation-only props (initial, animate, exit, transition, variants,
 *     whileHover, whileTap, whileInView, layout, drag*, viewport, custom, ...)
 *     are stripped before the props reach the DOM, so React doesn't warn.
 *   - `AnimatePresence` is a passthrough.
 *   - `useScroll` / `useTransform` return inert stubs.
 *
 * The visual result: elements appear immediately in their final state.
 */
import { createElement, forwardRef, type ComponentType, type ReactNode } from 'react'

const MOTION_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileInView',
  'whileDrag',
  'layout',
  'layoutId',
  'layoutDependency',
  'layoutScroll',
  'layoutRoot',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragSnapToOrigin',
  'dragTransition',
  'dragControls',
  'dragListener',
  'dragPropagation',
  'dragDirectionLock',
  'viewport',
  'custom',
  'inherit',
  'transformTemplate',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'onPan',
  'onPanStart',
  'onPanEnd',
  'onTap',
  'onTapStart',
  'onTapCancel',
  'onHoverStart',
  'onHoverEnd',
  'onDragStart',
  'onDrag',
  'onDragEnd',
  'onDirectionLock',
  'onMeasureDragConstraints',
  'onLayoutAnimationStart',
  'onLayoutAnimationComplete',
  'onViewportEnter',
  'onViewportLeave',
])

type AnyProps = Record<string, unknown>

function stripMotionProps(props: AnyProps): AnyProps {
  const out: AnyProps = {}
  for (const key in props) {
    if (!MOTION_PROPS.has(key)) out[key] = props[key]
  }
  return out
}

const motionFactory = (tag: string) => {
  const Component = forwardRef<unknown, AnyProps>((props, ref) => {
    const cleaned = stripMotionProps(props)
    return createElement(tag, { ...cleaned, ref })
  })
  Component.displayName = `motion.${tag}`
  return Component
}

const motionCache: Record<string, ComponentType<AnyProps>> = {}

type MotionProxy = Record<string, ComponentType<AnyProps>> & {
  create: <P,>(C: ComponentType<P>) => ComponentType<P>
}

export const motion: MotionProxy = new Proxy(
  {
    create: <P,>(C: ComponentType<P>) => C,
  } as MotionProxy,
  {
    get(target, prop: string | symbol) {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop)
      }
      if (prop === 'create') return target.create
      if (!motionCache[prop]) {
        motionCache[prop] = motionFactory(prop) as unknown as ComponentType<AnyProps>
      }
      return motionCache[prop]
    },
  },
)

export function AnimatePresence({
  children,
}: {
  children?: ReactNode
  mode?: 'sync' | 'wait' | 'popLayout'
  initial?: boolean
  custom?: unknown
  onExitComplete?: () => void
  presenceAffectsLayout?: boolean
  propagate?: boolean
}) {
  return <>{children}</>
}

// --- MotionValue / scroll stubs ------------------------------------------

class MotionValueStub<T> {
  private value: T
  constructor(initial: T) {
    this.value = initial
  }
  get(): T {
    return this.value
  }
  set(v: T): void {
    this.value = v
  }
  on(_event: string, _cb: (v: T) => void): () => void {
    return () => {}
  }
  onChange(cb: (v: T) => void): () => void {
    return this.on('change', cb)
  }
  destroy(): void {}
}

export function useScroll() {
  return {
    scrollX: new MotionValueStub(0),
    scrollY: new MotionValueStub(0),
    scrollXProgress: new MotionValueStub(0),
    scrollYProgress: new MotionValueStub(0),
  }
}

export function useTransform<T = number>(..._args: unknown[]): MotionValueStub<T> {
  return new MotionValueStub<T>(0 as unknown as T)
}

export function useMotionValue<T>(initial: T): MotionValueStub<T> {
  return new MotionValueStub<T>(initial)
}

export function useSpring<T>(initial: T): MotionValueStub<T> {
  return new MotionValueStub<T>(initial)
}

export function useInView() {
  return true
}

export function useReducedMotion() {
  return false
}

export const LazyMotion = ({ children }: { children?: ReactNode }) => <>{children}</>
export const domAnimation = {}
export const domMax = {}
export const MotionConfig = ({ children }: { children?: ReactNode }) => <>{children}</>
