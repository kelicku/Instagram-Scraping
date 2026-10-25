import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Clock3, CloudDownload, Lock, RefreshCw, RotateCcw, Calculator, Info } from 'lucide-react'
import { Page } from '@/layout/AppShell'
import { useDemo } from '@/store/demo'
import { DataTabs, ScopeBar, useScope } from './scope'
import { monthActual, monthRecords, isConfirmed } from '@/domain/metrics'
import { DEMO_TODAY, fmtDay, fmtMonth, isPastMonth, monthOf, REPORT_MONTHS, weekday } from '@/domain/calendar'
import type { ApiDaily, ManualDaily } from '@/domain/types'
import { CountUp, Denied, Empty, Field, Select, fmt } from '@/ui/bits'
import { PrimaryButton, SecondaryButton } from '@/ui/Button'
import { Pill } from '@/ui/Pill'
import { Confirm } from '@/ui/Dialog'
import { Tip } from '@/ui/Tooltip'
import { toast } from '@/ui/Toast'
import { cn } from '@/ui/cn'

const API_COLS: { key: keyof ApiDaily; label: string }[] = [
  { key: 'followers', label: 'フォロワー数' },
  { key: 'following', label: 'フォロー数' },
  { key: 'mediaCount', label: '累計投稿数' },
  { key: 'posts', label: '投稿数' },
  { key: 'reach', label: 'リーチ' },
  { key: 'impressions', label: '表示回数' },
  { key: 'engagedAccounts', label: 'エンゲージしたアカウント' },
  { key: 'interactions', label: 'インタラクション合計' },
  { key: 'likes', label: 'いいね' },
  { key: 'comments', label: 'コメント' },
  { key: 'saves', label: '保存' },
  { key: 'shares', label: 'シェア' },
  { key: 'linkTaps', label: 'リンクタップ' },
]
const SUM_KEYS = new Set<keyof ApiDaily>(['posts', 'reach', 'impressions', 'engagedAccounts', 'interactions', 'likes', 'comments', 'saves', 'shares', 'linkTaps'])

type Draft = Record<string, string> // `${date}|${key}`

