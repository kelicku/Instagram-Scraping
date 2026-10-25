import type { DemoData } from '@/domain/seed'
import type { Initiative, KpiKey, KpiTargets } from '@/domain/types'
import { achievement, delta, monthActual, monthRecords, trend } from '@/domain/metrics'
import { KPI_DEFS } from '@/domain/labels'
import { addMonths } from '@/domain/calendar'

export interface ReportInput {
  clientName: string
  handle: string
  accountLabel: string
  month: string
  aeName: string
  pmName: string
  version: number
  generatedAt: string
  kpis: { key: KpiKey; label: string; unit: string; value: number | null; prev: number | null; target?: number; ach: number | null; mom: number | null }[]
  trend: ReturnType<typeof trend>
  daily: { date: string; reach: number | null; followers: number | null; newFollows: number | null; unfollows: number | null; posts: number }[]
  totals: { newFollows: number; unfollows: number; posts: number; missingManual: string[] }
  initiatives: Initiative[]
  nextMonth: string
  nextTargets: KpiTargets
}

/** 画面データから PPTX 生成用の入力を組み立てる */
export function buildReportInput(data: DemoData, accountId: string, month: string, version: number, generatedAt: string): ReportInput {
  const acc = data.accounts.find((a) => a.id === accountId)!
  const client = data.clients.find((c) => c.id === acc.clientId)!
  const name = (id: string) => data.users.find((u) => u.id === id)?.name ?? ''
  const cur = monthActual(data, accountId, month)
  const prev = monthActual(data, accountId, addMonths(month, -1))
  const t = data.targets[accountId]?.[month] ?? {}
  return {
    clientName: client.name,
    handle: acc.handle,
    accountLabel: acc.label,
    month,
    aeName: name(client.aeId),
    pmName: name(client.pmId),
    version,
    generatedAt,
    kpis: KPI_DEFS.map((d) => ({
      key: d.key, label: d.label, unit: d.unit,
      value: cur.values[d.key], prev: prev.values[d.key], target: t[d.key],
      ach: achievement(cur.values[d.key], t[d.key]), mom: delta(cur.values[d.key], prev.values[d.key]),
    })),
    trend: trend(data, accountId, month),
    daily: monthRecords(data, accountId, month).map((r) => ({
      date: r.date, reach: r.api?.reach ?? null, followers: r.api?.followers ?? null,
      newFollows: r.manual.newFollows, unfollows: r.manual.unfollows, posts: r.api?.posts ?? 0,
    })),
    totals: { newFollows: cur.newFollows, unfollows: cur.unfollows, posts: cur.posts, missingManual: cur.missingManual },
    initiatives: data.initiatives.filter((i) => i.accountId === accountId && i.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)),
    nextMonth: addMonths(month, 1),
    nextTargets: data.targets[accountId]?.[addMonths(month, 1)] ?? {},
  }
}
