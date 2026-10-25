import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Lock, CheckCircle2, AlertTriangle, Info, FileBarChart2 } from 'lucide-react'
import { Page } from '@/layout/AppShell'
import { useDemo, useMe, GEN_STEPS } from '@/store/demo'
import { canGenerate, checkCounts, isConfirmed, reportChecks, reportFor, visibleClients } from '@/domain/metrics'
import { DEFAULT_REPORT_MONTH, fmtMonth, fmtStamp, REPORT_MONTHS } from '@/domain/calendar'
import { REPORT_STATUS } from '@/domain/labels'
import type { ReportStatus } from '@/domain/types'
import { gate } from '@/domain/workflow'
import { Empty, Field, Select, stagger } from '@/ui/bits'
import { ReportPill, TONE_DOT } from '@/ui/Pill'
import { SecondaryButton } from '@/ui/Button'
import { Tip } from '@/ui/Tooltip'
import { cn } from '@/ui/cn'
import { GenerateButton } from './GenerateButton'

const FLOW: ReportStatus[] = ['not_generated', 'draft', 'pending', 'approved', 'submitted']
const SIDE: ReportStatus[] = ['failed', 'rejected']

export function ReportsPage() {
  const data = useDemo((s) => s.data)
  const progress = useDemo((s) => s.progress)
  const me = useMe()!
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const month = sp.get('month') ?? DEFAULT_REPORT_MONTH
  const clientF = sp.get('client') ?? 'all'
  const statusF = (sp.get('status') ?? 'all') as ReportStatus | 'all'
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    v === 'all' ? n.delete(k) : n.set(k, v)
    setSp(n, { replace: true })
  }

  const clients = visibleClients(data, me)
  const rows = useMemo(() => clients.flatMap((c) => c.accountIds.map((id) => {
    const acc = data.accounts.find((a) => a.id === id)!
    const r = reportFor(data, id, month)
    const st: ReportStatus = progress[`r-${id}-${month}`] ? 'generating' : r?.status ?? 'not_generated'
    return { client: c, acc, report: r, status: st, checks: checkCounts([...reportChecks(data, id, month), ...(r?.versions.at(-1)?.checks ?? [])]) }
  })), [clients, data, month, progress])
  const filtered = rows.filter((r) => (clientF === 'all' || r.client.id === clientF) && (statusF === 'all' || r.status === statusF))
  const count = (s: ReportStatus) => rows.filter((r) => r.status === s).length

  return (
    <Page crumbs={[{ label: 'レポート' }, { label: '月次レポート一覧' }]} title="月次レポート"
      subtitle="月次集計が確定したアカウントから PowerPoint を生成し、承認と提出まで管理します。">
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-panel bg-surface/70 p-3 shadow-hair">
        <Field label="対象月" className="w-[180px]">
          <Select value={month} onChange={(v) => set('month', v)} options={REPORT_MONTHS.map((m) => ({ value: m, label: `${fmtMonth(m)}${m === '2026-10' ? '（集計中）' : ''}` }))} ariaLabel="対象月" />
        </Field>
        <Field label="クライアント" className="w-[230px]">
          <Select value={clientF} onChange={(v) => set('client', v)} options={[{ value: 'all', label: 'すべて' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} ariaLabel="クライアント" />
        </Field>
        <Field label="状態" className="w-[170px]">
          <Select value={statusF} onChange={(v) => set('status', v)} options={[{ value: 'all', label: 'すべて' }, ...(Object.keys(REPORT_STATUS) as ReportStatus[]).filter((s) => s !== 'generating').map((s) => ({ value: s, label: REPORT_STATUS[s].label }))]} ariaLabel="状態" />
        </Field>
      </div>

      {/* 工程ボード：本流の 5 工程と、例外（失敗・差し戻し）を分けて見せる */}
      <section className="panel mb-6 overflow-hidden" aria-label="工程ごとの件数">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto]">
          <ol className="flex gap-1 overflow-x-auto p-3">
            {FLOW.map((s, i) => {
              const on = statusF === s
              const n = count(s)
              return (
                <li key={s} className="min-w-[128px] flex-1">
                  <button onClick={() => set('status', on ? 'all' : s)} aria-pressed={on}
                    className={cn('focus-ring group relative flex h-full w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                      i === 0 ? 'rounded-l-2xl' : '', i === FLOW.length - 1 ? 'rounded-r-2xl' : '', on ? 'bg-ink-900 text-white' : 'bg-surface-3 hover:bg-paper-2')}
                    style={{ clipPath: i < FLOW.length - 1 ? 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%' + (i ? ', 12px 50%)' : ')') : i ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)' : undefined }}>
                    <span className={cn('font-display text-[38px] leading-none', on ? 'text-white' : n ? 'text-ink-950' : 'text-ink-200')}>{n}</span>
                    <span>
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold', on ? 'text-white' : 'text-ink-700')}>
                        <span className={cn('size-1.5 rounded-full', TONE_DOT[REPORT_STATUS[s].tone])} />{REPORT_STATUS[s].label}
                      </span>
                      <span className={cn('text-2xs', on ? 'text-white/60' : 'text-ink-400')}>工程 {i + 1}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="flex gap-2 border-t border-line-soft bg-surface-2 p-3 lg:border-l lg:border-t-0">
            {SIDE.map((s) => {
              const on = statusF === s
              const n = count(s)
              return (
                <button key={s} onClick={() => set('status', on ? 'all' : s)} aria-pressed={on}
                  className={cn('focus-ring flex min-w-[120px] items-center gap-3 rounded-2xl px-4 py-2 text-left ring-1 ring-inset transition-colors',
                    on ? 'bg-err text-white ring-err' : n ? 'bg-err-bg/60 ring-err-line hover:bg-err-bg' : 'ring-line hover:bg-white')}>
                  <span className={cn('font-display text-[32px] leading-none', on ? 'text-white' : n ? 'text-err' : 'text-ink-200')}>{n}</span>
                  <span className={cn('text-xs font-semibold', on ? 'text-white' : 'text-ink-700')}>{REPORT_STATUS[s].label}<span className={cn('block text-2xs font-normal', on ? 'text-white/70' : 'text-ink-400')}>要対応</span></span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden" aria-label="レポート一覧">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line-soft text-2xs font-semibold uppercase tracking-wider text-ink-400">
                <th className="py-3 pl-5 pr-3 font-semibold">クライアント・アカウント</th>
                <th className="px-3 py-3 font-semibold">月次集計</th>
                <th className="px-3 py-3 font-semibold">自動チェック</th>
                <th className="px-3 py-3 text-right font-semibold">版</th>
                <th className="px-3 py-3 font-semibold">状態</th>
                <th className="px-3 py-3 font-semibold">更新日時</th>
                <th className="w-[200px] px-5 py-3 text-right font-semibold">操作</th>
              </tr>
            </thead>
            <motion.tbody variants={stagger.container} initial="hidden" animate="show" key={month + clientF + statusF}>
              {filtered.map(({ client, acc, report, status, checks }) => {
                const confirmed = isConfirmed(data, acc.id, month)
                const id = `r-${acc.id}-${month}`
                const p = progress[id]
                const g = gate('generate', status, me, { canGenerate: canGenerate(data, acc.id, month), hasFile: !!report?.versions.length, isOwner: client.aeId === me.id })
                const open = () => nav(`/reports/${id}`)
                return (
                  <motion.tr key={id} variants={stagger.item} onClick={() => report && !p && open()}
                    className={cn('group border-b border-line-soft transition-colors last:border-0', report && 'cursor-pointer hover:bg-[linear-gradient(90deg,rgba(240,241,255,.7),rgba(255,255,255,0)_70%)]')}>
                    <td className="py-3.5 pl-5 pr-3">
                      <p className="text-2xs text-ink-400">{client.name}</p>
                      <p className="text-[14px] font-bold text-ink-900">@{acc.handle}<span className="ml-2 text-2xs font-medium text-ink-400">{acc.label}</span></p>
                    </td>
                    <td className="px-3">
                      {confirmed ? <span className="flex items-center gap-1.5 text-xs text-ink-600"><Lock className="size-3 text-ink-400" />確定済み</span>
                        : <span className="flex items-center gap-1.5 text-xs font-semibold text-warn"><AlertTriangle className="size-3" />未確定</span>}
                    </td>
                    <td className="px-3">
                      {checks.error + checks.warning === 0 ? <span className="flex items-center gap-1 text-xs text-ok"><CheckCircle2 className="size-3.5" />問題なし</span> : (
                        <span className="flex items-center gap-2 text-xs">
                          {checks.error > 0 && <span className="flex items-center gap-1 font-semibold text-err"><AlertTriangle className="size-3.5" />要修正 {checks.error}</span>}
                          {checks.warning > 0 && <span className="flex items-center gap-1 text-warn"><Info className="size-3.5" />確認 {checks.warning}</span>}
                        </span>
                      )}
                    </td>
                    <td className="tnum px-3 text-right font-display text-xl text-ink-800">{report?.versions.length ? report.versions.at(-1)!.no : <span className="text-ink-300">—</span>}</td>
                    <td className="min-w-[180px] px-3">
                      {p ? (
                        <div className="w-[170px]">
                          <p className="mb-1 text-2xs font-semibold text-indigo-700">{GEN_STEPS[Math.min(p.step, GEN_STEPS.length - 1)]}…</p>
                          <div className="h-1 overflow-hidden rounded-full bg-paper-2"><motion.div className="h-full bg-gradient-to-r from-sky-400 to-indigo-500" animate={{ width: `${p.pct}%` }} /></div>
                        </div>
                      ) : <ReportPill status={status} />}
                    </td>
                    <td className="tnum px-3 text-xs text-ink-500">{fmtStamp(report?.updatedAt)}</td>
                    <td className="px-5 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      {g && (status === 'not_generated' || status === 'failed') ? (
                        <GenerateButton accountId={acc.id} month={month} retry={status === 'failed'} disabledReason={g.allowed ? undefined : g.reason} />
                      ) : report && !p ? (
                        <SecondaryButton icon={<ArrowRight className="size-4" />} nudge="right" onClick={open}>開く</SecondaryButton>
                      ) : null}
                    </td>
                  </motion.tr>
                )
              })}
            </motion.tbody>
          </table>
          {!filtered.length && <Empty icon={<FileBarChart2 className="size-6" />} title="条件に一致するレポートはありません" desc="対象月や状態の絞り込みを変えてお試しください。" />}
        </div>
      </section>
      {month === '2026-10' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500"><Tip label="本番では締め日のバッチで自動確定します"><Info className="size-3.5" /></Tip>10 月は集計中のため、月次集計の確定後に生成できます。</p>
      )}
    </Page>
  )
}
