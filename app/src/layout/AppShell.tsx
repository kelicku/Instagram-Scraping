import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import * as D from '@radix-ui/react-dialog'
import { ChevronRight, FlaskConical, Menu } from 'lucide-react'
import { useMe } from '@/store/demo'
import { Sidebar } from './Sidebar'
import { Avatar } from './Avatar'
import { cn } from '@/ui/cn'
import { DemoScopeDialog } from './DemoScope'
import { PageErrorBoundary } from './ErrorBoundary'
import { fmtDateLong, DEMO_TODAY } from '@/domain/calendar'

export function AppShell() {
  const me = useMe()
  const loc = useLocation()
  const [drawer, setDrawer] = useState(false)
  // scrollTo は新しいブラウザでは Promise を返す。式のまま返すと React がクリーンアップ関数として
  // 呼び出して画面全体が落ちるため、必ずブロック本体で書く
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [loc.pathname])
  if (!me) return <Navigate to="/login" replace />
  return (
    <div className="paper-grain flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar />
      </aside>
      <D.Root open={drawer} onOpenChange={setDrawer}>
        <AnimatePresence>
          {drawer && (
            <D.Portal forceMount>
              <D.Overlay asChild forceMount>
                <motion.div className="fixed inset-0 z-50 bg-ink-950/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              </D.Overlay>
              <D.Content asChild forceMount>
                <motion.div className="fixed inset-y-0 left-0 z-50 lg:hidden" initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                  <D.Title className="sr-only">メニュー</D.Title>
                  <D.Description className="sr-only">画面を切り替えます</D.Description>
                  <Sidebar onNavigate={() => setDrawer(false)} />
                </motion.div>
              </D.Content>
            </D.Portal>
          )}
        </AnimatePresence>
      </D.Root>
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
        <MobileBar onMenu={() => setDrawer(true)} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={loc.pathname} className="flex min-w-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            <PageErrorBoundary key={loc.pathname}>
              <Outlet />
            </PageErrorBoundary>
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}

function MobileBar({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-ink-950 px-3 text-white lg:hidden">
      <button onClick={onMenu} aria-label="メニューを開く" className="focus-ring grid size-9 place-items-center rounded-xl hover:bg-white/10"><Menu className="size-5" /></button>
      <span className="text-sm font-bold">自動レポーティング</span>
    </div>
  )
}

export interface Crumb {
  label: string
  to?: string
}

/** 各画面の見出し：パンくず・画面名・対象期間・ユーザー・主要アクション */
export function Page({ crumbs, title, subtitle, period, actions, children, wide }: {
  crumbs: Crumb[]; title: ReactNode; subtitle?: ReactNode; period?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean
}) {
  const me = useMe()!
  const [scope, setScope] = useState(false)
  return (
    <>
      <header className="sticky top-0 z-20 hidden h-14 items-center gap-4 border-b border-line/70 bg-paper/80 px-8 backdrop-blur-md lg:flex">
        <nav aria-label="パンくず" className="flex min-w-0 items-center gap-1.5 text-xs text-ink-500">
          {crumbs.map((c, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3 text-ink-300" />}
              {c.to ? <Link to={c.to} className="focus-ring truncate rounded hover:text-ink-900">{c.label}</Link> : <span className="truncate font-semibold text-ink-800" aria-current="page">{c.label}</span>}
            </span>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-ink-400 xl:inline">本日 {fmtDateLong(DEMO_TODAY)}</span>
          <button onClick={() => setScope(true)}
            className="focus-ring group flex h-7 items-center gap-1.5 rounded-full border border-dashed border-indigo-300 bg-indigo-50/60 px-2.5 text-2xs font-bold tracking-wider text-indigo-700 transition-colors hover:border-solid hover:bg-indigo-50">
            <FlaskConical className="size-3.5 transition-transform group-hover:rotate-12" />
            DEMO・範囲を確認
          </button>
          <div className="h-5 w-px bg-line" />
          <div className="flex items-center gap-2.5">
            <Avatar user={me} size="sm" />
            <div className="leading-tight">
              <p className="text-[12.5px] font-semibold text-ink-900">{me.name}</p>
              <p className="text-2xs text-ink-400">{me.title}</p>
            </div>
          </div>
        </div>
      </header>
      <DemoScopeDialog open={scope} onOpenChange={setScope} />
      <div className={cn('mx-auto w-full flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8', wide ? 'max-w-[1560px]' : 'max-w-[1360px]')}>
        <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink-950 sm:text-[28px]">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
          </div>
          {period && <div className="flex items-center gap-2">{period}</div>}
          {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </>
  )
}
