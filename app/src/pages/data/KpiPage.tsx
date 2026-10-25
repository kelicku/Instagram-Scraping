import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, FileSpreadsheet, Lock, RotateCcw, Save, Upload, Target } from 'lucide-react'
import { Page } from '@/layout/AppShell'
import { useDemo } from '@/store/demo'
import { DataTabs, ScopeBar, useScope } from './scope'
import { achievement, delta, isConfirmed, monthActual, type KpiValues } from '@/domain/metrics'
import { KPI_DEFS } from '@/domain/labels'
import { addMonths, fiscalMonths, fmtMonth, fmtMonthShort, LAST_FETCH_DATE, monthOf } from '@/domain/calendar'
import type { KpiKey } from '@/domain/types'
import { AchBar, AchRing, CountUp, Denied, Empty, Field, Select, Spark, fmt, fmtPct, fmtSigned, stagger } from '@/ui/bits'
import { IconButton, PrimaryButton, SecondaryButton } from '@/ui/Button'
import { Confirm } from '@/ui/Dialog'
import { toast } from '@/ui/Toast'
import { cn } from '@/ui/cn'
import { targetsToCsv } from '@/domain/csv'
import { downloadBlob } from '@/services/files'
import { CsvImportDialog } from './CsvImportDialog'

type Draft = Record<string, string> // `${month}|${key}` → 入力文字列

