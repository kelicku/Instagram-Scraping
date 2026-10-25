import type { Account, KpiKey, KpiTargets } from './types'
import { KPI_DEFS } from './labels'
import { fiscalMonths, fmtMonthShort } from './calendar'

export interface CsvChange {
  accountId: string
  month: string
  key: KpiKey
  before: number | undefined
  after: number
}

export interface CsvResult {
  changes: CsvChange[]
  errors: { line: number; message: string }[]
  locked: number
  rows: number
  total: number
}

function splitLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const METRIC_ALIASES: Record<string, KpiKey> = Object.fromEntries(
  KPI_DEFS.flatMap((d) => [[d.label, d.key], [d.short, d.key], [d.key, d.key]]),
)
METRIC_ALIASES['エンゲージメント数'] = 'engagement'
METRIC_ALIASES['表示回数'] = 'impressions'

/** 月の見出し：「2026-04」「2026/4」「4月」を受け付ける */
function parseMonth(h: string, fy: string[]): string | null {
  const m1 = h.match(/^(\d{4})[-/](\d{1,2})$/)
  if (m1) return `${m1[1]}-${m1[2].padStart(2, '0')}`
  const m2 = h.match(/^(\d{1,2})月$/)
  if (m2) return fy.find((m) => Number(m.slice(5)) === Number(m2[1])) ?? null
  return null
}

/**
 * KPI 目標の CSV を解析する。
 * 形式：`アカウント,指標,2026-04,…` もしくは `指標,4月,…`（アカウント列なし＝選択中のアカウント）
 */
export function parseTargetsCsv(
  text: string,
  ctx: { accounts: Account[]; defaultAccountId: string; current: Record<string, Record<string, KpiTargets>>; isLocked: (accountId: string, month: string) => boolean },
): CsvResult {
  const fy = fiscalMonths()
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  const res: CsvResult = { changes: [], errors: [], locked: 0, rows: 0, total: Math.max(0, lines.length - 1) }
  if (!lines.length) {
    res.errors.push({ line: 0, message: 'ファイルが空です' })
    return res
  }
  const header = splitLine(lines[0])
  const hasAccount = /アカウント|account/i.test(header[0])
  const metricCol = hasAccount ? 1 : 0
  const months = header.slice(metricCol + 1).map((h) => parseMonth(h, fy))
  months.forEach((m, i) => {
    if (!m) res.errors.push({ line: 1, message: `列「${header[metricCol + 1 + i]}」を月として読み取れません` })
  })
  for (let li = 1; li < lines.length; li++) {
    const cells = splitLine(lines[li])
    let accountId = ctx.defaultAccountId
    if (hasAccount) {
      const handle = cells[0].replace(/^@/, '')
      const acc = ctx.accounts.find((a) => a.handle === handle)
      if (!acc) {
        res.errors.push({ line: li + 1, message: `アカウント「${cells[0]}」が見つかりません` })
        continue
      }
      accountId = acc.id
    }
    const key = METRIC_ALIASES[cells[metricCol]]
    if (!key) {
      res.errors.push({ line: li + 1, message: `指標「${cells[metricCol]}」は対象外です` })
      continue
    }
    res.rows++
    months.forEach((month, i) => {
      if (!month) return
      const raw = (cells[metricCol + 1 + i] ?? '').replace(/[,\s]/g, '')
      if (raw === '') return
      const v = Number(raw)
      if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
        res.errors.push({ line: li + 1, message: `${fmtMonthShort(month)}の値「${cells[metricCol + 1 + i]}」は 0 以上の整数ではありません` })
        return
      }
      if (ctx.isLocked(accountId, month)) {
        res.locked++
        return
      }
      const before = ctx.current[accountId]?.[month]?.[key]
      if (before !== v) res.changes.push({ accountId, month, key, before, after: v })
    })
  }
  return res
}

export function targetsToCsv(handle: string, targets: Record<string, KpiTargets>): string {
  const fy = fiscalMonths()
  const rows = [['アカウント', '指標', ...fy].join(',')]
  for (const d of KPI_DEFS) rows.push([`@${handle}`, d.label, ...fy.map((m) => targets[m]?.[d.key] ?? '')].join(','))
  return '﻿' + rows.join('\r\n')
}
