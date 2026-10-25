import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle, BadgeCheck, Check, CircleDashed, Clock3, FilePen, Hourglass, Loader2, Send, Undo2, XOctagon, Info,
} from 'lucide-react'
import { cn } from './cn'
import { FETCH_STATUS, REPORT_STATUS, CHECK_LEVEL, type Tone } from '@/domain/labels'
import type { CheckLevel, FetchStatus, ReportStatus } from '@/domain/types'

export const TONE: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok ring-ok-line',
  warn: 'bg-warn-bg text-warn ring-warn-line',
  err: 'bg-err-bg text-err ring-err-line',
  info: 'bg-sky-50 text-sky-600 ring-sky-100',
  iris: 'bg-iris-50 text-iris-600 ring-iris-100',
  neutral: 'bg-paper-2 text-ink-600 ring-line',
  progress: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
}

export const TONE_DOT: Record<Tone, string> = {
  ok: 'bg-ok', warn: 'bg-[#D18A1A]', err: 'bg-err', info: 'bg-sky-500', iris: 'bg-iris-500', neutral: 'bg-ink-300', progress: 'bg-indigo-500',
}

export function Pill({ tone, icon, children, className, size = 'md' }: { tone: Tone; icon?: ReactNode; children: ReactNode; className?: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset',
      size === 'sm' ? 'h-5 px-1.5 text-2xs' : 'h-6 px-2 text-[11.5px]', TONE[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

const ic = 'size-3 shrink-0'

export const REPORT_ICON: Record<ReportStatus, ReactNode> = {
  not_generated: <CircleDashed className={ic} />,
  generating: <Loader2 className={cn(ic, 'animate-spin')} />,
  failed: <XOctagon className={ic} />,
  draft: <FilePen className={ic} />,
  rejected: <Undo2 className={ic} />,
  pending: <Hourglass className={ic} />,
  approved: <BadgeCheck className={ic} />,
  submitted: <Send className={ic} />,
}

const FETCH_ICON: Record<FetchStatus, ReactNode> = {
  success: <Check className={ic} />,
  failed: <AlertTriangle className={ic} />,
  not_run: <Clock3 className={ic} />,
}

const CHECK_ICON: Record<CheckLevel, ReactNode> = {
  ok: <Check className={ic} />,
  warning: <Info className={ic} />,
  error: <AlertTriangle className={ic} />,
}

/** 状態が変わったときに滑らかに入れ替わる */
export function ReportPill({ status, count, size }: { status: ReportStatus; count?: number; size?: 'sm' | 'md' }) {
  const m = REPORT_STATUS[status]
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={status} className="inline-flex" initial={{ opacity: 0, scale: 0.85, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -4 }} transition={{ type: 'spring', stiffness: 420, damping: 28 }}>
        <Pill tone={m.tone} icon={REPORT_ICON[status]} size={size}>
          {m.label}
          {count != null && <span className="tnum opacity-80">{count}</span>}
        </Pill>
      </motion.span>
    </AnimatePresence>
  )
}

export function FetchPill({ status, count, size }: { status: FetchStatus; count?: number; size?: 'sm' | 'md' }) {
  const m = FETCH_STATUS[status]
  return (
    <Pill tone={m.tone} icon={FETCH_ICON[status]} size={size}>
      {m.label}
      {count != null && <span className="tnum opacity-80">{count}</span>}
    </Pill>
  )
}

export function CheckPill({ level }: { level: CheckLevel }) {
  const m = CHECK_LEVEL[level]
  return <Pill tone={m.tone} icon={CHECK_ICON[level]} size="sm">{m.label}</Pill>
}
