import { useMemo, type ReactNode } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ClipboardList, Goal, NotebookPen } from 'lucide-react'
import { useDemo, useMe } from '@/store/demo'
import { visibleClients } from '@/domain/metrics'
import { DEFAULT_REPORT_MONTH } from '@/domain/calendar'
import { cn } from '@/ui/cn'

/** データ管理 3 画面で共有する「クライアント・アカウント・月」の選択（URL に保持） */
export function useScope(opts: { allowAllAccounts?: boolean; defaultMonth?: string } = {}) {
  const data = useDemo((s) => s.data)
  const me = useMe()!
  const [sp, setSp] = useSearchParams()
  const clients = useMemo(() => visibleClients(data, me), [data, me])
  const requested = sp.get('client')
  const denied = !!requested && !clients.some((c) => c.id === requested) && data.clients.some((c) => c.id === requested)
  const client = clients.find((c) => c.id === requested) ?? clients[0]
  const accounts = data.accounts.filter((a) => a.clientId === client?.id)
  const reqAcc = sp.get('account')
  const account = reqAcc === 'all' && opts.allowAllAccounts ? 'all' : accounts.find((a) => a.id === reqAcc)?.id ?? (opts.allowAllAccounts ? 'all' : accounts[0]?.id)
  const month = sp.get('month') ?? opts.defaultMonth ?? DEFAULT_REPORT_MONTH

  const set = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) v == null ? n.delete(k) : n.set(k, v)
    setSp(n, { replace: true })
  }
  return { data, me, clients, client, accounts, account, month, set, denied, focus: sp.get('focus') }
}

/** 3 画面の切り替えタブ。選択中のクライアント・アカウントを引き継ぐ */
export function DataTabs() {
  const [sp] = useSearchParams()
  const keep = new URLSearchParams()
  for (const k of ['client', 'account']) if (sp.get(k)) keep.set(k, sp.get(k)!)
  const q = keep.toString() ? `?${keep}` : ''
  const tabs = [
    { to: '/data/kpi', label: 'KPI 月次目標', icon: <Goal className="size-4" /> },
    { to: '/data/initiatives', label: '施策履歴', icon: <ClipboardList className="size-4" /> },
    { to: '/data/metrics', label: '手入力指標値', icon: <NotebookPen className="size-4" /> },
  ]
  return (
    <nav aria-label="データ管理" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to + q}
          className={({ isActive }) => cn('focus-ring relative flex h-10 shrink-0 items-center gap-2 rounded-t-lg px-3 text-[13px] font-semibold transition-colors', isActive ? 'text-ink-950' : 'text-ink-400 hover:text-ink-800')}>
          {({ isActive }) => (
            <>
              {t.icon}
              {t.label}
              {isActive && <motion.span layoutId="data-tab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-indigo-500 to-iris-500" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export function ScopeBar({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-panel bg-surface/70 p-3 shadow-hair">
      {children}
      {trailing && <div className="ml-auto flex flex-wrap items-center gap-2 self-center">{trailing}</div>}
    </div>
  )
}