export function MetricsPage() {
  const scope = useScope({ defaultMonth: '2026-09' })
  const { data, client, accounts, account, month, set, denied, focus } = scope
  const saveManual = useDemo((s) => s.saveManual)
  const retryFetch = useDemo((s) => s.retryFetch)
  const confirmMonth = useDemo((s) => s.confirmMonth)
  const [draft, setDraft] = useState<Draft>({})
  const [pending, setPending] = useState<null | (() => void)>(null)
  const [flash, setFlash] = useState<string | null>(focus)
  const [closeOpen, setCloseOpen] = useState(false)
  const accId = account as string
  const acc = data.accounts.find((a) => a.id === accId)
  const rows = useMemo(() => (acc ? monthRecords(data, accId, month) : []), [data, accId, month, acc])
  const summary = acc ? monthActual(data, accId, month) : null
  const confirmed = acc ? isConfirmed(data, accId, month) : false
  const refs = useRef<Record<string, HTMLInputElement | null>>({})
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  useEffect(() => {
    setDraft({})
  }, [accId, month])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => rowRefs.current[flash]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 450)
    const t2 = setTimeout(() => setFlash(null), 3200)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [flash])

  const val = (date: string, key: keyof ManualDaily, saved: number | null) => draft[`${date}|${key}`] ?? (saved == null ? '' : String(saved))
  const dirty = Object.keys(draft).filter((k) => {
    const [date, key] = k.split('|') as [string, keyof ManualDaily]
    const saved = rows.find((r) => r.date === date)?.manual[key]
    return draft[k] !== (saved == null ? '' : String(saved))
  })
  const invalid = dirty.filter((k) => draft[k] !== '' && !/^\d+$/.test(draft[k]))
  const guard = (fn: () => void) => (dirty.length ? setPending(() => fn) : fn())

  const missing = rows.filter((r) => r.date < DEMO_TODAY && (val(r.date, 'newFollows', r.manual.newFollows) === '' || val(r.date, 'unfollows', r.manual.unfollows) === ''))
  const failed = rows.filter((r) => !r.api)
  const nextMissing = () => {
    const r = missing[0]
    if (!r) return
    const k = val(r.date, 'newFollows', r.manual.newFollows) === '' ? 'newFollows' : 'unfollows'
    rowRefs.current[r.date]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setTimeout(() => refs.current[`${r.date}|${k}`]?.focus(), 350)
  }

  const save = async () => {
    await new Promise((r) => setTimeout(r, 700))
    saveManual(accId, dirty.map((k) => {
      const [date, key] = k.split('|') as [string, keyof ManualDaily]
      return { date, key, value: draft[k] === '' ? null : Number(draft[k]) }
    }))
    setDraft({})
    toast.ok(`${dirty.length} 件を保存し、${fmtMonth(month)}の集計を計算し直しました`, confirmed ? '確定済みの月次集計に反映しました' : undefined)
  }

  const crumbs = [{ label: 'データ' }, { label: '手入力指標値' }]
  if (denied) return <Page crumbs={crumbs} title="手入力指標値"><DataTabs /><div className="panel"><Denied /></div></Page>
  if (!client || !acc || !summary) return <Page crumbs={crumbs} title="手入力指標値"><Empty title="担当クライアントがありません" /></Page>

  const inProgress = month === monthOf(DEMO_TODAY)
  const canClose = !confirmed && isPastMonth(month) && !failed.length

  return (
    <Page crumbs={crumbs} title="手入力指標値" subtitle="API で取得できない新規フォロワー数・フォロー解除数を日別に入力します。保存すると月次集計を計算し直します。">
      <DataTabs />
      <ScopeBar trailing={
        <AnimatePresence mode="popLayout">
          <motion.span key={String(confirmed) + month} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            {confirmed ? <Pill tone="info" icon={<Lock className="size-3" />}>確定済み</Pill>
              : inProgress ? <Pill tone="neutral" icon={<Clock3 className="size-3" />}>集計中（{fmtDay('2026-10-22')}まで取得）</Pill>
                : <Pill tone="warn" icon={<AlertTriangle className="size-3" />}>未確定</Pill>}
          </motion.span>
        </AnimatePresence>
      }>
        <Field label="クライアント" className="w-[220px]">
          <Select value={client.id} onChange={(v) => guard(() => set({ client: v, account: null }))} options={scope.clients.map((c) => ({ value: c.id, label: c.name }))} ariaLabel="クライアント" />
        </Field>
        <Field label="アカウント" className="w-[200px]">
          <Select value={accId} onChange={(v) => guard(() => set({ account: v }))} options={accounts.map((a) => ({ value: a.id, label: `@${a.handle}` }))} ariaLabel="アカウント" />
        </Field>
        <Field label="月" className="w-[170px]">
          <Select value={month} onChange={(v) => guard(() => set({ month: v, focus: null }))} options={REPORT_MONTHS.map((m) => ({ value: m, label: fmtMonth(m) }))} ariaLabel="月" />
        </Field>
      </ScopeBar>

      {/* 状態の帯：横長 1 枚に 3 つの観点をまとめる */}
      <section className="panel mb-5 grid divide-y divide-line-soft md:grid-cols-[1fr_1.3fr_1fr] md:divide-x md:divide-y-0">
        <div className="flex items-center gap-4 p-5">
          <span className={cn('grid size-10 place-items-center rounded-xl', failed.length ? 'bg-err-bg text-err' : 'bg-ok-bg text-ok')}>
            {failed.length ? <AlertTriangle className="size-5" /> : <CloudDownload className="size-5" />}
          </span>
          <div>
            <p className="text-xs font-semibold text-ink-500">API 取得</p>
            <p className="mt-0.5 text-[15px] font-bold"><span className="font-display text-2xl">{rows.length - failed.length}</span><span className="text-ink-400"> / {rows.length} 日</span></p>
            <p className="text-2xs text-ink-400">{failed.length ? `${failed.length} 日分が取得できていません` : 'すべて取得済み'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5">
          <span className={cn('grid size-10 place-items-center rounded-xl', missing.length && !inProgress ? 'bg-warn-bg text-warn' : missing.length ? 'bg-paper-2 text-ink-500' : 'bg-ok-bg text-ok')}>
            {missing.length ? <Info className="size-5" /> : <CheckCircle2 className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink-500">手入力</p>
            <p className="mt-0.5 text-[15px] font-bold"><span className="font-display text-2xl">{rows.length - missing.length}</span><span className="text-ink-400"> / {rows.length} 日</span></p>
            <p className="truncate text-2xs text-ink-400">{missing.length ? `未入力：${missing.slice(0, 4).map((r) => fmtDay(r.date)).join('、')}${missing.length > 4 ? ' ほか' : ''}` : 'すべて入力済み'}</p>
          </div>
          {missing.length > 0 && <SecondaryButton size="sm" tone="accent" icon={<ChevronDown className="size-3.5" />} nudge="down" onClick={nextMissing}>次の未入力へ</SecondaryButton>}
        </div>
        <div className="flex items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink-500">月次集計（新規フォロワー／リーチ）</p>
            <p className="mt-1 flex items-baseline gap-3">
              <CountUp value={summary.newFollows} className="font-display text-2xl" />
              <span className="text-ink-300">/</span>
              <CountUp value={summary.values.reach} className="font-display text-2xl" />
            </p>
          </div>
          {canClose && <SecondaryButton size="sm" icon={<Lock className="size-3.5" />} onClick={() => setCloseOpen(true)}>確定する</SecondaryButton>}
        </div>
      </section>

      <section className="panel overflow-hidden" aria-label="日別の指標値">
        <div className="thin-scroll scroll-shadow-x max-h-[calc(100vh-180px)] overflow-auto">
          <table className="w-full min-w-[1500px] border-separate border-spacing-0 text-[13px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-surface text-2xs font-semibold text-ink-500">
                <th className="sticky left-0 z-30 w-[96px] border-b border-line bg-surface px-4 py-2 text-left">日付</th>
                <th colSpan={3} className="border-b border-indigo-100 bg-indigo-50/80 px-2 pb-0 pt-2 text-center text-indigo-700">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 ring-1 ring-indigo-100">手入力</span>
                </th>
                <th className="border-b border-line bg-surface" />
                <th colSpan={API_COLS.length} className="border-b border-line bg-surface px-2 pt-2 text-left text-ink-400">Instagram API から取得</th>
              </tr>
              <tr className="bg-surface text-2xs font-semibold text-ink-500">
                <th className="sticky left-0 z-30 border-b border-line bg-surface px-4 py-2" />
                <th className="w-[96px] border-b border-line bg-indigo-50/80 px-2 py-2 text-right">新規フォロワー数</th>
                <th className="w-[96px] border-b border-line bg-indigo-50/80 px-2 py-2 text-right">フォロー解除数</th>
                <th className="w-[44px] border-b border-line bg-indigo-50/80 px-1 py-2 text-center" title="新規−解除 と増減の一致">整合</th>
                <th className="w-[70px] border-b border-line px-2 py-2 text-right">増減</th>
                {API_COLS.map((c) => <th key={c.key} className="border-b border-line px-2 py-2 text-right leading-tight">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const wd = weekday(r.date)
                const future = r.date > '2026-10-22'
                const nf = val(r.date, 'newFollows', r.manual.newFollows)
                const uf = val(r.date, 'unfollows', r.manual.unfollows)
                const net = nf !== '' && uf !== '' ? Number(nf) - Number(uf) : null
                const consistent = r.api && net != null ? net === r.api.followerDelta : null
                const log = data.fetchLogs[accId]?.[r.date]
                return (
                  <tr key={r.date} ref={(el) => (rowRefs.current[r.date] = el)}
                    className={cn('group transition-colors', flash === r.date ? 'bg-indigo-50' : !r.api && !future ? 'bg-err-bg/40' : 'hover:bg-surface-2')}>
                    <td className={cn('sticky left-0 z-10 border-b border-line-soft px-4 py-1.5 font-medium transition-colors',
                      flash === r.date ? 'bg-indigo-50' : !r.api && !future ? 'bg-[#FDF3F1]' : 'bg-surface group-hover:bg-surface-2',
                      wd === 0 ? 'text-err' : wd === 6 ? 'text-sky-600' : 'text-ink-800')}>
                      {fmtDay(r.date)}
                    </td>
                    {(['newFollows', 'unfollows'] as const).map((k) => {
                      const key = `${r.date}|${k}`
                      const v = val(r.date, k, r.manual[k])
                      const isDirty = draft[key] != null && draft[key] !== (r.manual[k] == null ? '' : String(r.manual[k]))
                      const bad = invalid.includes(key)
                      const empty = v === '' && !future
                      return (
                        <td key={k} className="border-b border-line-soft bg-indigo-50/30 px-1.5 py-1">
                          <input ref={(el) => (refs.current[key] = el)} aria-label={`${fmtDay(r.date)} ${k === 'newFollows' ? '新規フォロワー数' : 'フォロー解除数'}`}
                            inputMode="numeric" value={v} disabled={future} placeholder={empty ? '未入力' : ''} aria-invalid={bad}
                            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value.trim() }))}
                            onKeyDown={(e) => {
                              const i = rows.findIndex((x) => x.date === r.date)
                              const go = (j: number) => { const t = rows[j]; if (t) { e.preventDefault(); refs.current[`${t.date}|${k}`]?.focus() } }
                              if (e.key === 'Enter' || e.key === 'ArrowDown') go(i + 1)
                              if (e.key === 'ArrowUp') go(i - 1)
                            }}
                            className={cn('tnum h-8 w-full rounded-[8px] border px-2 text-right outline-none transition-[border-color,box-shadow,background-color] duration-150',
                              bad ? 'border-err/60 bg-err-bg text-err'
                                : isDirty ? 'border-indigo-400 bg-white font-bold text-indigo-800 shadow-[0_0_0_3px_rgba(88,98,232,.14)]'
                                  : empty ? 'border-dashed border-[#E2B66B] bg-warn-bg/50 placeholder:text-[11px] placeholder:font-medium placeholder:text-warn'
                                    : 'border-line bg-white hover:border-line-strong focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(88,98,232,.14)] disabled:border-transparent disabled:bg-transparent')} />
                        </td>
                      )
                    })}
                    <td className="border-b border-line-soft bg-indigo-50/30 text-center">
                      {consistent == null ? <span className="text-ink-200">·</span> : consistent ? (
                        <Check className="mx-auto size-3.5 text-ok" aria-label="一致" />
                      ) : (
                        <Tip label={`新規−解除＝${net}、API の増減＝${r.api!.followerDelta}`}><span className="inline-grid"><AlertTriangle className="mx-auto size-3.5 text-warn" aria-label="不一致" /></span></Tip>
                      )}
                    </td>
                    {r.api ? (
                      <>
                        <td className={cn('tnum border-b border-line-soft px-2 text-right', r.api.followerDelta > 0 ? 'text-ok' : r.api.followerDelta < 0 ? 'text-err' : 'text-ink-400')}>
                          {r.api.followerDelta > 0 ? '+' : ''}{r.api.followerDelta}
                        </td>
                        {API_COLS.map((c) => <td key={c.key} className="tnum border-b border-line-soft px-2 text-right text-ink-700">{fmt(r.api![c.key])}</td>)}
                      </>
                    ) : future ? (
                      <td colSpan={API_COLS.length + 1} className="border-b border-line-soft px-3 text-xs text-ink-300">翌日 4 時に取得予定</td>
                    ) : (
                      <td colSpan={API_COLS.length + 1} className="border-b border-line-soft px-3 py-1.5">
                        <FailedRow message={log?.message ?? '取得できませんでした'} status={log?.status === 'not_run' ? '未実行' : '取得失敗'} at={log?.at}
                          onRetry={async () => { await retryFetch(accId, r.date); toast.ok(`${fmtDay(r.date)}のデータを再取得しました`, `@${acc.handle}`) }} />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-20">
              <tr className="bg-ink-950 text-xs font-semibold text-white">
                <td className="sticky left-0 z-30 bg-ink-950 px-4 py-2.5">月合計</td>
                <td className="tnum bg-ink-900 px-3 text-right">{fmt(summary.newFollows)}</td>
                <td className="tnum bg-ink-900 px-3 text-right">{fmt(summary.unfollows)}</td>
                <td className="bg-ink-900" />
                <td className="tnum px-2 text-right">{fmt(rows.reduce((s, r) => s + (r.api?.followerDelta ?? 0), 0))}</td>
                {API_COLS.map((c) => (
                  <td key={c.key} className="tnum px-2 text-right text-white/85">
                    {SUM_KEYS.has(c.key) ? fmt(rows.reduce((s, r) => s + (r.api?.[c.key] ?? 0), 0)) : c.key === 'followers' ? fmt(summary.values.followers) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <AnimatePresence>
          {dirty.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-indigo-100 bg-indigo-50/60 px-5 py-3">
                <span className="mr-auto text-[13px] text-ink-700"><b className="tnum">{dirty.length}</b> 件の値を変更{invalid.length > 0 && <span className="ml-1 text-xs font-medium text-err">・{invalid.length} 件は 0 以上の整数で入力してください</span>}</span>
                <SecondaryButton icon={<RotateCcw className="size-3.5" />} nudge="spin" onClick={() => setDraft({})}>取り消す</SecondaryButton>
                <PrimaryButton icon={<Calculator className="size-4" />} onClick={save} disabled={invalid.length > 0} disabledReason="入力エラーを直してください"
                  loadingLabel="計算し直しています…" successLabel="再計算しました">保存して計算し直す</PrimaryButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <Confirm open={!!pending} onOpenChange={(v) => !v && setPending(null)} title="保存していない変更があります" description="切り替えると、入力した値は破棄されます。"
        confirmLabel="破棄して切り替える" tone="danger" onConfirm={() => { pending?.(); setDraft({}); setPending(null) }} />
      <Confirm open={closeOpen} onOpenChange={setCloseOpen} title={`${fmtMonth(month)}の集計を確定しますか？`} icon={<Lock className="size-4" />}
        description="確定すると KPI 目標は編集できなくなり、月次レポートを生成できるようになります。本番では締め日のバッチで自動確定します。"
        confirmLabel="確定する" onConfirm={async () => { await new Promise((r) => setTimeout(r, 500)); confirmMonth(accId, month); toast.ok(`${fmtMonth(month)}の集計を確定しました`, `@${acc.handle}`) }} />
    </Page>
  )
}

function FailedRow({ message, status, at, onRetry }: { message: string; status: string; at?: string; onRetry: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex items-center gap-3 text-xs">
      <Pill tone={status === '未実行' ? 'neutral' : 'err'} size="sm" icon={status === '未実行' ? <Clock3 className="size-3" /> : <AlertTriangle className="size-3" />}>{status}</Pill>
      <span className="text-err">{message}</span>
      {at && <span className="text-ink-400">{at} 実行</span>}
      <SecondaryButton size="sm" className="ml-auto" icon={<RefreshCw className={cn('size-3.5', busy && 'animate-spin')} />} nudge="spin"
        onClick={async () => { setBusy(true); try { await onRetry() } finally { setBusy(false) } }} loadingLabel="再取得中…">
        再取得
      </SecondaryButton>
    </div>
  )
}

