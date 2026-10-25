import * as T from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export function Tip({ label, children, side = 'top' }: { label: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6}
          className="z-[80] max-w-xs rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-float data-[state=delayed-open]:animate-[tipIn_160ms_ease-out]">
          {label}
          <T.Arrow className="fill-ink-900" width={10} height={5} />
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}

export const TipProvider = T.Provider
