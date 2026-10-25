import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChevronDown, ClipboardList, Cog, FileBarChart2, Goal, NotebookPen, RefreshCw, Search, ScrollText } from 'lucide-react'
import { Page } from '@/layout/AppShell'
import { useDemo, useMe, userName } from '@/store/demo'
import { visibleClients } from '@/domain/metrics'
import { fmtDateLong } from '@/domain/calendar'
import type { AuditEntity } from '@/domain/types'
import { Empty, Field, Segmented, Select, useDebounced } from '@/ui/bits'
import { cn } from '@/ui/cn'

const ENTITY: Record<AuditEntity, { label: string; icon: JSX.Element; cls: string }> = {
  kpi_target: { label: 'KPI 目標', icon: <Goal className="size-3.5" />, cls: 'bg-indigo-50 text-indigo-600' },
  initiative: { label: '施策', icon: <ClipboardList className="size-3.5" />, cls: 'bg-iris-50 text-iris-600' },
  manual_metric: { label: '手入力指標', icon: <NotebookPen className="size-3.5" />, cls: 'bg-sky-50 text-sky-600' },
  report: { label: 'レポート', icon: <FileBarChart2 className="size-3.5" />, cls: 'bg-ink-100 text-ink-700' },
  fetch: { label: 'データ取得', icon: <RefreshCw className="size-3.5" />, cls: 'bg-ok-bg text-ok' },
  system: { label: 'システム', icon: <Cog className="size-3.5" />, cls: 'bg-paper-2 text-ink-500' },
}

export function AuditPage() {
  const data = useDemo((s) => s.data)
  const me = useMe()!
  const [entity, setEntity] = useState<AuditEntity | 'all'>('all')
  const [user, setUser] = useState('all')
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const [open, setOpen] = useState<string | null>(null)
  const mine = useMemo(() => new Set(visibleClients(data, me).map((c) => c.id)), [data, me])

  const rows = data.audit.filter((a) =>
    (me.role === 'PM' || !a.clientId || mine.has(a.clientId)) &&
    (entity === 'all' || a.entity === entity) && (user === 'all' || a.userId === user) &&
    (!dq || `${a.action} ${a.target} ${a.changes?.map((c) => c.field + c.after).join(' ')}`.includes(dq)))
  const groups = rows.reduce<Record<string, typeof rows>>((m, a) => ((m[a.at.slice(0, 10)] ??= []).push(a), m), {})

  return (
    <Page crumbs={[{ label: '管理' }, { label: '監査ログ' }]} title="監査ログ"
      subtitle="データの変更とレポートの操作を、誰が・いつ・何を・どう変えたかの単位で記録しています。">
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-panel bg-surface/70 p-3 shadow-hair">
        <Field label="キーワード" className="w-[240px]" htmlFor="aq">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-400" />
            <input id="aq" className="field pl-9" placeholder="例：hinoki、リーチ" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </Field>
        <Field label="操作した人" className="w-[170px]">
          <Select value={user} onChange={setUser} ariaLabel="操作した人" options={[{ value: 'all', label: 'すべて' }, ...data.users.map((u) => ({ value: u.id, label: u.name })), { value: 'system', label: 'システム' }]} />
        </Field>
        <Field label="対象">
          <div className="overflow-x-auto">
            <Segmented id="au" size="sm" value={entity} onChange={setEntity}
              options={[{ value: 'all' as const, label: 'すべて' }, ...(['kpi_target', 'initiative', 'manual_metric', 'report', 'fetch'] as AuditEntity[]).map((e) => ({ value: e, label: ENTITY[e].label }))]} />
          </div>
        </Field>
        <p className="ml-auto self-center text-xs text-ink-500"><b className="tnum text-ink-900">{rows.length}</b> 件</p>
      </div>

      <section className="panel overflow-hidden">
        {rows.length === 0 ? <Empty icon={<ScrollText className="size-6" />} title="該当する記録はありません" /> : Object.entries(groups).map(([day, items]) => (
          <div key={day}>
            <p className="sticky top-14 z-10 border-b border-line-soft bg-surface-2/95 px-5 py-2 text-2xs font-bold text-ink-500 backdrop-blur">{fmtDateLong(day)}</p>
            <ul className="divide-y divide-line-soft">
              {items.map((a) => {
                const m = ENTITY[a.entity]
                const expanded = open === a.id
                const hasDiff = !!a.changes?.length
                return (
                  <li key={a.id}>
                    <button disabled={!hasDiff} onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={hasDiff ? expanded : undefined}
                      className="focus-ring group grid w-full grid-cols-[56px_28px_1fr_auto] items-center gap-3 px-5 py-3 text-left transition-colors enabled:hover:bg-surface-2 sm:grid-cols-[56px_28px_1fr_140px_24px]">
                      <span className="tnum text-xs text-ink-400">{a.at.slice(11, 16)}</span>
                      <span className={cn('grid size-7 place-items-center rounded-lg', m.cls)}>{m.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-ink-900">{a.action}</span>
                        <span className="block truncate text-xs text-ink-500">{a.target}</span>
                      </span>
                      <span className="hidden text-xs text-ink-600 sm:block">{userName(data, a.userId)}</span>
                      {hasDiff ? <ChevronDown className={cn('size-4 text-ink-300 transition-transform group-hover:text-ink-600', expanded && 'rotate-180')} /> : <span />}
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                          <table className="mx-5 mb-3 w-[calc(100%-40px)] overflow-hidden rounded-xl bg-surface-3 text-xs sm:ml-[104px] sm:w-[calc(100%-124px)]">
                            <tbody>
                              {a.changes!.map((c, i) => (
                                <tr key={i} className="border-b border-white last:border-0">
                                  <td className="w-[34%] px-3 py-2 font-semibold text-ink-600">{c.field}</td>
                                  <td className="px-3 py-2">
                                    {c.before && <><span className="text-ink-400 line-through decoration-ink-300">{c.before}</span><ArrowRight className="mx-2 inline size-3 text-ink-300" /></>}
                                    <span className="font-semibold text-ink-900">{c.after}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>
    </Page>
  )
}
