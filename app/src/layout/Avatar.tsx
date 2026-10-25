import type { User } from '@/domain/types'
import { cn } from '@/ui/cn'

const HUE: Record<string, string> = {
  'u-suzuki': 'from-sky-400 to-indigo-500',
  'u-takahashi': 'from-indigo-400 to-iris-500',
  'u-tanaka': 'from-iris-400 to-indigo-700',
  'u-sato': 'from-sky-500 to-iris-400',
}

export function Avatar({ user, size = 'md', dark }: { user: User; size?: 'sm' | 'md' | 'lg'; dark?: boolean }) {
  return (
    <span className={cn('relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white',
      HUE[user.id] ?? 'from-ink-400 to-ink-600',
      size === 'sm' ? 'size-7 text-[11px]' : size === 'md' ? 'size-9 text-[13px]' : 'size-12 text-base',
      dark ? 'ring-2 ring-white/10' : 'ring-2 ring-white')}>
      {user.name.slice(0, 1)}
      <span className={cn('absolute -bottom-0.5 -right-0.5 rounded-full px-1 text-[8px] font-bold leading-[12px] ring-2',
        user.role === 'PM' ? 'bg-iris-500 text-white' : 'bg-sky-500 text-white', dark ? 'ring-ink-950' : 'ring-white')}>
        {user.role}
      </span>
    </span>
  )
}
