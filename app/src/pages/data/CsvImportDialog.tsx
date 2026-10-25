import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowRight, FileSpreadsheet, Lock, UploadCloud, Download } from 'lucide-react'
import { Modal } from '@/ui/Dialog'
import { LinkButton, PrimaryButton, SecondaryButton } from '@/ui/Button'
import { useDemo } from '@/store/demo'
import { parseTargetsCsv, type CsvResult } from '@/domain/csv'
import { isConfirmed } from '@/domain/metrics'
import { kpiLabel } from '@/domain/labels'
import { fiscalMonths, fmtMonthShort } from '@/domain/calendar'
import { toast } from '@/ui/Toast'
import { cn } from '@/ui/cn'
import { downloadBlob } from '@/services/files'
import { fmt } from '@/ui/bits'

/** 説明用のサンプル：10〜12 月を上方修正、確定済みの 9 月を含めて保護を確認できる */
function sampleCsv(handle: string, targets: Record<string, Record<string, number | undefined>>) {
  const fy = fiscalMonths()
  const lines = [['アカウント', '指標', ...fy.map((m) => `${Number(m.slice(5))}月`)].join(',')]
  const bump: Record<string, number> = { '2026-10': 1.04, '2026-11': 1.05, '2026-12': 1.06 }
  for (const k of ['followers', 'reach', 'impressions', 'engagement', 'saves', 'linkTaps']) {
    lines.push([`@${handle}`, kpiLabel(k as never), ...fy.map((m) => {
      const v = targets[m]?.[k]
      if (v == null) return ''
      return bump[m] ? `"${Math.round((v * bump[m]) / 10) * 10}"` : String(v)
    })].join(','))
  }
  return '﻿' + lines.join('\r\n')
}

