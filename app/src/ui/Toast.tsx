import { create } from 'zustand'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './cn'

type ToastTone = 'ok' | 'err' | 'info'
interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  desc?: ReactNode
}

const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, 'id'>) => void; dismiss: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random()
    set((s) => ({ items: [...s.items.slice(-3), { ...t, id }] }))
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), t.tone === 'err' ? 6500 : 4200)
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}))

export const toast = {
  ok: (title: string, desc?: ReactNode) => useToasts.getState().push({ tone: 'ok', title, desc }),
  err: (title: string, desc?: ReactNode) => useToasts.getState().push({ tone: 'err', title, desc }),
  info: (title: string, desc?: ReactNode) => useToasts.getState().push({ tone: 'info', title, desc }),
}

const ICON = {
  ok: <CheckCircle2 className="size-[18px] text-ok" />,
  err: <AlertTriangle className="size-[18px] text-err" />,
  info: <Info className="size-[18px] text-indigo-500" />,
}

export function Toaster() {
  const { items, dismiss } = useToasts()
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(380px,calc(100vw-40px))] flex-col gap-2" role="region" aria-live="polite" aria-label="通知">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div key={t.id} layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={cn('pointer-events-auto relative flex gap-3 overflow-hidden rounded-2xl bg-ink-900 p-3.5 pr-10 text-white shadow-float')}
            role={t.tone === 'err' ? 'alert' : 'status'}>
            <span className="mt-px grid size-7 shrink-0 place-items-center rounded-full bg-white">{ICON[t.tone]}</span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-5">{t.title}</p>
              {t.desc && <div className="mt-0.5 text-xs leading-5 text-white/65">{t.desc}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="通知を閉じる" className="focus-ring absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white">
              <X className="size-3.5" />
            </button>
            <motion.span className={cn('absolute bottom-0 left-0 h-0.5', t.tone === 'err' ? 'bg-err' : t.tone === 'ok' ? 'bg-emerald-400' : 'bg-indigo-400')}
              initial={{ width: '100%' }} animate={{ width: 0 }} transition={{ duration: t.tone === 'err' ? 6.5 : 4.2, ease: 'linear' }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
