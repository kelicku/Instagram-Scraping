import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowUpRight, ChevronLeft, ChevronRight, Clock3, Search, Undo2, XOctagon, NotebookPen, CheckCircle2, X } from 'lucide-react'
import { Page } from '@/layout/AppShell'
import { useDemo, useMe } from '@/store/demo'
import { clientHealth, reportStatus, type ClientHealth } from '@/domain/metrics'
import { addDays, DEFAULT_REPORT_MONTH, fmtDay, fmtMonth, LAST_FETCH_DATE, monthOf, REPORT_MONTHS } from '@/domain/calendar'
import { REPORT_STATUS } from '@/domain/labels'
import type { ReportStatus } from '@/domain/types'
import { CountUp, Empty, Field, Segmented, Select, stagger, useDebounced } from '@/ui/bits'
import { FetchPill, ReportPill, TONE_DOT } from '@/ui/Pill'
import { Tip } from '@/ui/Tooltip'
import { cn } from '@/ui/cn'
import { SecondaryButton } from '@/ui/Button'

type Filter = 'all' | 'issues' | 'fetch' | 'report'
const PAGE = 8
const FETCH_DATES = Array.from({ length: 31 }, (_, i) => addDays(LAST_FETCH_DATE, -i))
const PIPE: ReportStatus[] = ['not_generated', 'failed', 'draft', 'rejected', 'pending', 'approved', 'submitted']
const STAGES: { label: string; of: ReportStatus[] }[] = [
  { label: '未生成', of: ['not_generated'] },
  { label: '作成中', of: ['draft', 'rejected', 'failed'] },
  { label: '承認待ち', of: ['pending'] },
  { label: '承認済み', of: ['approved'] },
  { label: '提出済み', of: ['submitted'] },
]

