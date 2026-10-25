import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import * as Popover from '@radix-ui/react-popover'
import { useMemo, type ReactNode } from 'react'
import { Building2, ChevronsUpDown, ClipboardList, FileBarChart2, FlaskConical, Goal, LogOut, NotebookPen, ScrollText, Check } from 'lucide-react'
import { useDemo, useMe } from '@/store/demo'
import { cn } from '@/ui/cn'
import { DEFAULT_REPORT_MONTH } from '@/domain/calendar'
import { reportStatus, visibleAccountIds, monthActual } from '@/domain/metrics'
import { toast } from '@/ui/Toast'
import { Avatar } from './Avatar'

interface Item {
  to: string
  label: string
  icon: ReactNode
  badge?: { n: number; tone: 'err' | 'info' }
}

export function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7A86F7" />
          <stop offset="1" stopColor="#9A88EC" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="#1A2150" stroke="rgba(255,255,255,.12)" />
      <path d="M8 21.5 13.5 14l4.2 4.6L24 10.5" stroke="url(#lg)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="10.5" r="2.2" fill="#C7CDFF" />
    </svg>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const data = useDemo((s) => s.data)
  const me = useMe()!
  const { pathname } = useLocation()

  const badges = useMemo(() => {
    const ids = [...visibleAccountIds(data, me)]
    const reportIssues = ids.filter((id) => ['rejected', 'failed'].includes(reportStatus(data, id, DEFAULT_REPORT_MONTH))).length
    const pending = me.role === 'PM' ? ids.filter((id) => reportStatus(data, id, DEFAULT_REPORT_MONTH) === 'pending').length : 0
    const manual = ids.filter((id) => monthActual(data, id, DEFAULT_REPORT_MONTH).missingManual.length).length
    const fetchErr = ids.filter((id) => data.fetchLogs[id]?.['2026-10-22']?.status !== 'success').length
    return { reportIssues, pending, manual, fetchErr }
  }, [data, me])

  const groups: { label: string; items: Item[] }[] = [
    {
      label: '運用',
      items: [{ to: '/clients', label: 'クライアント一覧', icon: <Building2 />, badge: badges.fetchErr ? { n: badges.fetchErr, tone: 'err' } : undefined }],
    },
    {
      label: 'データ',
      items: [
        { to: '/data/kpi', label: 'KPI 月次目標', icon: <Goal /> },
        { to: '/data/initiatives', label: '施策履歴', icon: <ClipboardList /> },
        { to: '/data/metrics', label: '手入力指標値', icon: <NotebookPen />, badge: badges.manual ? { n: badges.manual, tone: 'err' } : undefined },
      ],
    },
    {
      label: 'レポート',
      items: [
        {
          to: '/reports', label: '月次レポート', icon: <FileBarChart2 />,
          badge: me.role === 'PM' && badges.pending ? { n: badges.pending, tone: 'info' } : badges.reportIssues ? { n: badges.reportIssues, tone: 'err' } : undefined,
        },
      ],
    },
    {
      label: '管理',
      items: [
        { to: '/admin/audit', label: '監査ログ', icon: <ScrollText /> },
        { to: '/admin/demo', label: 'デモ設定', icon: <FlaskConical /> },
      ],
    },
  ]

  return (
    <nav aria-label="メインメニュー" className="relative flex h-full w-[252px] flex-col overflow-hidden bg-ink-950 text-white">
      {/* 奥行きのある光 */}
      <div className="pointer-events-none absolute -left-24 -top-32 size-[380px] rounded-full bg-indigo-600/25 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-28 size-[300px] rounded-full bg-iris-600/15 blur-[90px]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

      <div className="relative flex items-center gap-3 px-5 pb-6 pt-6">
        <Logo />
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight">自動レポーティング</p>
          <p className="text-2xs text-white/45">Instagram 運用管理</p>
        </div>
      </div>

      <div className="thin-scroll relative flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g, gi) => (
          <div key={g.label} className={cn(gi > 0 && 'mt-5')}>
            <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-[0.18em] text-white/30">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.to || pathname.startsWith(it.to + '/')
                return (
                  <li key={it.to}>
                    <NavLink to={it.to} onClick={onNavigate}
                      className={cn('focus-ring group relative flex h-10 items-center gap-3 rounded-[12px] px-3 text-[13.5px] font-medium outline-none transition-colors focus-visible:ring-offset-ink-950',
                        active ? 'text-white' : 'text-white/60 hover:text-white')}>
                      {active && (
                        <motion.span layoutId="nav-active" className="absolute inset-0 rounded-[4px_12px_12px_12px] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,.08),inset_0_0_0_1px_rgba(255,255,255,.06)]"
                          transition={{ type: 'spring', stiffness: 420, damping: 36 }}>
                          <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-sky-400 to-iris-400 shadow-[0_0_14px_2px_rgba(122,134,247,.55)]" />
                        </motion.span>
                      )}
                      {!active && <span className="absolute inset-0 rounded-[12px] bg-white/0 transition-colors group-hover:bg-white/[0.04]" />}
                      <span className={cn('relative grid size-5 place-items-center transition-transform duration-200 [&>svg]:size-[17px] [&>svg]:stroke-[1.75]', active ? 'text-indigo-200' : 'group-hover:translate-x-0.5')}>{it.icon}</span>
                      <span className="relative flex-1">{it.label}</span>
                      {it.badge && (
                        <span className={cn('tnum relative grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-2xs font-bold',
                          it.badge.tone === 'err' ? 'bg-err/90 text-white' : 'bg-indigo-400 text-white')}>
                          {it.badge.n}
                        </span>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <UserSwitch />
    </nav>
  )
}

function UserSwitch() {
  const me = useMe()!
  const users = useDemo((s) => s.data.users.filter((u) => u.id !== 'u-sato'))
  const login = useDemo((s) => s.login)
  const logout = useDemo((s) => s.logout)
  const nav = useNavigate()
  return (
    <div className="relative border-t border-white/[0.07] p-3">
      <Popover.Root>
        <Popover.Trigger className="focus-ring group flex w-full items-center gap-3 rounded-[14px] p-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:ring-offset-ink-950">
          <Avatar user={me} dark />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold">{me.name}</span>
            <span className="mt-0.5 block text-2xs text-white/45">ロール：{me.title}</span>
          </span>
          <ChevronsUpDown className="size-4 text-white/40 transition-colors group-hover:text-white/80" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="top" align="start" sideOffset={8}
            className="z-[70] w-[236px] rounded-2xl bg-white p-1.5 shadow-float data-[state=open]:animate-[tipIn_180ms_ease-out]">
            <p className="px-2.5 pb-1 pt-1.5 text-2xs font-semibold text-ink-400">デモ用：ユーザーを切り替え</p>
            {users.map((u) => (
              <Popover.Close key={u.id} onClick={() => { login(u.id); toast.info(`${u.name}（${u.title}）に切り替えました`) }}
                className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-surface-3">
                <Avatar user={u} size="sm" />
                <span className="flex-1 text-[13px] font-medium text-ink-800">{u.name}<span className="ml-1 text-xs text-ink-400">{u.title}</span></span>
                {u.id === me.id && <Check className="size-4 text-indigo-600" />}
              </Popover.Close>
            ))}
            <div className="my-1 h-px bg-line-soft" />
            <Popover.Close onClick={() => { logout(); nav('/login') }}
              className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-ink-600 hover:bg-err-bg hover:text-err">
              <LogOut className="size-4" />ログアウト
            </Popover.Close>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