export function CsvImportDialog({ open, onOpenChange, accountId }: { open: boolean; onOpenChange: (v: boolean) => void; accountId: string }) {
  const data = useDemo((s) => s.data)
  const saveTargets = useDemo((s) => s.saveTargets)
  const [file, setFile] = useState<File | null>(null)
  const [res, setRes] = useState<CsvResult | null>(null)
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const acc = data.accounts.find((a) => a.id === accountId)!

  const reset = () => { setFile(null); setRes(null) }
  const read = async (f: File) => {
    setFile(f)
    if (!/\.csv$/i.test(f.name)) {
      setRes({ changes: [], errors: [{ line: 0, message: 'CSV ファイル（.csv）を選んでください' }], locked: 0, rows: 0, total: 0 })
      return
    }
    const text = await f.text()
    setRes(parseTargetsCsv(text, {
      accounts: data.accounts.filter((a) => a.clientId === acc.clientId),
      defaultAccountId: accountId,
      current: data.targets,
      isLocked: (id, m) => isConfirmed(data, id, m) || m < '2026-07',
    }))
  }

  const apply = async () => {
    if (!res) return
    await new Promise((r) => setTimeout(r, 600))
    const byAcc = new Map<string, CsvResult['changes']>()
    for (const c of res.changes) byAcc.set(c.accountId, [...(byAcc.get(c.accountId) ?? []), c])
    for (const [id, cs] of byAcc) saveTargets(id, cs.map((c) => ({ month: c.month, key: c.key, value: c.after })), 'csv')
    toast.ok(`CSV から ${res.changes.length} 件の目標を取り込みました`, file?.name)
    onOpenChange(false)
    setTimeout(reset, 300)
  }

  const handleOf = (id: string) => data.accounts.find((a) => a.id === id)!.handle

  return (
    <Modal open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTimeout(reset, 300) }} width="lg" icon={<FileSpreadsheet className="size-[18px]" />}
      title="KPI 目標を CSV で取り込む" description="1 行目に月、各行に指標を並べた CSV を読み込みます。確定済みの月は上書きされません。"
      footer={
        <>
          {res && <SecondaryButton onClick={reset}>別のファイルを選ぶ</SecondaryButton>}
          <PrimaryButton icon={<UploadCloud className="size-4" />} onClick={apply} disabled={!res || !res.changes.length}
            disabledReason={!res ? 'ファイルを選んでください' : '取り込む変更がありません'} loadingLabel="取り込み中…" successLabel="取り込みました">
            {res?.changes.length ? `${res.changes.length} 件を取り込む` : '取り込む'}
          </PrimaryButton>
        </>
      }>
      <AnimatePresence mode="wait" initial={false}>
        {!res ? (
          <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) read(f) }}
              className={cn('focus-ring group relative flex w-full flex-col items-center rounded-2xl border-[1.5px] border-dashed px-6 py-10 text-center transition-all duration-200',
                drag ? 'scale-[1.01] border-indigo-400 bg-indigo-50' : 'border-line-strong bg-surface-2 hover:border-indigo-300 hover:bg-indigo-50/40')}>
              <span className={cn('grid size-12 place-items-center rounded-2xl bg-white text-indigo-600 shadow-card transition-transform duration-300', drag ? '-translate-y-1' : 'group-hover:-translate-y-0.5')}>
                <UploadCloud className="size-6" />
              </span>
              <p className="mt-4 text-sm font-semibold text-ink-900">CSV ファイルをドロップ、またはクリックして選択</p>
              <p className="mt-1 text-xs text-ink-500">UTF-8（BOM 付き可）・列見出しは「2026-10」「10月」どちらでも可</p>
            </button>
            <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = '' }} />
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-surface-3 px-4 py-3 text-xs text-ink-600">
              <span className="font-semibold">形式の例</span>
              <code className="rounded bg-white px-2 py-0.5 text-[11px] text-ink-700 ring-1 ring-line">アカウント,指標,4月,5月,…</code>
              <LinkButton icon={<Download className="size-3" />} className="ml-auto"
                onClick={() => downloadBlob(new Blob([sampleCsv(acc.handle, data.targets[accountId] as never)], { type: 'text/csv' }), `sample_kpi_${acc.handle}.csv`)}>
                説明用サンプルをダウンロード
              </LinkButton>
            </div>
          </motion.div>
        ) : (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 pb-2">
            <div className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface-2 px-4 py-3">
              <FileSpreadsheet className="size-5 text-ok" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{file?.name}</p>
                <p className="text-2xs text-ink-400">{res.total} 行中 {res.rows} 行を読み取りました{res.total > res.rows && `（${res.total - res.rows} 行は読み取れません）`}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { n: res.changes.length, label: '変更される値', cls: 'text-indigo-700' },
                { n: res.locked, label: '確定月のため除外', cls: 'text-ink-500', icon: <Lock className="size-3" /> },
                { n: res.errors.length, label: 'エラー', cls: res.errors.length ? 'text-err' : 'text-ink-300', icon: <AlertTriangle className="size-3" /> },
              ].map((x) => (
                <div key={x.label} className="rounded-xl border border-line-soft px-3 py-2.5">
                  <p className={cn('font-display text-3xl leading-none', x.cls)}>{x.n}</p>
                  <p className="mt-1 flex items-center gap-1 text-2xs text-ink-500">{x.icon}{x.label}</p>
                </div>
              ))}
            </div>
            {res.errors.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-err-line bg-err-bg/60 px-4 py-3">
                {res.errors.slice(0, 6).map((e, i) => (
                  <li key={i} className="flex gap-2 text-xs text-err"><AlertTriangle className="mt-0.5 size-3 shrink-0" />{e.line ? `${e.line} 行目：` : ''}{e.message}</li>
                ))}
              </ul>
            )}
            {res.changes.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-line-soft">
                <table className="w-full text-xs">
                  <thead className="bg-surface-3 text-2xs text-ink-500">
                    <tr><th className="px-3 py-2 text-left font-semibold">アカウント</th><th className="px-3 py-2 text-left font-semibold">月</th><th className="px-3 py-2 text-left font-semibold">指標</th><th className="px-3 py-2 text-right font-semibold">変更前 → 変更後</th></tr>
                  </thead>
                  <tbody>
                    {res.changes.slice(0, 12).map((c, i) => (
                      <tr key={i} className="border-t border-line-soft">
                        <td className="px-3 py-1.5 text-ink-600">@{handleOf(c.accountId)}</td>
                        <td className="px-3 py-1.5">{fmtMonthShort(c.month)}</td>
                        <td className="px-3 py-1.5">{kpiLabel(c.key)}</td>
                        <td className="tnum px-3 py-1.5 text-right">
                          <span className="text-ink-400 line-through decoration-ink-300">{c.before == null ? '未設定' : fmt(c.before)}</span>
                          <ArrowRight className="mx-1.5 inline size-3 text-ink-300" />
                          <b className="text-indigo-700">{fmt(c.after)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {res.changes.length > 12 && <p className="border-t border-line-soft bg-surface-2 px-3 py-1.5 text-2xs text-ink-400">ほか {res.changes.length - 12} 件</p>}
              </div>
            ) : (
              <p className="rounded-xl bg-surface-3 px-4 py-3 text-xs text-ink-500">現在の目標と同じ値のため、変更はありません。</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
