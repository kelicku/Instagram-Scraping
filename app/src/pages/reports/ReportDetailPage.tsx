import { useRef, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle, BadgeCheck, Check, CheckCircle2, Download, FileUp, FileText, Info, Send, Undo2, Upload, Wand2, XOctagon, Hourglass, ShieldCheck, ArrowUpRight,
} from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Page } from '@/layout/AppShell'
import { useDemo, useMe, userName } from '@/store/demo'
import { achievement, canGenerate, delta, monthActual, reportChecks, trend, visibleAccountIds } from '@/domain/metrics'
import { CATEGORY, KPI_DEFS, SUBMIT_METHODS } from '@/domain/labels'
import { DEMO_TODAY, addMonths, fmtDay, fmtMonth, fmtMonthShort, fmtStamp, fmtStampFull } from '@/domain/calendar'
import type { CheckItem, Report, ReportEvent, ReportStatus } from '@/domain/types'
import { gate, LIFECYCLE, parseReportId } from '@/domain/workflow'
import { AchBar, CountUp, Denied, Empty, Field, Select, fmt, fmtPct, stagger } from '@/ui/bits'
import { CheckPill, ReportPill } from '@/ui/Pill'
import { IconButton, LinkButton, SecondaryButton, StatusButton } from '@/ui/Button'
import { Confirm } from '@/ui/Dialog'
import { toast } from '@/ui/Toast'
import { cn } from '@/ui/cn'
import { GenerateButton, GenerationSteps } from './GenerateButton'
import { Link } from 'react-router-dom'

export function ReportDetailPage() {
  const { id = '' } = useParams()
  const data = useDemo((s) => s.data)
  const me = useMe()!
  const parsed = parseReportId(id)
  const acc = parsed && data.accounts.find((a) => a.id === parsed.accountId)
  const crumbs = [{ label: 'レポート', to: '/reports' }, { label: acc ? `@${acc.handle} ${fmtMonth(parsed!.month)}` : 'レポート詳細' }]
  if (!parsed || !acc) return <Page crumbs={crumbs} title="レポート"><div className="panel"><Empty title="レポートが見つかりません" /></div></Page>
  if (!visibleAccountIds(data, me).has(acc.id)) return <Page crumbs={crumbs} title={`@${acc.handle}`}><div className="panel"><Denied /></div></Page>
  return <Detail accountId={acc.id} month={parsed.month} crumbs={crumbs} />
}