export function ClientsPage() {
  const data = useDemo((s) => s.data)
  const me = useMe()!
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const date = sp.get('date') ?? LAST_FETCH_DATE
  const month = sp.get('month') ?? DEFAULT_REPORT_MONTH
  const filter = (sp.get('f') as Filter) ?? 'all'
  const [q, setQ] = useState(sp.get('q') ?? '')
  const dq = useDebounced(q, 150)
  const [page, setPage] = useState(0)
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    n.set(k, v)
    setSp(n, { replace: true })
    setPage(0)
  }

  const mine = useMemo(() => (me.role === 'PM' ? data.clients : data.clients.filter((c) => c.aeId === me.id)), [data, me])
  const health = useMemo(() => mine.map((c) => clientHealth(data, c, date, month)), [mine, data, date, month])
  const accountIds = mine.flatMap((c) => c.accountIds)

  const rows = health.filter((h) => {
    if (dq && !(h.client.name.includes(dq) || h.client.accountIds.some((id) => data.accounts.find((a) => a.id === id)!.handle.includes(dq.replace('@', ''))))) return false
    if (filter === 'issues') return h.issues > 0
    if (filter === 'fetch') return h.fetch.failed.length + h.fetch.not_run.length > 0
    if (filter === 'report') return Object.entries(h.reports).some(([s, l]) => s !== 'submitted' && l?.length)
    return true
  })
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const view = rows.slice(page * PAGE, page * PAGE + PAGE)

  const fetchCounts = { success: 0, failed: 0, not_run: 0 }
  health.forEach((h) => Object.entries(h.fetch).forEach(([k, v]) => (fetchCounts[k as keyof typeof fetchCounts] += v.length)))
  const pipe = PIPE.map((s) => ({ s, n: accountIds.filter((id) => reportStatus(data, id, month) === s).length }))
  const counts = {
    all: health.length,
    issues: health.filter((h) => h.issues).length,
    fetch: health.filter((h) => h.fetch.failed.length + h.fetch.not_run.length).length,
    report: health.filter((h) => Object.entries(h.reports).some(([s, l]) => s !== 'submitted' && l?.length)).length,
  }

  const toMetrics = (clientId: string, handle: string) => {
    const acc = data.accounts.find((a) => a.handle === handle)!
    nav(`/data/metrics?client=${clientId}&account=${acc.id}&month=${monthOf(date)}&focus=${date}`)
  }
  const toReports = (clientId: string, status?: string) => nav(`/reports?client=${clientId}&month=${month}${status ? `&status=${status}` : ''}`)

  return (
    <Page
      crumbs={[{ label: 'クライアント' }, { label: 'クライアント一覧' }]}
      title="クライアント一覧"
      subtitle={me.role === 'PM' ? `全 ${mine.length} 社・${accountIds.length} アカウントの取得状況とレポートの進み具合` : `担当 ${mine.length} 社・${accountIds.length} アカウントの取得状況とレポートの進み具合`}
    >
      {/* フィルター */}
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-panel bg-surface/70 p-3 shadow-hair sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_minmax(160px,0.9fr)_auto]">
        <Field label="クライアント名・アカウント" htmlFor="q">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-400" />
            <input id="q" className="field pl-9 pr-8" placeholder="例：ヒノキ、@hinoki" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
            {q && <button onClick={() => setQ('')} aria-label="検索語を消去" className="focus-ring absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-400 hover:bg-paper-2 hover:text-ink-800"><X className="size-3.5" /></button>}
          </div>
        </Field>
        <Field label="取得状況の対象日" htmlFor="date">
          <Select id="date" value={date} onChange={(v) => set('date', v)}
            options={FETCH_DATES.map((d, i) => ({ value: d, label: `${d.replace(/-/g, '/')}${i === 0 ? '（前日）' : ` ${fmtDay(d).slice(-3)}`}` }))} />
        </Field>
        <Field label="レポートの対象月" htmlFor="month">
          <Select id="month" value={month} onChange={(v) => set('month', v)}
            options={REPORT_MONTHS.map((m) => ({ value: m, label: `${fmtMonth(m)}${m === DEFAULT_REPORT_MONTH ? '（先月）' : m === '2026-10' ? '（集計中）' : ''}` }))} />
        </Field>
        <Field label="絞り込み" className="sm:col-span-2 xl:col-span-1">
          <div className="overflow-x-auto">
            <Segmented id="cf" size="md" value={filter} onChange={(v) => set('f', v)}
              options={[
                { value: 'all', label: 'すべて', count: counts.all },
                { value: 'issues', label: '要対応', count: counts.issues },
                { value: 'fetch', label: '取得エラー', count: counts.fetch },
                { value: 'report', label: '未提出', count: counts.report },
              ]} />
          </div>
        </Field>
      </div>

      {/* サマリー帯：重要度に応じて幅を変える */}
      <motion.div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1.6fr_1fr]" variants={stagger.container} initial="hidden" animate="show">
        <motion.section variants={stagger.item} className="panel relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-sky-400/10 blur-2xl" />
          <p className="eyebrow">データ取得　{fmtDay(date)}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <CountUp value={fetchCounts.success} className="font-display text-[54px] leading-none text-ink-950" />
            <span className="font-display text-2xl text-ink-300">/ {accountIds.length}</span>
            <span className="ml-1 text-xs font-medium text-ink-500">アカウント成功</span>
          </div>
          <div className="mt-4 flex gap-1" aria-label="アカウント別の取得状況">
            {health.flatMap((h) =>
              (['failed', 'not_run', 'success'] as const).flatMap((st) =>
                h.fetch[st].map((handle) => (
                  <Tip key={handle} label={`@${handle}：${st === 'success' ? '成功' : st === 'failed' ? '失敗' : '未実行'}`}>
                    <motion.button
                      onClick={() => st !== 'success' && toMetrics(h.client.id, handle)}
                      aria-label={`@${handle}`}
                      className={cn('focus-ring h-7 flex-1 rounded-[5px] transition-transform hover:-translate-y-0.5',
                        st === 'success' ? 'bg-gradient-to-b from-indigo-200 to-indigo-300' : st === 'failed' ? 'bg-err' : 'bg-[repeating-linear-gradient(135deg,#BABDCD_0_3px,#ECEAE4_3px_6px)]')}
                      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} style={{ originY: 1 }}
                    />
                  </Tip>
                )),
              ),
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-indigo-300" />成功 {fetchCounts.success}</span>
            <span className="flex items-center gap-1.5"><AlertTriangle className="size-3 text-err" />失敗 {fetchCounts.failed}</span>
            <span className="flex items-center gap-1.5"><Clock3 className="size-3 text-ink-400" />未実行 {fetchCounts.not_run}</span>
          </div>
        </motion.section>

        <motion.section variants={stagger.item} className="panel p-5">
          <div className="flex items-center">
            <p className="eyebrow">レポート進捗　{fmtMonth(month)}</p>
            <Link to={`/reports?month=${month}`} className="focus-ring group ml-auto flex items-center gap-1 rounded text-xs font-medium text-indigo-600 hover:text-indigo-800">
              レポート一覧<ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-paper-2" aria-hidden>
            {pipe.filter((p) => p.n).map((p, i) => (
              <motion.div key={p.s} className={cn('h-full border-r-2 border-white last:border-0', TONE_DOT[REPORT_STATUS[p.s].tone])}
                initial={{ width: 0 }} animate={{ width: `${(p.n / accountIds.length) * 100}%` }} transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }} />
            ))}
          </div>
          <ol className="mt-4 grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-5">
            {STAGES.map((st) => {
              const parts = pipe.filter((p) => st.of.includes(p.s))
              const total = parts.reduce((a, p) => a + p.n, 0)
              return (
                <li key={st.label}>
                  <button onClick={() => nav(`/reports?month=${month}${st.of.length === 1 ? `&status=${st.of[0]}` : ''}`)} disabled={!total}
                    className="focus-ring group w-full rounded-lg p-1.5 text-left transition-colors enabled:hover:bg-surface-3 disabled:opacity-45">
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-2xs font-semibold text-ink-500">
                      <span className={cn('size-1.5 rounded-full', TONE_DOT[REPORT_STATUS[st.of[0]].tone])} />
                      {st.label}
                    </span>
                    <CountUp value={total} className="mt-1 block font-display text-[32px] leading-none text-ink-900" />
                    {st.of.length > 1 && (
                      <span className="mt-1 block truncate text-2xs text-ink-400">
                        {parts.filter((p) => p.n).map((p) => `${REPORT_STATUS[p.s].label} ${p.n}`).join('・') || '—'}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </motion.section>

        <motion.section variants={stagger.item} className="panel flex flex-col p-5">
          <p className="eyebrow">要対応</p>
          <AttentionList health={health} month={month} date={date} onFetch={toMetrics} onReport={toReports} />
        </motion.section>
      </motion.div>

      {/* 一覧 */}
      <section className="panel overflow-hidden" aria-label="クライアント一覧">
        <div className="flex items-center gap-3 border-b border-line-soft px-5 py-3">
          <p className="whitespace-nowrap text-[13px] font-semibold text-ink-800">{rows.length} 社</p>
          <p className="text-xs text-ink-400">取得状況は {fmtDay(date)}、レポートは {fmtMonth(month)} を表示</p>
        </div>
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="text-2xs font-semibold uppercase tracking-wider text-ink-400">
                <th className="py-3 pl-7 pr-3 font-semibold">クライアント</th>
                <th className="px-3 py-3 font-semibold">担当</th>
                <th className="px-3 py-3 font-semibold">取得状況 <span className="tnum ml-1 normal-case tracking-normal text-ink-300">{date.slice(5).replace('-', '/')}</span></th>
                <th className="px-3 py-3 font-semibold">レポート <span className="tnum ml-1 normal-case tracking-normal text-ink-300">{fmtMonth(month)}</span></th>
                <th className="px-3 py-3 pr-5 font-semibold">問題のあるアカウント</th>
              </tr>
            </thead>
            <motion.tbody variants={stagger.container} initial="hidden" animate="show" key={`${date}${month}${filter}${dq}${page}`}>
              {view.map((h) => <ClientRow key={h.client.id} h={h} month={month} onFetch={toMetrics} onReport={toReports} />)}
            </motion.tbody>
          </table>
          {!view.length && (
            <Empty title="条件に一致するクライアントはありません" desc="検索語や絞り込みを変えてお試しください。"
              action={<SecondaryButton onClick={() => { setQ(''); set('f', 'all') }}>条件をクリア</SecondaryButton>} />
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line-soft px-5 py-3">
          <span className="tnum mr-2 text-xs text-ink-500">{page + 1} / {pages}</span>
          <SecondaryButton size="sm" icon={<ChevronLeft className="size-3.5" />} nudge="left" disabled={page === 0} onClick={() => setPage(page - 1)}>前へ</SecondaryButton>
          <SecondaryButton size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>次へ<ChevronRight className="size-3.5" /></SecondaryButton>
        </div>
      </section>
    </Page>
  )
}

function worst(h: ClientHealth) {
  if (h.fetch.failed.length || h.reports.failed?.length || h.reports.rejected?.length) return 'err'
  if (h.fetch.not_run.length || h.missingManual.length) return 'warn'
  return 'ok'
}

function ClientRow({ h, month, onFetch, onReport }: { h: ClientHealth; month: string; onFetch: (c: string, handle: string) => void; onReport: (c: string, s?: string) => void }) {
  const data = useDemo((s) => s.data)
  const user = (id: string) => data.users.find((u) => u.id === id)!
  const w = worst(h)
  const problems = [
    ...h.fetch.failed.map((x) => ({ handle: x, why: '取得失敗', icon: <AlertTriangle className="size-3" />, go: () => onFetch(h.client.id, x) })),
    ...h.fetch.not_run.map((x) => ({ handle: x, why: '未実行', icon: <Clock3 className="size-3" />, go: () => onFetch(h.client.id, x) })),
    ...(h.reports.rejected ?? []).map((x) => ({ handle: x, why: '差し戻し', icon: <Undo2 className="size-3" />, go: () => onReport(h.client.id, 'rejected') })),
    ...(h.reports.failed ?? []).map((x) => ({ handle: x, why: '生成失敗', icon: <XOctagon className="size-3" />, go: () => onReport(h.client.id, 'failed') })),
    ...h.missingManual.map((x) => ({ handle: x, why: '指標未入力', icon: <NotebookPen className="size-3" />, go: () => onFetch(h.client.id, x) })),
  ]
  return (
    <motion.tr variants={stagger.item} className="group relative border-t border-line-soft align-top transition-colors hover:bg-[linear-gradient(90deg,rgba(240,241,255,.7),rgba(255,255,255,0)_70%)]">
      <td className="relative py-4 pl-7 pr-3">
        <span className={cn('absolute inset-y-3 left-0 w-[3px] rounded-r-full transition-all duration-300 group-hover:inset-y-1.5 group-hover:w-1',
          w === 'err' ? 'bg-err' : w === 'warn' ? 'bg-[#D18A1A]' : 'bg-indigo-200')} aria-hidden />
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink-900">
          {h.client.name}
          {w === 'ok' && <CheckCircle2 className="size-3.5 text-ok" aria-label="問題なし" />}
        </p>
        <p className="mt-1 text-xs text-ink-400">{h.client.industry}・対象アカウント {h.client.accountIds.length}</p>
      </td>
      <td className="px-3 py-4">
        <div className="space-y-1.5">
          {[{ u: user(h.client.aeId), r: '担当AE' }, { u: user(h.client.pmId), r: 'PM' }].map(({ u, r }) => (
            <div key={r} className="flex items-center gap-2 whitespace-nowrap text-[12.5px]">
              <span className="grid size-5 place-items-center rounded-full bg-paper-2 text-2xs font-bold text-ink-600">{u.name[0]}</span>
              <span className="text-ink-800">{u.name}</span>
              <span className="text-2xs text-ink-400">{r}</span>
            </div>
          ))}
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="flex flex-col items-start gap-1.5">
          {(['success', 'failed', 'not_run'] as const).filter((s) => h.fetch[s].length).map((s) => (
            <div key={s} className="flex flex-wrap items-center gap-1.5">
              {s === 'success' ? <FetchPill status={s} count={h.fetch[s].length} /> : (
                <button onClick={() => onFetch(h.client.id, h.fetch[s][0])} className="focus-ring group/p flex items-center gap-1.5 rounded-full">
                  <FetchPill status={s} count={h.fetch[s].length} />
                  <span className="text-xs font-medium text-err underline-offset-2 group-hover/p:underline">{h.fetch[s].map((x) => '@' + x).join('・')}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="flex flex-col items-start gap-1.5">
          {Object.entries(h.reports).sort(([a], [b]) => REPORT_STATUS[a as ReportStatus].order - REPORT_STATUS[b as ReportStatus].order).map(([s, list]) => (
            <button key={s} onClick={() => onReport(h.client.id, s)} className="focus-ring group/p flex flex-wrap items-center gap-1.5 rounded-full text-left">
              <ReportPill status={s as ReportStatus} count={list!.length} />
              {s !== 'submitted' && <span className="text-xs text-ink-500 underline-offset-2 group-hover/p:text-ink-900 group-hover/p:underline">{list!.map((x) => '@' + x).join('・')}</span>}
            </button>
          ))}
          {month === '2026-10' && <span className="text-2xs text-ink-400">10 月は集計中のため生成できません</span>}
        </div>
      </td>
      <td className="px-3 py-4 pr-5">
        {problems.length ? (
          <ul className="flex flex-col items-start gap-1">
            {problems.map((p, i) => (
              <li key={i}>
                <button onClick={p.go} className="focus-ring group/x inline-flex items-center gap-1.5 rounded-md py-0.5 text-[12.5px] font-medium text-ink-800 hover:text-indigo-700">
                  <span className="text-err">{p.icon}</span>@{p.handle}
                  <span className="text-2xs font-normal text-ink-400">{p.why}</span>
                  <ArrowUpRight className="size-3 opacity-0 transition-all group-hover/x:translate-x-0.5 group-hover/x:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-ink-300">なし</span>
        )}
      </td>
    </motion.tr>
  )
}

function AttentionList({ health, month, date, onFetch, onReport }: {
  health: ClientHealth[]; month: string; date: string; onFetch: (c: string, h: string) => void; onReport: (c: string, s?: string) => void
}) {
  const items = health.flatMap((h) => [
    ...h.fetch.failed.map((x) => ({ k: `f${x}`, tone: 'err', icon: <AlertTriangle className="size-3.5" />, title: `@${x} のデータ取得に失敗`, sub: `${fmtDay(date)}・${h.client.name}`, go: () => onFetch(h.client.id, x) })),
    ...h.fetch.not_run.map((x) => ({ k: `n${x}`, tone: 'neutral', icon: <Clock3 className="size-3.5" />, title: `@${x} の取得が未実行`, sub: `${fmtDay(date)}・${h.client.name}`, go: () => onFetch(h.client.id, x) })),
    ...(h.reports.rejected ?? []).map((x) => ({ k: `r${x}`, tone: 'err', icon: <Undo2 className="size-3.5" />, title: `@${x} のレポートが差し戻し`, sub: `${fmtMonth(month)}・修正して再依頼`, go: () => onReport(h.client.id, 'rejected') })),
    ...(h.reports.failed ?? []).map((x) => ({ k: `g${x}`, tone: 'err', icon: <XOctagon className="size-3.5" />, title: `@${x} のレポート生成に失敗`, sub: `${fmtMonth(month)}・再生成できます`, go: () => onReport(h.client.id, 'failed') })),
    ...h.missingManual.map((x) => ({ k: `m${x}`, tone: 'warn', icon: <NotebookPen className="size-3.5" />, title: `@${x} の手入力指標が不足`, sub: `${fmtMonth(month)}・新規フォロワー数など`, go: () => onFetch(h.client.id, x) })),
  ])
  if (!items.length)
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
        <CheckCircle2 className="size-7 text-ok" />
        <p className="mt-2 text-sm font-semibold">対応が必要な項目はありません</p>
      </div>
    )
  return (
    <ul className="thin-scroll -mx-2 mt-2 max-h-[164px] space-y-0.5 overflow-y-auto">
      <AnimatePresence initial={false}>
        {items.map((it) => (
          <motion.li key={it.k} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={it.go} className="focus-ring group flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface-3">
              <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg',
                it.tone === 'err' ? 'bg-err-bg text-err' : it.tone === 'warn' ? 'bg-warn-bg text-warn' : 'bg-paper-2 text-ink-500')}>{it.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-ink-900">{it.title}</span>
                <span className="block truncate text-2xs text-ink-400">{it.sub}</span>
              </span>
              <ChevronRight className="mt-1.5 size-3.5 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-700" />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
