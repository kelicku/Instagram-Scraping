import * as D from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from './cn'
import { PrimaryButton, SecondaryButton, StatusButton } from './Button'

const ease = [0.22, 1, 0.36, 1] as const

const CloseX = () => (
  <D.Close aria-label="閉じる"
    className="focus-ring grid size-8 shrink-0 place-items-center rounded-[10px] border border-transparent text-ink-400 transition-colors hover:border-line hover:bg-white hover:text-ink-900">
    <X className="size-4" />
  </D.Close>
)

export function Modal({
  open, onOpenChange, title, description, children, footer, width = 'md', icon,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-ink-950/35 backdrop-blur-[3px]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} />
            </D.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
              <D.Content asChild forceMount>
                <motion.div
                  className={cn('pointer-events-auto relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[22px] bg-surface shadow-float',
                    width === 'sm' ? 'max-w-[440px]' : width === 'md' ? 'max-w-[560px]' : 'max-w-[760px]')}
                  initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 6 }}
                  transition={{ duration: 0.28, ease }}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(60%_100%_at_20%_0%,rgba(122,134,247,0.12),transparent)]" />
                  <div className="relative flex items-start gap-3 px-6 pb-2 pt-5">
                    {icon && <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[11px] bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">{icon}</div>}
                    <div className="min-w-0 flex-1">
                      <D.Title className="text-[17px] font-bold tracking-tight text-ink-900">{title}</D.Title>
                      {description ? <D.Description className="mt-1 text-sm text-ink-500">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
                    </div>
                    <CloseX />
                  </div>
                  {children && <div className="thin-scroll relative min-h-0 flex-1 overflow-y-auto px-6 py-3">{children}</div>}
                  {footer && <div className="relative flex items-center justify-end gap-2 border-t border-line-soft bg-surface-2 px-6 py-3.5">{footer}</div>}
                </motion.div>
              </D.Content>
            </div>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  )
}

/** 右からスライドするパネル（施策の登録・編集） */
export function Sheet({ open, onOpenChange, title, description, children, footer }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-ink-950/25 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            </D.Overlay>
            <D.Content asChild forceMount>
              <motion.aside
                className="fixed inset-y-2 right-2 z-50 flex w-[min(520px,calc(100vw-16px))] flex-col overflow-hidden rounded-[22px] bg-surface shadow-float"
                initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 30, opacity: 0 }} transition={{ duration: 0.3, ease }}
              >
                <div className="flex items-start gap-3 border-b border-line-soft px-6 pb-4 pt-5">
                  <div className="min-w-0 flex-1">
                    <D.Title className="text-[17px] font-bold tracking-tight">{title}</D.Title>
                    {description ? <D.Description className="mt-1 text-sm text-ink-500">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
                  </div>
                  <CloseX />
                </div>
                <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
                {footer && <div className="flex items-center justify-end gap-2 border-t border-line-soft bg-surface-2 px-6 py-3.5">{footer}</div>}
              </motion.aside>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  )
}

/** 重要操作の確認 */
export function Confirm({
  open, onOpenChange, title, description, confirmLabel, tone = 'primary', icon, onConfirm, children, confirmDisabled,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: ReactNode
  description?: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'approve' | 'reject' | 'submit' | 'request' | 'danger'
  icon?: ReactNode
  onConfirm: () => unknown
  children?: ReactNode
  confirmDisabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onOpenChange={(v) => !busy && onOpenChange(v)} title={title} description={description} width="sm" icon={icon}
      footer={
        <>
          <SecondaryButton onClick={() => onOpenChange(false)} disabled={busy}>キャンセル</SecondaryButton>
          {tone === 'primary' ? (
            <PrimaryButton onClick={run} state={busy ? 'loading' : 'idle'} disabled={confirmDisabled}>{confirmLabel}</PrimaryButton>
          ) : tone === 'danger' ? (
            <StatusButton tone="reject" icon={icon} onClick={run} state={busy ? 'loading' : 'idle'} disabled={confirmDisabled}>{confirmLabel}</StatusButton>
          ) : (
            <StatusButton tone={tone} icon={icon} onClick={run} state={busy ? 'loading' : 'idle'} disabled={confirmDisabled}>{confirmLabel}</StatusButton>
          )}
        </>
      }>
      {children}
    </Modal>
  )
}