function Detail({ accountId, month, crumbs }: { accountId: string; month: string; crumbs: { label: string; to?: string }[] }) {
  const data = useDemo((s) => s.data)
  const progress = useDemo((s) => s.progress[`r-${accountId}-${month}`])
  const store = useDemo()
  const me = useMe()!
  const acc = data.accounts.find((a) => a.id === accountId)!
  const client = data.clients.find((c) => c.id === acc.clientId)!
  const report = data.reports.find((r) => r.accountId === accountId && r.month === month)
  const status: ReportStatus = progress ? 'generating' : report?.status ?? 'not_generated'
  const latest = report?.versions.at(-1)
  const ctx = { canGenerate: canGenerate(data, accountId, month), hasFile: !!latest, isOwner: client.aeId === me.id }
  const g = (a: Parameters<typeof gate>[0]) => gate(a, status, me, ctx)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<null | 'request' | 'approve' | 'reject'>(null)
  const [comment, setComment] = useState('')
  const [celebrate, setCelebrate] = useState(false)
  const dataChecks = reportChecks(data, accountId, month)
  const fileChecks = latest?.checks ?? []
  const blocking = [...dataChecks, ...fileChecks].filter((c) => c.level === 'error')

  const lastRequest = report?.events.filter((e) => e.type === 'request').at(-1)
  const lastApprove = report?.events.filter((e) => e.type === 'approve').at(-1)

  const onUpload = async (f: File) => {
    const res = await store.uploadRevision(report!.id, f)
    if (!res.ok) {
      toast.err('ファイルを取り込めませんでした', res.checks[0]?.title)
      return
    }
    const bad = res.checks.filter((c) => c.level !== 'ok')
    if (bad.length) toast.info(`修正版を版 ${report!.versions.length + 1} として保存しました`, `確認事項 ${bad.length} 件：${bad[0].title}`)
    else toast.ok(`修正版を版 ${report!.versions.length + 1} として保存しました`, '自動チェックはすべて OK です')
  }

  const actions = (
    <>
      {g('download') && (
        <SecondaryButton icon={<Download className="size-4" />} nudge="down" onClick={async () => { await store.download(report!.id); toast.ok('PowerPoint をダウンロードしました', latest!.fileName) }}
          loadingLabel="準備中…" successLabel="ダウンロード済み">ダウンロード</SecondaryButton>
      )}
      {g('upload') && (
        <SecondaryButton icon={<Upload className="size-4" />} nudge="up" onClick={() => fileInput.current?.click()} disabled={!g('upload')!.allowed} disabledReason={g('upload')!.reason}>
          修正版で差し替え
        </SecondaryButton>
      )}
      {g('reject') && <StatusButton tone="reject" icon={<Undo2 className="size-3.5" />} onClick={() => setDialog('reject')} disabled={!g('reject')!.allowed} disabledReason={g('reject')!.reason}>差し戻す</StatusButton>}
      {g('approve') && <StatusButton tone="approve" icon={<Check className="size-3.5" />} onClick={() => setDialog('approve')} disabled={!g('approve')!.allowed} disabledReason={g('approve')!.reason}>承認する</StatusButton>}
      {g('request') && <StatusButton tone="request" icon={<Send className="size-3.5" />} onClick={() => setDialog('request')} disabled={!g('request')!.allowed} disabledReason={g('request')!.reason}>承認を依頼</StatusButton>}
      <input ref={fileInput} type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
    </>
  )

  return (
    <Page crumbs={crumbs} wide title={
      <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span><span className="block text-xs font-semibold tracking-normal text-ink-400">{client.name}</span>@{acc.handle}<span className="ml-3 font-display text-[34px] font-normal text-ink-500">{fmtMonth(month)}</span></span>
        <span className="relative">
          <ReportPill status={status} />
          <AnimatePresence>
            {celebrate && (
              <motion.span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-iris-400" initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }} onAnimationComplete={() => setCelebrate(false)} />
            )}
          </AnimatePresence>
        </span>
      </span>
    }
      subtitle={
        status === 'pending' && lastRequest ? `依頼：${userName(data, lastRequest.by)}　${fmtStamp(lastRequest.at)}`
          : (status === 'approved' || status === 'submitted') && lastApprove ? `承認：${userName(data, lastApprove.by)}　${fmtStamp(lastApprove.at)}`
            : `担当AE：${userName(data, client.aeId)}　PM：${userName(data, client.pmId)}`
      }
      actions={actions}
    >
      <Lifecycle report={report} status={status} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <ActionPanel status={status} report={report} accountId={accountId} month={month} me={me} gateSubmit={g('submit')}
            comment={comment} setComment={setComment} onReject={() => setDialog('reject')} onApprove={() => setDialog('approve')} onUpload={() => fileInput.current?.click()} onRequest={() => setDialog('request')} canGen={g('generate')} />
          <KpiSummary accountId={accountId} month={month} />
          <TrendCharts accountId={accountId} month={month} />
          <Initiatives accountId={accountId} month={month} clientId={client.id} />
        </div>
        <aside className="space-y-5 xl:sticky xl:top-20">
          <GenerationState report={report} status={status} canGen={g('generate')} accountId={accountId} month={month} />
          <Checks data={dataChecks} file={fileChecks} fileNo={latest?.no} />
          {report && report.versions.length > 0 && <Versions report={report} />}
          {report && report.events.length > 0 && <History events={report.events} />}
        </aside>
      </div>

      {/* 確認ダイアログ */}
      <Confirm open={dialog === 'request'} onOpenChange={(v) => !v && setDialog(null)} tone="request" icon={<Send className="size-4" />}
        title="承認を依頼しますか？" description={`版 ${latest?.no ?? '—'}（${latest?.fileName ?? ''}）を PM に送ります。`}
        confirmLabel="承認を依頼" onConfirm={async () => { await wait(500); store.requestApproval(report!.id); toast.ok('承認を依頼しました', `${userName(data, client.pmId)}（PM）に通知されます（本番実装）`) }}>
        {blocking.length > 0 && (
          <div className="mb-2 rounded-xl border border-warn-line bg-warn-bg/70 p-3 text-xs text-warn">
            <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="size-3.5" />要修正のチェック結果が {blocking.length} 件あります</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">{blocking.map((c) => <li key={c.id + c.title}>{c.title}{c.detail ? `：${c.detail}` : ''}</li>)}</ul>
            <p className="mt-1.5">このまま依頼することもできます。</p>
          </div>
        )}
      </Confirm>
      <Confirm open={dialog === 'approve'} onOpenChange={(v) => !v && setDialog(null)} tone="approve" icon={<BadgeCheck className="size-4" />}
        title="このレポートを承認しますか？" description={`版 ${latest?.no} を承認します。承認後、担当AEが提出を記録できるようになります。`}
        confirmLabel="承認する" onConfirm={async () => {
          await wait(600); store.approve(report!.id, comment); setComment(''); setCelebrate(true)
          toast.ok('承認しました', `@${acc.handle} ${fmtMonth(month)}・担当AEに通知されます（本番実装）`)
        }} />
      <Confirm open={dialog === 'reject'} onOpenChange={(v) => !v && setDialog(null)} tone="danger" icon={<Undo2 className="size-4" />}
        title="差し戻しますか？" description="コメントと自動チェックの結果が担当AEに表示されます。" confirmLabel="差し戻す" confirmDisabled={!comment.trim()}
        onConfirm={async () => { await wait(500); store.reject(report!.id, comment.trim()); setComment(''); toast.ok('差し戻しました', '担当AEが修正して再依頼します') }}>
        <Field label="差し戻しの理由" htmlFor="rej" required error={!comment.trim() ? '理由を入力してください' : ''}>
          <textarea id="rej" rows={4} className="field h-auto resize-none py-2.5 leading-6" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="例：所見が枠からはみ出しています。" />
        </Field>
      </Confirm>
    </Page>
  )
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ */

function Lifecycle({ report, status }: { report?: Report; status: ReportStatus }) {
  const rejected = status === 'rejected'
  const currentIdx = LIFECYCLE.findIndex((s) => !s.done(report))
  return (
    <ol className="mb-6 grid grid-cols-2 gap-0 rounded-panel bg-surface p-1.5 shadow-card md:grid-cols-4" aria-label="進行状況">
      {LIFECYCLE.map((s, i) => {
        const done = s.done(report)
        const current = i === currentIdx
        return (
          <li key={s.key} className={cn('relative flex items-center gap-3 rounded-[14px] px-4 py-3', current && 'bg-indigo-50/70')}>
            <span className={cn('relative grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors duration-500',
              done ? 'bg-indigo-600 text-white' : current ? (rejected && i === 1 ? 'bg-err text-white' : 'bg-white text-indigo-700 ring-2 ring-indigo-400') : 'bg-paper-2 text-ink-400')}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={String(done)} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
                  {done ? <Check className="size-4" /> : rejected && i === 1 && current ? <Undo2 className="size-3.5" /> : i + 1}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="min-w-0">
              <span className={cn('block text-[13px] font-bold', done || current ? 'text-ink-900' : 'text-ink-400')}>{s.label}</span>
              <span className="block truncate text-2xs text-ink-400">
                {done ? '完了' : current ? (rejected && i === 1 ? '差し戻し・再依頼待ち' : '次の工程') : '未着手'}
              </span>
            </span>
            {i < LIFECYCLE.length - 1 && (
              <span className="absolute -right-2 top-1/2 z-10 hidden h-px w-4 -translate-y-1/2 bg-line-strong md:block" aria-hidden>
                <motion.span className="block h-full bg-indigo-500" initial={false} animate={{ width: done ? '100%' : '0%' }} transition={{ duration: 0.5 }} />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------ */
/* 状態に応じた操作パネル                                                  */
/* ------------------------------------------------------------------ */

function ActionPanel(p: {
  status: ReportStatus; report?: Report; accountId: string; month: string; me: { role: string }; gateSubmit: ReturnType<typeof gate>
  comment: string; setComment: (v: string) => void; onReject: () => void; onApprove: () => void; onUpload: () => void; onRequest: () => void
  canGen: ReturnType<typeof gate>
}) {
  const data = useDemo((s) => s.data)
  const { status, report } = p
  const wrap = (key: string, children: ReactNode, cls = '') => (
    <AnimatePresence mode="wait">
      <motion.section key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28 }} className={cn('panel relative overflow-hidden p-5', cls)}>
        {children}
      </motion.section>
    </AnimatePresence>
  )

  if (status === 'generating')
    return wrap('gen', <>
      <h2 className="mb-1 flex items-center gap-2 text-[15px] font-bold"><Wand2 className="size-4 text-indigo-600" />レポートを生成しています</h2>
      <p className="mb-5 text-xs text-ink-500">非同期処理を模しています。完了まで数秒お待ちください。画面を移動しても処理は続きます。</p>
      <GenerationSteps reportId={`r-${p.accountId}-${p.month}`} />
    </>, 'ring-1 ring-indigo-200')

  if (status === 'not_generated' || status === 'failed')
    return wrap(status, <>
      <div className="pointer-events-none absolute -right-10 -top-16 size-60 rounded-full bg-indigo-400/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center gap-5">
        <span className={cn('grid size-12 place-items-center rounded-2xl', status === 'failed' ? 'bg-err-bg text-err' : 'bg-indigo-50 text-indigo-600')}>
          {status === 'failed' ? <XOctagon className="size-6" /> : <FileText className="size-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold">{status === 'failed' ? '生成に失敗しました' : 'まだ生成されていません'}</h2>
          <p className="mt-0.5 text-[13px] text-ink-500">
            {status === 'failed' ? report?.generationError : p.canGen?.allowed ? '7 枚構成の PowerPoint（表紙・KPI サマリー・月次推移・日次推移・施策履歴・所見・次月目標）を作成します。' : p.canGen?.reason}
          </p>
        </div>
        {p.canGen && <GenerateButton accountId={p.accountId} month={p.month} retry={status === 'failed'} size="lg" disabledReason={p.canGen.allowed ? undefined : p.canGen.reason} />}
      </div>
    </>, status === 'failed' ? 'ring-1 ring-err-line' : '')

  if (status === 'draft')
    return wrap('draft', <>
      <h2 className="text-[15px] font-bold">次の手順</h2>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { n: 1, t: 'ダウンロード', d: 'PowerPoint を開き、所見欄（6 枚目）を記入します。', icon: <Download className="size-4" /> },
          { n: 2, t: '修正版で差し替え', d: '編集したファイルをアップロードすると新しい版として保存され、自動チェックが走ります。', icon: <FileUp className="size-4" />, act: p.onUpload },
          { n: 3, t: '承認を依頼', d: 'PM に承認を依頼します。差し戻されたら修正して再依頼します。', icon: <Send className="size-4" />, act: p.onRequest },
        ].map((s) => (
          <li key={s.n} className="rounded-2xl border border-line-soft bg-surface-2 p-4">
            <p className="flex items-center gap-2 text-[13px] font-bold"><span className="font-display text-2xl font-normal text-indigo-500">{s.n}</span>{s.t}</p>
            <p className="mt-1.5 text-xs leading-5 text-ink-500">{s.d}</p>
            {s.act && p.me.role === 'AE' && <LinkButton className="mt-2" onClick={s.act} icon={<ArrowUpRight className="size-3" />}>{s.t}</LinkButton>}
          </li>
        ))}
      </ol>
    </>)

  if (status === 'pending')
    return wrap('pending', p.me.role === 'PM' ? <>
      <h2 className="flex items-center gap-2 text-[15px] font-bold"><Hourglass className="size-4 text-sky-600" />承認の判断</h2>
      <p className="mt-0.5 text-xs text-ink-500">内容を確認し、承認または差し戻してください。差し戻すときは理由が必要です。</p>
      <Field label="コメント" htmlFor="pm-comment" className="mt-4" hint="承認時は任意・差し戻し時は必須">
        <textarea id="pm-comment" rows={3} className="field h-auto resize-none py-2.5 leading-6" placeholder="差し戻すときは理由を入力" value={p.comment} onChange={(e) => p.setComment(e.target.value)} />
      </Field>
      <div className="mt-3 flex justify-end gap-2">
        <StatusButton tone="reject" icon={<Undo2 className="size-3.5" />} onClick={p.onReject}>差し戻す</StatusButton>
        <StatusButton tone="approve" icon={<Check className="size-3.5" />} onClick={p.onApprove}>承認する</StatusButton>
      </div>
    </> : <>
      <div className="flex items-center gap-4">
        <span className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-sky-600"><Hourglass className="size-5" /></span>
        <div>
          <h2 className="text-[15px] font-bold">PM の承認を待っています</h2>
          <p className="text-xs text-ink-500">承認されると、提出の記録ができるようになります。</p>
        </div>
      </div>
    </>)

  if (status === 'rejected' && report?.rejection)
    return wrap('rejected', <>
      <span className="absolute inset-y-0 left-0 w-1 bg-err" />
      <p className="flex flex-wrap items-baseline gap-x-3 text-sm">
        <span className="flex items-center gap-1.5 font-bold text-err"><Undo2 className="size-4" />差し戻し</span>
        <span className="text-xs text-ink-500">{userName(data, report.rejection.by)}（PM）　{fmtStamp(report.rejection.at)}</span>
      </p>
      <p className="mt-2 text-[13.5px] leading-6 text-ink-800">{report.rejection.comment}</p>
      {report.rejection.checks.length > 0 && (
        <div className="mt-4 border-t border-line-soft pt-3">
          <p className="text-xs font-bold text-err">チェック結果　{report.rejection.checks.length} 件</p>
          <ul className="mt-1.5 space-y-1">
            {report.rejection.checks.map((c) => <li key={c} className="flex gap-2 text-[13px] text-ink-700"><span className="mt-2 size-1 shrink-0 rounded-full bg-ink-400" />{c}</li>)}
          </ul>
        </div>
      )}
      {p.me.role === 'AE' && (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-3 px-3 py-2 text-xs text-ink-600">
          修正の流れ：
          <Link className="focus-ring rounded font-semibold text-indigo-600 hover:underline" to={`/data/metrics?client=${data.accounts.find((a) => a.id === p.accountId)!.clientId}&account=${p.accountId}&month=${p.month}`}>手入力指標値を直す</Link>
          → <button className="focus-ring rounded font-semibold text-indigo-600 hover:underline" onClick={p.onUpload}>修正版で差し替え</button>
          → <button className="focus-ring rounded font-semibold text-indigo-600 hover:underline" onClick={p.onRequest}>承認を再依頼</button>
        </p>
      )}
    </>, 'pl-6')

  if (status === 'approved' && !p.gateSubmit?.allowed) {
    const ap = report?.events.filter((e) => e.type === 'approve').at(-1)
    return wrap('approved-info', <>
      <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-iris-400/15 blur-2xl" />
      <div className="relative flex flex-wrap items-center gap-4">
        <span className="relative grid size-12 place-items-center">
          <motion.span className="absolute inset-0 rounded-2xl bg-iris-400/40" initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1, ease: 'easeOut' }} />
          <motion.span initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 15 }}
            className="relative grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-iris-500 to-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(106,85,200,.8)]"><BadgeCheck className="size-6" /></motion.span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold">承認済みです</h2>
          <p className="text-xs text-ink-500">{ap ? `${userName(data, ap.by)}　${fmtStamp(ap.at)}` : ''}　次は担当AEが提出を記録します。</p>
          {ap?.comment && <p className="mt-2 rounded-lg bg-surface-3 px-3 py-1.5 text-xs text-ink-700">{ap.comment}</p>}
        </div>
      </div>
    </>)
  }
  if (status === 'approved') return wrap('approved', <SubmitForm gateSubmit={p.gateSubmit} reportId={report!.id} />)

  if (status === 'submitted' && report?.submission) {
    const s = report.submission
    return wrap('submitted', <>
      <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-emerald-300/15 blur-2xl" />
      <div className="relative flex flex-wrap items-center gap-4">
        <motion.span initial={{ scale: 0.6, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          className="grid size-12 place-items-center rounded-2xl bg-ok text-white shadow-[0_8px_20px_-8px_rgba(30,127,85,.7)]"><Send className="size-5" /></motion.span>
        <div>
          <h2 className="text-[15px] font-bold">提出済み</h2>
          <p className="text-xs text-ink-500">記録者：{userName(data, s.by)}　{fmtStampFull(s.recordedAt)}</p>
        </div>
      </div>
      <dl className="relative mt-4 grid gap-3 sm:grid-cols-4">
        {[['提出日時', fmtStampFull(s.at)], ['提出方法', s.method], ['提出先', s.to], ['備考', s.note || '—']].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-3 px-3 py-2"><dt className="text-2xs text-ink-400">{k}</dt><dd className="mt-0.5 text-[13px] font-semibold">{v}</dd></div>
        ))}
      </dl>
    </>)
  }
  return null
}

function SubmitForm({ gateSubmit, reportId }: { gateSubmit: ReturnType<typeof gate>; reportId: string }) {
  const store = useDemo()
  const r = store.data.reports.find((x) => x.id === reportId)!
  const client = store.data.clients.find((c) => c.accountIds.includes(r.accountId))!
  const [f, setF] = useState({ at: `${DEMO_TODAY}T10:30`, method: 'メール', to: `${client.name} ご担当者様`, note: '' })
  const [touched, setTouched] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const err = { at: !f.at ? '提出日時を入力してください' : '', to: !f.to.trim() ? '提出先を入力してください' : '' }
  const allowed = gateSubmit?.allowed
  return (
    <>
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold">提出の記録</h2>
        <span className="text-2xs text-ink-400">メールは送信されません。提出した事実のみを記録します。</span>
      </div>
      {!allowed && <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500"><ShieldCheck className="size-3.5" />{gateSubmit?.reason}</p>}
      <fieldset disabled={!allowed} className="mt-4 grid gap-4 disabled:opacity-60 md:grid-cols-3">
        <Field label="提出日時" htmlFor="s-at" required error={touched ? err.at : ''}>
          <input id="s-at" type="datetime-local" className="field" value={f.at} onChange={(e) => setF({ ...f, at: e.target.value })} />
        </Field>
        <Field label="提出方法" htmlFor="s-m">
          <Select id="s-m" value={f.method} onChange={(v) => setF({ ...f, method: v })} options={SUBMIT_METHODS.map((m) => ({ value: m, label: m }))} />
        </Field>
        <Field label="提出先" htmlFor="s-to" required error={touched ? err.to : ''}>
          <input id="s-to" className="field" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-invalid={touched && !!err.to} />
        </Field>
        <Field label="備考" htmlFor="s-note" className="md:col-span-3">
          <input id="s-note" className="field" value={f.note} placeholder="例：10/24 の定例で説明予定" onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
      </fieldset>
      <div className="mt-4 flex justify-end">
        <StatusButton tone="submit" icon={<Send className="size-3.5" />} disabled={!allowed} disabledReason={gateSubmit?.reason}
          onClick={() => { setTouched(true); if (!err.at && !err.to) setConfirm(true) }}>提出を記録</StatusButton>
      </div>
      <Confirm open={confirm} onOpenChange={setConfirm} tone="submit" icon={<Send className="size-4" />} title="提出済みとして記録しますか？"
        description={`${f.at.replace('T', ' ')}・${f.method}・${f.to}`} confirmLabel="記録する"
        onConfirm={async () => { await wait(500); store.recordSubmission(reportId, f); toast.ok('提出を記録しました', 'このレポートの作業は完了です') }} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* 内容プレビュー                                                         */
/* ------------------------------------------------------------------ */

function KpiSummary({ accountId, month }: { accountId: string; month: string }) {
  const data = useDemo((s) => s.data)
  const cur = monthActual(data, accountId, month)
  const prev = monthActual(data, accountId, addMonths(month, -1))
  const t = data.targets[accountId]?.[month] ?? {}
  const [hero, ...rest] = KPI_DEFS
  const hA = achievement(cur.values[hero.key], t[hero.key])
  const hD = delta(cur.values[hero.key], prev.values[hero.key])
  return (
    <section className="panel overflow-hidden" aria-label="KPI サマリー">
      <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3">
        <h2 className="text-[15px] font-bold">KPI サマリー</h2>
        <span className="text-xs text-ink-400">{fmtMonth(month)}・レポート 2 枚目</span>
      </div>
      <motion.div className="grid md:grid-cols-[1fr_2fr]" variants={stagger.container} initial="hidden" animate="show">
        <motion.div variants={stagger.item} className="border-b border-line-soft bg-surface-2 p-5 md:border-b-0 md:border-r">
          <p className="text-xs font-semibold text-ink-500">{hero.label}<span className="ml-1 font-normal text-ink-400">{hero.hint}</span></p>
          <CountUp value={cur.values[hero.key]} className="mt-2 block font-display text-[52px] leading-none text-ink-950" />
          <p className={cn('tnum mt-2 text-xs font-semibold', hD == null ? 'text-ink-400' : hD >= 0 ? 'text-ok' : 'text-err')}>前月比 {hD == null ? '—' : `${hD >= 0 ? '▲' : '▼'} ${Math.abs(hD * 100).toFixed(1)}%`}</p>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-2xs text-ink-500"><span>目標 {fmt(t[hero.key])}</span><b className="tnum text-indigo-700">{fmtPct(hA)}</b></div>
            <AchBar ratio={hA} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white px-3 py-2 shadow-hair"><p className="text-2xs text-ink-400">新規フォロワー</p><p className="tnum font-display text-xl">{fmt(cur.newFollows)}</p></div>
            <div className="rounded-xl bg-white px-3 py-2 shadow-hair"><p className="text-2xs text-ink-400">フォロー解除</p><p className="tnum font-display text-xl">{fmt(cur.unfollows)}</p></div>
          </div>
        </motion.div>
        <div className="grid sm:grid-cols-2">
          {rest.map((d, i) => {
            const a = achievement(cur.values[d.key], t[d.key])
            const dl = delta(cur.values[d.key], prev.values[d.key])
            return (
              <motion.div key={d.key} variants={stagger.item} className={cn('border-line-soft p-4', i % 2 === 0 && 'sm:border-r', i < rest.length - 1 && 'border-b')}>
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-semibold text-ink-600">{d.label}</p>
                  <p className={cn('tnum text-2xs font-semibold', dl == null ? 'text-ink-300' : dl >= 0 ? 'text-ok' : 'text-err')}>{dl == null ? '—' : `${dl >= 0 ? '▲' : '▼'} ${Math.abs(dl * 100).toFixed(1)}%`}</p>
                </div>
                <CountUp value={cur.values[d.key]} className="mt-1 block font-display text-[28px] leading-none text-ink-950" />
                <div className="mt-2.5 flex items-center gap-2">
                  <AchBar ratio={a} className="flex-1" />
                  <span className={cn('tnum w-10 text-right text-2xs font-bold', a != null && a >= 1 ? 'text-indigo-600' : 'text-ink-600')}>{fmtPct(a)}</span>
                </div>
              </motion.div>
            )
          })}
          <motion.div variants={stagger.item} className="flex flex-col justify-between bg-surface-2 p-4">
            <p className="text-xs font-semibold text-ink-600">投稿数<span className="ml-1 font-normal text-ink-400">目標なし</span></p>
            <CountUp value={cur.posts} className="mt-1 block font-display text-[28px] leading-none text-ink-950" />
            <p className="mt-2 text-2xs text-ink-400">前月 {fmt(prev.posts)} 件・フィードとリール</p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-ink-900 px-3 py-2 text-xs text-white shadow-float">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className={cn('h-0.5 w-3 rounded', p.dataKey === 'target' ? 'border-t-2 border-dashed border-ink-300 bg-transparent' : 'bg-indigo-300')} />
          <span className="text-white/70">{p.name}</span><span className="tnum ml-auto pl-3 font-semibold">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

function TrendCharts({ accountId, month }: { accountId: string; month: string }) {
  const data = useDemo((s) => s.data)
  const tr = trend(data, accountId, month)
  const series = (key: 'reach' | 'followers') => tr.map((t) => ({ m: fmtMonthShort(t.month), actual: t.actual[key], target: t.target[key] ?? null }))
  const axis = { tick: { fontSize: 11, fill: '#9095AE' }, axisLine: false, tickLine: false }
  const Legend = () => (
    <div className="flex items-center gap-4 text-2xs text-ink-500">
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-indigo-600" />実績</span>
      <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-[#8A8FA8]" />目標</span>
    </div>
  )
  const f = series('followers')
  const fv = f.flatMap((x) => [x.actual ?? 0, x.target ?? 0]).filter(Boolean)
  return (
    <section className="panel overflow-hidden" aria-label="月次推移">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft px-5 py-3">
        <h2 className="text-[15px] font-bold">月次推移</h2>
        <span className="text-xs text-ink-400">直近 3 か月・レポート 3 枚目（PowerPoint では編集可能なグラフ）</span>
        <span className="ml-auto"><Legend /></span>
      </div>
      <div className="grid md:grid-cols-2 md:divide-x md:divide-line-soft">
        <figure className="p-4">
          <figcaption className="mb-2 text-xs font-semibold text-ink-600">リーチ（月間合計）</figcaption>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <ComposedChart data={series('reach')} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEECE6" />
                <XAxis dataKey="m" {...axis} />
                <YAxis {...axis} width={52} tickFormatter={(v) => (v >= 10000 ? `${v / 10000}万` : fmt(v))} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(67,75,207,.06)' }} />
                <Bar dataKey="actual" name="実績" fill="#434BCF" radius={[4, 4, 0, 0]} maxBarSize={44} animationDuration={700} label={{ position: 'top', fontSize: 10, fill: '#474F7A', formatter: (v: number) => fmt(v) }} />
                <Line dataKey="target" name="目標" stroke="#8A8FA8" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} animationDuration={900} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </figure>
        <figure className="p-4">
          <figcaption className="mb-2 text-xs font-semibold text-ink-600">フォロワー数（月末）</figcaption>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <ComposedChart data={f} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEECE6" />
                <XAxis dataKey="m" {...axis} />
                <YAxis {...axis} width={52} domain={[Math.floor(Math.min(...fv) * 0.985 / 100) * 100, Math.ceil(Math.max(...fv) * 1.01 / 100) * 100]} tickFormatter={(v) => fmt(v)} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: '#C7CDFF', strokeWidth: 1 }} />
                <Line dataKey="target" name="目標" stroke="#8A8FA8" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} animationDuration={900} />
                <Line dataKey="actual" name="実績" stroke="#434BCF" strokeWidth={2.5} dot={{ r: 4.5, fill: '#434BCF', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} animationDuration={1100}
                  label={{ position: 'top', fontSize: 10, fill: '#474F7A', formatter: (v: number) => fmt(v) }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </div>
    </section>
  )
}

function Initiatives({ accountId, month, clientId }: { accountId: string; month: string; clientId: string }) {
  const data = useDemo((s) => s.data)
  const list = data.initiatives.filter((i) => i.accountId === accountId && i.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date))
  return (
    <section className="panel overflow-hidden" aria-label="施策履歴">
      <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3">
        <h2 className="text-[15px] font-bold">施策履歴</h2>
        <span className="text-xs text-ink-400">{list.length} 件・レポート 5 枚目</span>
        <Link to={`/data/initiatives?client=${clientId}&account=${accountId}&month=${month}`} className="focus-ring group ml-auto flex items-center gap-1 rounded text-xs font-medium text-indigo-600 hover:text-indigo-800">
          施策を編集<ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
      {list.length ? (
        <ol className="divide-y divide-line-soft">
          {list.map((i) => (
            <li key={i.id} className="grid grid-cols-[68px_1fr] gap-3 px-5 py-3 sm:grid-cols-[68px_1fr_1fr]">
              <p className="text-xs font-semibold text-ink-500">{fmtDay(i.date)}</p>
              <div>
                <span className="mr-2 rounded-full px-1.5 py-0.5 text-2xs font-bold" style={{ color: CATEGORY[i.category].color, background: CATEGORY[i.category].color + '18' }}>{CATEGORY[i.category].label}</span>
                <span className="text-[13px] font-semibold">{i.title}</span>
              </div>
              <p className="col-start-2 text-xs text-indigo-800 sm:col-start-3">{i.result || <span className="text-ink-300">計測中</span>}</p>
            </li>
          ))}
        </ol>
      ) : <p className="px-5 py-6 text-xs text-ink-400">当月の施策はありません。レポートには「特記事項なし」と表示されます。</p>}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 右カラム                                                               */
/* ------------------------------------------------------------------ */

function SideCard({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5">
        <h3 className="text-[13px] font-bold">{title}</h3>
        <span className="ml-auto">{aside}</span>
      </div>
      {children}
    </section>
  )
}

function GenerationState({ report, status, canGen, accountId, month }: { report?: Report; status: ReportStatus; canGen: ReturnType<typeof gate>; accountId: string; month: string }) {
  const latest = report?.versions.at(-1)
  const gen = report?.versions.filter((v) => v.kind === 'generated').at(-1)
  return (
    <SideCard title="生成状態" aside={<ReportPill status={status} size="sm" />}>
      <dl className="grid grid-cols-2 gap-px bg-line-soft text-xs">
        {[
          ['最新の版', latest ? `版 ${latest.no}（${latest.kind === 'generated' ? '自動生成' : '修正版'}）` : '—'],
          ['最終生成', gen ? fmtStamp(gen.createdAt) : '—'],
          ['形式', 'PowerPoint（.pptx）'],
          ['スライド', '7 枚'],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-4 py-2.5"><dt className="text-2xs text-ink-400">{k}</dt><dd className="mt-0.5 font-semibold text-ink-800">{v}</dd></div>
        ))}
      </dl>
      {canGen?.allowed && ['draft', 'rejected'].includes(status) && (
        <div className="flex items-center justify-between gap-2 border-t border-line-soft px-4 py-2.5">
          <span className="text-2xs text-ink-400">最新のデータで作り直す</span>
          <GenerateButton accountId={accountId} month={month} retry />
        </div>
      )}
    </SideCard>
  )
}

function CheckRow({ c }: { c: CheckItem }) {
  return (
    <li className="flex gap-2.5 px-4 py-2.5">
      <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', c.level === 'ok' ? 'bg-ok-bg text-ok' : c.level === 'warning' ? 'bg-warn-bg text-warn' : 'bg-err-bg text-err')}>
        {c.level === 'ok' ? <Check className="size-3" /> : c.level === 'warning' ? <Info className="size-3" /> : <AlertTriangle className="size-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-start gap-2 text-[12.5px] font-semibold text-ink-900">
          <span className="flex-1">{c.page && <span className="mr-1 text-ink-400">p.{c.page}</span>}{c.title}</span>
          {c.level !== 'ok' && <CheckPill level={c.level} />}
        </p>
        {c.detail && <p className="mt-0.5 break-words text-2xs leading-4 text-ink-500">{c.detail}</p>}
      </div>
    </li>
  )
}

function Checks({ data, file, fileNo }: { data: CheckItem[]; file: CheckItem[]; fileNo?: number }) {
  const all = [...data, ...file]
  const bad = all.filter((c) => c.level !== 'ok').length
  return (
    <SideCard title="自動チェック結果" aside={bad ? <span className="text-2xs font-semibold text-warn">確認 {bad} 件</span> : <span className="flex items-center gap-1 text-2xs font-semibold text-ok"><CheckCircle2 className="size-3" />すべて OK</span>}>
      <p className="bg-surface-2 px-4 pt-2 text-2xs font-semibold text-ink-400">データ</p>
      <ul className="divide-y divide-line-soft">{data.map((c) => <CheckRow key={c.id} c={c} />)}</ul>
      {file.length > 0 && (
        <>
          <p className="border-t border-line-soft bg-surface-2 px-4 pt-2 text-2xs font-semibold text-ink-400">ファイル（版 {fileNo}）</p>
          <ul className="divide-y divide-line-soft">{file.map((c) => <CheckRow key={c.id + c.title} c={c} />)}</ul>
        </>
      )}
    </SideCard>
  )
}

function Versions({ report }: { report: Report }) {
  const data = useDemo((s) => s.data)
  const download = useDemo((s) => s.download)
  const vs = [...report.versions].reverse()
  return (
    <SideCard title="ファイルのバージョン履歴" aside={<span className="text-2xs text-ink-400">{vs.length} 版</span>}>
      <ul className="divide-y divide-line-soft">
        <AnimatePresence initial={false}>
          {vs.map((v, i) => (
            <motion.li key={v.no} layout initial={{ opacity: 0, backgroundColor: 'rgba(199,205,255,.5)' }} animate={{ opacity: 1, backgroundColor: 'rgba(255,255,255,0)' }} transition={{ duration: 1.2 }}
              className="flex items-center gap-3 px-4 py-2.5">
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl font-display text-lg', i === 0 ? 'bg-ink-900 text-white' : 'bg-paper-2 text-ink-500')}>{v.no}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink-900" title={v.fileName}>{v.fileName}</p>
                <p className="text-2xs text-ink-400">
                  <span className={cn('mr-1.5 rounded px-1 py-px font-semibold', v.kind === 'generated' ? 'bg-indigo-50 text-indigo-700' : 'bg-iris-50 text-iris-600')}>{v.kind === 'generated' ? '自動生成' : '修正版'}</span>
                  {fmtStamp(v.createdAt)}・{userName(data, v.createdBy)}・{Math.round(v.size / 1024)} KB
                </p>
              </div>
              <IconButton label={`版 ${v.no} をダウンロード`} icon={<Download className="size-4" />} tone="accent" onClick={() => download(report.id, v.no)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </SideCard>
  )
}

const EVENT_LABEL: Record<ReportEvent['type'], { label: (e: ReportEvent) => string; icon: ReactNode; cls: string }> = {
  generate: { label: (e) => `生成（版 ${e.version}）`, icon: <Wand2 className="size-3" />, cls: 'bg-indigo-50 text-indigo-600' },
  generate_failed: { label: () => '生成に失敗', icon: <XOctagon className="size-3" />, cls: 'bg-err-bg text-err' },
  replace: { label: (e) => `差し替え（版 ${e.version}）`, icon: <FileUp className="size-3" />, cls: 'bg-iris-50 text-iris-600' },
  request: { label: () => '承認を依頼', icon: <Send className="size-3" />, cls: 'bg-sky-50 text-sky-600' },
  approve: { label: () => '承認', icon: <BadgeCheck className="size-3" />, cls: 'bg-iris-50 text-iris-600' },
  reject: { label: () => '差し戻し', icon: <Undo2 className="size-3" />, cls: 'bg-err-bg text-err' },
  submit: { label: () => '提出を記録', icon: <Send className="size-3" />, cls: 'bg-ok-bg text-ok' },
}

function History({ events }: { events: ReportEvent[] }) {
  const data = useDemo((s) => s.data)
  return (
    <SideCard title="承認履歴">
      <ol className="relative px-4 py-3">
        <span className="absolute bottom-5 left-[27px] top-5 w-px bg-line" aria-hidden />
        <AnimatePresence initial={false}>
          {[...events].reverse().map((e) => {
            const m = EVENT_LABEL[e.type]
            return (
              <motion.li key={e.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="relative flex gap-3 py-1.5">
                <span className={cn('relative z-10 grid size-6 shrink-0 place-items-center rounded-full ring-4 ring-white', m.cls)}>{m.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2 text-xs"><b className="text-ink-900">{m.label(e)}</b><span className="ml-auto shrink-0 tnum text-2xs text-ink-400">{fmtStamp(e.at)}</span></p>
                  <p className="text-2xs text-ink-500">{userName(data, e.by)}</p>
                  {e.comment && e.type !== 'submit' && <p className="mt-1 rounded-lg bg-surface-3 px-2 py-1 text-2xs leading-4 text-ink-600">{e.comment}</p>}
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>
    </SideCard>
  )
}

