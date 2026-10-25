import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useInView, useReducedMotion, type Variants } from 'motion/react'
import { Lock, Inbox } from 'lucide-react'
import { cn } from './cn'

export const fmt = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('ja-JP'))
export const fmtPct = (v: number | null | undefined, digits = 0) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`)
export const fmtSigned = (v: number | null | undefined) => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`)

/** 初回表示時にカウントアップする数値 */
export function CountUp({ value, className, format = fmt, duration = 0.9 }: { value: number | null; className?: string; format?: (v: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const prev = useRef<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || value == null) return
    if (!inView) return
    if (reduce) {
      el.textContent = format(value)
      return
    }
    const from = prev.current ?? 0
    prev.current = value
    const c = animate(from, value, { duration: from === 0 ? duration : 0.4, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => (el.textContent = format(Math.round(v))) })
    return () => c.stop()
  }, [value, inView, reduce, format, duration])
  return <span ref={ref} className={cn('tnum', className)}>{value == null ? '—' : format(0)}</span>
}

export function Field({ label, hint, children, className, htmlFor, error, required }: {
  label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; htmlFor?: string; error?: string; required?: boolean
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-1.5 text-xs font-semibold text-ink-600">
        {label}
        {required && <span className="text-2xs font-medium text-err">必須</span>}
        {hint && <span className="ml-auto text-2xs font-normal text-ink-400">{hint}</span>}
      </label>
      {children}
      {error && <motion.p initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-medium text-err" role="alert">{error}</motion.p>}
    </div>
  )
}

export function Select({ value, onChange, options, className, id, ariaLabel, disabled }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string; disabled?: boolean }[]; className?: string; id?: string; ariaLabel?: string; disabled?: boolean
}) {
  return (
    <select id={id} aria-label={ariaLabel} className={cn('field', className)} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
    </select>
  )
}

/** 達成率のバー。100% を超えた分は別色で伸びる */
export function AchBar({ ratio, className, animateIn = true }: { ratio: number | null; className?: string; animateIn?: boolean }) {
  const w = ratio == null ? 0 : Math.min(ratio, 1) * 100
  const over = ratio != null && ratio > 1 ? Math.min(ratio - 1, 0.3) / 0.3 : 0
  return (
    <div className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-paper-2', className)} role="meter" aria-valuenow={ratio == null ? undefined : Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="達成率">
      <motion.div className={cn('absolute inset-y-0 left-0 rounded-full', ratio != null && ratio >= 1 ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : 'bg-gradient-to-r from-sky-400 to-indigo-400')}
        initial={animateIn ? { width: 0 } : false} animate={{ width: `${w}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }} />
      {over > 0 && (
        <motion.div className="absolute inset-y-0 right-0 rounded-full bg-iris-400/80" initial={{ width: 0 }} animate={{ width: `${over * 18}%` }} transition={{ duration: 0.5, delay: 0.7 }} />
      )}
    </div>
  )
}

/** 達成率のリング */
export function AchRing({ ratio, size = 46, stroke = 4.5 }: { ratio: number | null; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = ratio == null ? 0 : Math.min(ratio, 1)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ECEAE4" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ratio != null && ratio >= 1 ? '#434BCF' : '#5A9BFF'} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p) }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }} />
    </svg>
  )
}

/** 小型の推移グラフ */
export function Spark({ values, className, stroke = '#434BCF', w = 84, h = 26 }: { values: (number | null)[]; className?: string; stroke?: string; w?: number; h?: number }) {
  const v = values.map((x) => x ?? 0)
  const min = Math.min(...v)
  const max = Math.max(...v)
  const pts = v.map((x, i) => [(i / Math.max(1, v.length - 1)) * (w - 4) + 2, h - 3 - ((x - min) / (max - min || 1)) * (h - 6)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg width={w} height={h} className={className} aria-hidden>
      <motion.path d={d} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      {last && <circle cx={last[0]} cy={last[1]} r={2.4} fill={stroke} />}
    </svg>
  )
}

export function Empty({ title, desc, icon, action, className }: { title: string; desc?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="relative mb-4 grid size-14 place-items-center rounded-2xl bg-surface-3 text-ink-400 ring-1 ring-inset ring-line">
        <div className="absolute -inset-3 -z-0 rounded-[24px] border border-dashed border-line" />
        {icon ?? <Inbox className="size-6" />}
      </div>
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-xs leading-5 text-ink-500">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Denied({ desc }: { desc?: string }) {
  return (
    <Empty icon={<Lock className="size-6" />} title="このデータを表示する権限がありません"
      desc={desc ?? '担当AEは担当クライアントのデータのみ表示できます。必要な場合は PM に依頼してください。'} />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-paper-2', className)} />
}

/** 時間差で現れるコンテナ */
export const stagger: { container: Variants; item: Variants } = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } },
  item: { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } } },
}

/** セグメントコントロール（選択中の背景がスライドする） */
export function Segmented<T extends string>({ value, onChange, options, id, size = 'md' }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; id: string; size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" className="inline-flex rounded-full bg-paper-2 p-1 ring-1 ring-inset ring-line">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} role="tab" aria-selected={on} onClick={() => onChange(o.value)}
            className={cn('focus-ring relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors',
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-3.5 text-[13px]', on ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800')}>
            {on && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-white shadow-card" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="relative">{o.label}</span>
            {o.count != null && <span className={cn('tnum relative rounded-full px-1.5 text-2xs', on ? 'bg-indigo-50 text-indigo-700' : 'bg-white/70 text-ink-500')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function useDebounced<T>(v: T, ms = 200) {
  const [d, setD] = useState(v)
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms)
    return () => clearTimeout(t)
  }, [v, ms])
  return d
}