export function KpiPage() {
  const scope = useScope()
  const { data, client, accounts, account, set, denied } = scope
  const [fy, setFy] = useState('2026')
  const months = fiscalMonths(`${fy}-04`)
  const saveTargets = useDemo((s) => s.saveTargets)
  const [focus, setFocus] = useState('2026-09')
  const [draft, setDraft] = useState<Draft>({})
  const [pending, setPending] = useState<null | (() => void)>(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const accId = account as string
  const acc = data.accounts.find((a) => a.id === accId)
  const targets = data.targets[accId] ?? {}

  useEffect(() => {
    setDraft({})
  }, [accId])

  const dirtyKeys = Object.keys(draft).filter((k) => {
    const [m, key] = k.split('|')
    const cur = targets[m]?.[key as KpiKey]
    return draft[k] !== (cur == null ? '' : String(cur))
  })
  const invalid = dirtyKeys.filter((k) => draft[k] !== '' && !/^\d+$/.test(draft[k].replace(/,/g, '')))

  const guard = (fn: () => void) => (dirtyKeys.length ? setPending(() => fn) : fn())

  const save = async () => {
    await new Promise((r) => setTimeout(r, 550))
    saveTargets(accId, dirtyKeys.map((k) => {
      const [month, key] = k.split('|')
      const v = draft[k].replace(/,/g, '')
      return { month, key: key as KpiKey, value: v === '' ? undefined : Number(v) }
    }))
    toast.ok(`${dirtyKeys.length} 件の目標を保存しました`, '変更内容は監査ログに記録されました')
    setDraft({})
  }

  if (denied) return <Page crumbs={[{ label: 'データ' }, { label: 'KPI 月次目標' }]} title="KPI 月次目標"><DataTabs /><div className="panel"><Denied /></div></Page>
  if (!client || !acc) return <Page crumbs={[{ label: 'データ' }, { label: 'KPI 月次目標' }]} title="KPI 月次目標"><Empty title="担当クライアントがありません" /></Page>

  return (
    <Page
      crumbs={[{ label: 'データ' }, { label: 'KPI 月次目標' }]}
      title="KPI 月次目標"
      subtitle="アカウントごとの月次目標を管理します。集計が確定した月は実績と比較でき、目標は編集できません。"
      actions={
        <>
          <IconButton label="現在の目標を CSV で書き出し（テンプレート）" icon={<Download className="size-4" />}
            onClick={() => downloadBlob(new Blob([targetsToCsv(acc.handle, targets)], { type: 'text/csv' }), `kpi_targets_${acc.handle}_FY${fy}.csv`)} />
          <SecondaryButton icon={<Upload className="size-4" />} nudge="up" onClick={() => setCsvOpen(true)}>CSV 取り込み</SecondaryButton>
        </>
      }
    >
      <DataTabs />
      <ScopeBar>
        <Field label="クライアント" className="w-[220px]">
          <Select value={client.id} onChange={(v) => guard(() => set({ client: v, account: null }))} options={scope.clients.map((c) => ({ value: c.id, label: c.name }))} ariaLabel="クライアント" />
        </Field>
        <Field label="アカウント" className="w-[200px]">
          <Select value={accId} onChange={(v) => guard(() => set({ account: v }))} options={accounts.map((a) => ({ value: a.id, label: `@${a.handle}` }))} ariaLabel="アカウント" />
        </Field>
        <Field label="年度" className="w-[200px]">
          <Select value={fy} onChange={(v) => guard(() => setFy(v))} options={[{ value: '2026', label: '2026 年度（4月〜3月）' }, { value: '2025', label: '2025 年度（4月〜3月）' }]} ariaLabel="年度" />
        </Field>
      </ScopeBar>

      {fy === '2025' ? (
        <div className="panel"><Empty icon={<Target className="size-6" />} title="2025 年度の目標データはありません" desc="このデモでは 2026 年度（2026年4月〜2027年3月）のデータを用意しています。" /></div>
      ) : (
        <>
          <Ledger accountId={accId} month={focus} onMonth={setFocus} />
          <section className="panel mt-6 overflow-hidden" aria-label="年間の目標">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-soft px-5 py-3.5">
              <h2 className="text-[15px] font-bold">年間の目標</h2>
              <p className="flex items-center gap-1.5 text-xs text-ink-400"><Lock className="size-3" />確定済みの月は編集できません</p>
              <p className="text-xs text-ink-400">月の見出しを選ぶと、上の実績比較が切り替わります</p>
            </div>
            <TargetGrid months={months} accountId={accId} draft={draft} setDraft={setDraft} focus={focus} onFocus={setFocus} invalid={invalid} />
            <AnimatePresence>
              {dirtyKeys.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-indigo-100 bg-indigo-50/50 px-5 py-3">
                    <span className="mr-auto flex items-center gap-2 text-[13px] text-ink-700">
                      <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-indigo-400 opacity-60" /><span className="relative size-2 rounded-full bg-indigo-500" /></span>
                      <b className="tnum">{dirtyKeys.length}</b> 件の値を変更
                      {invalid.length > 0 && <span className="text-xs font-medium text-err">・{invalid.length} 件は数値ではありません</span>}
                    </span>
                    <SecondaryButton icon={<RotateCcw className="size-3.5" />} nudge="spin" onClick={() => setDraft({})}>取り消す</SecondaryButton>
                    <PrimaryButton icon={<Save className="size-4" />} onClick={save} disabled={invalid.length > 0} disabledReason="数値でない入力を直してください" loadingLabel="保存中…" successLabel="保存しました">保存する</PrimaryButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </>
      )}

      <Confirm open={!!pending} onOpenChange={(v) => !v && setPending(null)} title="保存していない変更があります" description="切り替えると、入力した目標値は破棄されます。"
        confirmLabel="破棄して切り替える" tone="danger" onConfirm={() => { pending?.(); setDraft({}); setPending(null) }} />
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} accountId={accId} />
    </Page>
  )
}

/* ------------------------------------------------------------------ */
/* 実績と目標の比較（主役 1 指標＋台帳）                                     */
/* ------------------------------------------------------------------ */

function Ledger({ accountId, month, onMonth }: { accountId: string; month: string; onMonth: (m: string) => void }) {
  const data = useDemo((s) => s.data)
  const hasData = month <= monthOf(LAST_FETCH_DATE) && month >= '2026-07'
  const cur = hasData ? monthActual(data, accountId, month).values : null
  const prev = hasData && month > '2026-07' ? monthActual(data, accountId, addMonths(month, -1)).values : null
  const hist = ['2026-07', '2026-08', '2026-09', '2026-10'].filter((m) => m <= month).map((m) => monthActual(data, accountId, m).values)
  const t = data.targets[accountId]?.[month] ?? {}
  const confirmed = isConfirmed(data, accountId, month)
  const inProgress = month === monthOf(LAST_FETCH_DATE)
  const row = (k: KpiKey) => ({ v: cur?.[k] ?? null, t: t[k], a: achievement(cur?.[k], t[k]), d: delta(cur?.[k] ?? null, prev?.[k] ?? null), h: hist.map((x: KpiValues) => x[k]) })
  const f = row('followers')

  return (
    <motion.div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_2fr]" variants={stagger.container} initial="hidden" animate="show" key={accountId + month}>
      <motion.section variants={stagger.item} className="relative overflow-hidden rounded-panel bg-ink-950 p-6 text-white shadow-lift">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 size-56 rounded-full bg-iris-500/20 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-white/50">{fmtMonth(month)}・フォロワー数</p>
          <span className={cn('ml-auto rounded-full px-2 py-0.5 text-2xs font-bold', confirmed ? 'bg-white/10 text-white/80' : 'bg-warn-bg text-warn')}>
            {confirmed ? '確定' : inProgress ? '集計中' : hasData ? '未確定' : '実績なし'}
          </span>
        </div>
        <div className="relative mt-5 flex items-end gap-5">
          <div>
            <CountUp value={f.v} className="font-display text-[64px] leading-[0.9]" />
            <p className="mt-2 text-xs text-white/55">目標 <span className="tnum text-white/85">{fmt(f.t)}</span>
              <span className={cn('ml-3 font-semibold', f.d == null ? 'text-white/40' : f.d >= 0 ? 'text-emerald-300' : 'text-rose-300')}>前月比 {fmtSigned(f.d)}</span>
            </p>
          </div>
          <div className="relative ml-auto grid place-items-center">
            <AchRing ratio={f.a} size={92} stroke={7} />
            <span className="tnum absolute text-center text-lg font-bold leading-none">{fmtPct(f.a)}<span className="block text-[9px] font-medium text-white/50">達成率</span></span>
          </div>
        </div>
        {cur && (
          <dl className="relative mt-6 grid grid-cols-3 gap-2">
            {(() => {
              const m = monthActual(data, accountId, month)
              return [['新規フォロワー', m.newFollows], ['フォロー解除', m.unfollows], ['純増', m.newFollows - m.unfollows]].map(([k, v]) => (
                <div key={k as string} className="rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-inset ring-white/10">
                  <dt className="text-2xs text-white/50">{k}</dt>
                  <dd className="tnum font-display text-xl">{fmt(v as number)}</dd>
                </div>
              ))
            })()}
          </dl>
        )}
        <div className="relative mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
          <Spark values={f.h} stroke="#A1ABFF" w={170} h={40} />
          <p className="text-right text-2xs leading-4 text-white/45">7 月からの推移<br />月末時点</p>
        </div>
      </motion.section>

      <motion.section variants={stagger.item} className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line-soft px-5 py-3">
          <h2 className="text-[15px] font-bold">実績と目標</h2>
          <div className="ml-auto flex gap-1" role="tablist" aria-label="比較する月">
            {['2026-07', '2026-08', '2026-09', '2026-10'].map((m) => (
              <button key={m} role="tab" aria-selected={m === month} onClick={() => onMonth(m)}
                className={cn('focus-ring relative h-7 rounded-full px-3 text-xs font-semibold transition-colors', m === month ? 'text-white' : 'text-ink-500 hover:bg-paper-2 hover:text-ink-900')}>
                {m === month && <motion.span layoutId="ledger-month" className="absolute inset-0 rounded-full bg-ink-900" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span className="relative">{fmtMonthShort(m)}{m === '2026-10' ? '（途中）' : ''}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-line-soft">
          {KPI_DEFS.slice(1).map((d) => {
            const r = row(d.key)
            return (
              <div key={d.key} className="grid grid-cols-[minmax(130px,1.2fr)_minmax(90px,1fr)_minmax(140px,1.6fr)_70px_90px] items-center gap-4 px-5 py-3 max-md:grid-cols-[1fr_1fr] max-md:gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-ink-900">{d.label}</p>
                  <p className="text-2xs text-ink-400">{d.hint}</p>
                </div>
                <div className="text-right">
                  <CountUp value={r.v} className="font-display text-[26px] leading-none text-ink-950" />
                  <p className="tnum mt-0.5 text-2xs text-ink-400">目標 {r.t ? fmt(r.t) : '未設定'}</p>
                </div>
                <div className="max-md:col-span-2">
                  <div className="mb-1 flex items-baseline justify-between text-2xs">
                    <span className="text-ink-400">達成率</span>
                    <span className={cn('tnum text-xs font-bold', r.a == null ? 'text-ink-300' : r.a >= 1 ? 'text-indigo-600' : 'text-ink-700')}>{r.t ? fmtPct(r.a) : '目標未設定'}</span>
                  </div>
                  <AchBar ratio={r.a} />
                </div>
                <p className={cn('tnum text-right text-xs font-semibold', r.d == null ? 'text-ink-300' : r.d >= 0 ? 'text-ok' : 'text-err')}>
                  {r.d == null ? '—' : `${r.d >= 0 ? '▲' : '▼'} ${Math.abs(r.d * 100).toFixed(1)}%`}
                </p>
                <Spark values={r.h} w={84} h={26} className="justify-self-end max-md:hidden" />
              </div>
            )
          })}
        </div>
      </motion.section>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* 年間目標の編集グリッド                                                 */
/* ------------------------------------------------------------------ */

function TargetGrid({ months, accountId, draft, setDraft, focus, onFocus, invalid }: {
  months: string[]; accountId: string; draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void; focus: string; onFocus: (m: string) => void; invalid: string[]
}) {
  const data = useDemo((s) => s.data)
  const targets = data.targets[accountId] ?? {}
  const refs = useRef<Record<string, HTMLInputElement | null>>({})
  const actual = useMemo(() => Object.fromEntries(months.map((m) => [m, m >= '2026-07' && m <= monthOf(LAST_FETCH_DATE) ? monthActual(data, accountId, m).values : null])), [data, accountId, months])

  const move = (ri: number, ci: number) => refs.current[`${ri}-${ci}`]?.focus()

  return (
    <div className="thin-scroll scroll-shadow-x overflow-x-auto">
      <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[190px] bg-surface px-5 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-ink-400">指標</th>
            {months.map((m) => {
              const locked = isConfirmed(data, accountId, m) || m < '2026-07'
              const on = m === focus
              return (
                <th key={m} className="px-1 py-2">
                  <button onClick={() => m >= '2026-07' && m <= '2026-10' && onFocus(m)} disabled={m < '2026-07' || m > '2026-10'}
                    className={cn('focus-ring relative mx-auto flex w-full flex-col items-center rounded-lg py-1 transition-colors enabled:hover:bg-surface-3', on && 'bg-indigo-50')}>
                    <span className={cn('text-[13px] font-bold', on ? 'text-indigo-700' : 'text-ink-800')}>{fmtMonthShort(m)}</span>
                    <span className="flex h-4 items-center gap-0.5 text-[10px] font-medium text-ink-400">
                      {locked ? <><Lock className="size-2.5" />確定</> : m === '2026-10' ? '集計中' : m.startsWith('2027') ? '次年' : ''}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {KPI_DEFS.map((d, ri) => (
            <tr key={d.key}>
              <th scope="row" className="sticky left-0 z-10 border-t border-line-soft bg-surface px-5 py-2.5 text-left">
                <p className="text-[13px] font-semibold text-ink-900">{d.label}</p>
                <p className="text-2xs font-normal text-ink-400">{d.hint}</p>
              </th>
              {months.map((m, ci) => {
                const k = `${m}|${d.key}`
                const locked = isConfirmed(data, accountId, m) || m < '2026-07'
                const saved = targets[m]?.[d.key]
                const val = draft[k] ?? (saved == null ? '' : String(saved))
                const dirty = draft[k] != null && draft[k] !== (saved == null ? '' : String(saved))
                const bad = invalid.includes(k)
                const act = actual[m]?.[d.key]
                const a = achievement(act, saved)
                return (
                  <td key={m} className={cn('border-t border-line-soft px-1 py-2 align-top', m === focus && 'bg-indigo-50/40')}>
                    <div className="relative">
                      <input
                        ref={(el) => (refs.current[`${ri}-${ci}`] = el)}
                        aria-label={`${fmtMonthShort(m)} ${d.label} の目標`}
                        aria-invalid={bad}
                        inputMode="numeric"
                        readOnly={locked}
                        tabIndex={locked ? -1 : 0}
                        value={dirty || !val ? val : Number(val).toLocaleString('ja-JP')}
                        placeholder={locked ? '' : '未設定'}
                        onChange={(e) => setDraft((x) => ({ ...x, [k]: e.target.value.replace(/,/g, '') }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); move(ri + 1, ci) }
                          if (e.key === 'ArrowUp') { e.preventDefault(); move(ri - 1, ci) }
                          if (e.key === 'Escape') setDraft((x) => { const { [k]: _, ...rest } = x; return rest })
                        }}
                        className={cn('tnum h-9 w-full rounded-[9px] border px-2 text-right text-[13px] outline-none transition-[border-color,box-shadow,background-color] duration-150',
                          locked ? 'cursor-default border-transparent bg-paper-2/70 text-ink-500'
                            : bad ? 'border-err/60 bg-err-bg/50 text-err'
                              : dirty ? 'border-indigo-400 bg-indigo-50 font-bold text-indigo-800 shadow-[0_0_0_3px_rgba(88,98,232,.12)]'
                                : 'border-line bg-white text-ink-900 placeholder:text-[11px] placeholder:text-ink-300 hover:border-line-strong focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(88,98,232,.14)]')}
                      />
                      {dirty && <motion.span layoutId={undefined} initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-indigo-500 ring-2 ring-white" />}
                    </div>
                    {act != null && (
                      <p className={cn('tnum mt-1 text-right text-[10px] leading-3', a == null ? 'text-ink-300' : a >= 1 ? 'text-indigo-600' : 'text-ink-400')}>
                        実 {act >= 10000 ? `${(act / 10000).toFixed(1)}万` : fmt(act)}{a != null && ` ・${Math.round(a * 100)}%`}
                      </p>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="flex items-center gap-1.5 px-5 py-3 text-2xs text-ink-400"><FileSpreadsheet className="size-3" />Enter・↑↓ で上下に移動、Esc で入力を元に戻します。「実」は実績、％は達成率。</p>
    </div>
  )
}
