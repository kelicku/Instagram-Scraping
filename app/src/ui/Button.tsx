import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Lock, X } from 'lucide-react'
import { cn } from './cn'
import { Tip } from './Tooltip'

export type BtnState = 'idle' | 'loading' | 'success' | 'error'

/** onClick が Promise を返したら、処理中 → 成功／失敗 → 通常 の状態を自動で管理する */
function useAsyncState(external?: BtnState) {
  const [state, setState] = useState<BtnState>('idle')
  const timer = useRef<number>()
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const run = async (fn?: () => unknown) => {
    const r = fn?.()
    if (!(r instanceof Promise)) return
    setState('loading')
    try {
      await r
      setState('success')
    } catch {
      setState('error')
    }
    timer.current = window.setTimeout(() => setState('idle'), 1700)
  }
  return [external ?? state, run] as const
}

const Spinner = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn('size-4 animate-spin', className)} aria-hidden>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.5" />
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
)

const DrawCheck = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
    <motion.path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
  </svg>
)

function SwapIcon({ state, icon }: { state: BtnState; icon?: ReactNode }) {
  const content = state === 'loading' ? <Spinner /> : state === 'success' ? <DrawCheck /> : state === 'error' ? <X className="size-4" /> : icon
  if (!content) return null
  return (
    <span className="relative grid size-4 place-items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={state} className="grid place-items-center"
          initial={{ opacity: 0, scale: 0.6, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}>
          {content}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function SwapLabel({ text }: { text: ReactNode }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={typeof text === 'string' ? text : 'node'} className="inline-flex items-center gap-1 whitespace-nowrap"
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
        {text}
      </motion.span>
    </AnimatePresence>
  )
}

type Base = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'style'> & {
  onClick?: () => unknown
  icon?: ReactNode
  state?: BtnState
  loadingLabel?: ReactNode
  successLabel?: ReactNode
  errorLabel?: ReactNode
  /** 無効時に理由をツールチップで示す */
  disabledReason?: string
}

/* ------------------------------------------------------------------ */
/* 主要アクション                                                         */
/* ------------------------------------------------------------------ */

export const PrimaryButton = forwardRef<HTMLButtonElement, Base & { progress?: number; size?: 'md' | 'lg' }>(function PrimaryButton(
  { children, icon, onClick, state: ext, loadingLabel, successLabel, errorLabel, progress, disabled, disabledReason, className, size = 'md', ...rest },
  ref,
) {
  const [state, run] = useAsyncState(ext)
  const reduce = useReducedMotion()
  const label = state === 'loading' ? loadingLabel ?? children : state === 'success' ? successLabel ?? children : state === 'error' ? errorLabel ?? children : children
  const btn = (
    <motion.button
      ref={ref}
      type="button"
      {...rest}
      disabled={disabled || state === 'loading'}
      aria-busy={state === 'loading'}
      onClick={() => run(onClick)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
      }}
      whileTap={disabled || reduce ? undefined : { scale: 0.97, y: 1 }}
      animate={state === 'error' && !reduce ? { x: [0, -4, 4, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.32 }}
      className={cn(
        'btn-primary focus-ring group relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-[4px_13px_13px_13px] font-semibold tracking-[0.02em] text-white transition-[filter] duration-200',
        'hover:brightness-110 disabled:cursor-not-allowed disabled:text-white/90',
        size === 'lg' ? 'h-11 px-5 text-sm' : 'h-10 px-4 text-[13px]',
        state === 'error' && '!bg-err',
        className,
      )}
    >
      <SwapIcon state={state} icon={icon} />
      <SwapLabel text={label} />
      {state === 'loading' && progress != null && (
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10" aria-hidden>
          <motion.span className="block h-full bg-gradient-to-r from-sky-400 via-indigo-300 to-iris-400" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </span>
      )}
    </motion.button>
  )
  return disabled && disabledReason ? <Tip label={disabledReason}><span className="inline-flex">{btn}</span></Tip> : btn
})

/* ------------------------------------------------------------------ */
/* セカンダリー（細いアウトラインのピル）                                     */
/* ------------------------------------------------------------------ */

const NUDGE = {
  right: 'group-hover:translate-x-[3px]',
  left: 'group-hover:-translate-x-[3px]',
  up: 'group-hover:-translate-y-[2px]',
  down: 'group-hover:translate-y-[2px]',
  spin: 'group-hover:rotate-[-30deg]',
  none: '',
}

export const SecondaryButton = forwardRef<HTMLButtonElement, Base & { nudge?: keyof typeof NUDGE; size?: 'sm' | 'md'; tone?: 'default' | 'accent' }>(
  function SecondaryButton(
    { children, icon, onClick, state: ext, loadingLabel, successLabel, errorLabel, nudge = 'none', disabled, disabledReason, className, size = 'md', tone = 'default', ...rest },
    ref,
  ) {
    const [state, run] = useAsyncState(ext)
    const label = state === 'loading' ? loadingLabel ?? children : state === 'success' ? successLabel ?? children : state === 'error' ? errorLabel ?? children : children
    const btn = (
      <motion.button
        ref={ref}
        type="button"
        {...rest}
        disabled={disabled || state === 'loading'}
        aria-busy={state === 'loading'}
        onClick={() => run(onClick)}
        whileTap={disabled ? undefined : { scale: 0.975 }}
        className={cn(
          'focus-ring group relative inline-flex select-none items-center justify-center gap-1.5 rounded-full border font-medium transition-[background-color,border-color,color,box-shadow] duration-200 ease-out',
          size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-[13px]',
          tone === 'accent'
            ? 'border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50'
            : 'border-line-strong/80 bg-surface/70 text-ink-800 hover:border-ink-300 hover:bg-white hover:shadow-[0_2px_8px_-4px_rgba(17,24,51,0.25)]',
          state === 'success' && '!border-ok-line !bg-ok-bg !text-ok',
          state === 'error' && '!border-err-line !bg-err-bg !text-err',
          'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-3 disabled:text-ink-300 disabled:shadow-none',
          className,
        )}
      >
        {(icon || state !== 'idle') && (
          <span className={cn('transition-transform duration-300 ease-out', state === 'idle' && !disabled && NUDGE[nudge])}>
            <SwapIcon state={state} icon={icon} />
          </span>
        )}
        <SwapLabel text={label} />
      </motion.button>
    )
    return disabled && disabledReason ? <Tip label={disabledReason}><span className="inline-flex">{btn}</span></Tip> : btn
  },
)

/* ------------------------------------------------------------------ */
/* アイコンボタン                                                         */
/* ------------------------------------------------------------------ */

export function IconButton({
  label, icon, onClick, tone = 'default', disabled, className, size = 'md', ...rest
}: { label: string; icon: ReactNode; onClick?: () => unknown; tone?: 'default' | 'danger' | 'accent'; size?: 'sm' | 'md' } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'style'>) {
  const [state, run] = useAsyncState()
  return (
    <Tip label={label}>
      <motion.button
        type="button"
        aria-label={label}
        {...rest}
        disabled={disabled || state === 'loading'}
        onClick={() => run(onClick)}
        whileTap={disabled ? undefined : { scale: 0.9 }}
        className={cn(
          'focus-ring group relative grid shrink-0 place-items-center rounded-[10px] border border-transparent text-ink-500 transition-[background-color,border-color,color,box-shadow] duration-200',
          size === 'sm' ? 'size-7' : 'size-8',
          tone === 'danger' && 'hover:border-err-line hover:bg-err-bg hover:text-err',
          tone === 'default' && 'hover:border-line hover:bg-white hover:text-ink-900 hover:shadow-card',
          tone === 'accent' && 'hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
          'disabled:cursor-not-allowed disabled:text-ink-200 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:shadow-none',
          className,
        )}
      >
        <span className="transition-transform duration-200 group-hover:scale-110">
          {state === 'loading' ? <Spinner className="size-[15px]" /> : state === 'success' ? <Check className="size-[15px] text-ok" /> : icon}
        </span>
      </motion.button>
    </Tip>
  )
}

/* ------------------------------------------------------------------ */
/* ステータス付きボタン（承認・差し戻し・提出記録・承認依頼）                    */
/* ------------------------------------------------------------------ */

const STATUS_TONE = {
  approve: {
    base: 'border-indigo-700 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_6px_14px_-6px_rgba(67,75,207,.6)] hover:from-indigo-400 hover:to-indigo-600',
    cap: 'bg-white/20 text-white',
  },
  request: {
    base: 'border-ink-800 bg-ink-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_6px_14px_-6px_rgba(17,24,51,.55)] hover:bg-ink-800',
    cap: 'bg-white/15 text-white',
  },
  submit: {
    base: 'border-ok bg-ok text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_6px_14px_-6px_rgba(30,127,85,.55)] hover:brightness-110',
    cap: 'bg-white/20 text-white',
  },
  reject: {
    base: 'border-err-line bg-white text-err hover:border-err hover:bg-err-bg',
    cap: 'bg-err-bg text-err group-hover:bg-white',
  },
} as const

export function StatusButton({
  tone, icon, children, onClick, disabled, disabledReason, state: ext, successLabel, className, ...rest
}: Base & { tone: keyof typeof STATUS_TONE }) {
  const [state, run] = useAsyncState(ext)
  const t = STATUS_TONE[tone]
  const btn = (
    <motion.button
      type="button"
      {...rest}
      disabled={disabled || state === 'loading'}
      onClick={() => run(onClick)}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={cn(
        'focus-ring group inline-flex h-10 select-none items-center gap-2 rounded-[12px] border pl-1.5 pr-4 text-[13px] font-semibold transition-[background-color,border-color,filter,box-shadow] duration-200',
        disabled ? 'cursor-not-allowed border-line bg-surface-3 text-ink-300 shadow-none' : t.base,
        className,
      )}
    >
      <span className={cn('grid size-7 place-items-center rounded-[9px] transition-colors', disabled ? 'bg-paper-2 text-ink-300' : t.cap)}>
        {disabled ? <Lock className="size-3.5" /> : <SwapIcon state={state} icon={icon} />}
      </span>
      <SwapLabel text={state === 'success' ? successLabel ?? children : children} />
    </motion.button>
  )
  return disabled && disabledReason ? <Tip label={disabledReason}><span className="inline-flex">{btn}</span></Tip> : btn
}

/** テキストリンク風の小さなボタン */
export function LinkButton({ children, onClick, className, icon }: { children: ReactNode; onClick?: () => void; className?: string; icon?: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('focus-ring group inline-flex items-center gap-1 rounded-md text-xs font-medium text-indigo-600 underline-offset-4 hover:text-indigo-800 hover:underline', className)}>
      {children}
      {icon && <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>}
    </button>
  )
}
