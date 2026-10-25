import type { DemoData } from './seed'
import type { CheckItem, DailyRecord, FetchStatus, KpiKey, Report, ReportStatus, User, Client } from './types'
import { addMonths, daysOfMonth, fmtDay, fmtMonth, LAST_FETCH_DATE, monthOf } from './calendar'
import { KPI_DEFS } from './labels'

export type KpiValues = Record<KpiKey, number | null>

export function monthRecords(data: DemoData, accountId: string, month: string): DailyRecord[] {
  return (data.daily[accountId] ?? []).filter((d) => monthOf(d.date) === month)
}

/** 月次実績。API 未取得日は集計から除外し、件数を返す */
export function monthActual(data: DemoData, accountId: string, month: string) {
  const rows = monthRecords(data, accountId, month)
  const got = rows.filter((r) => r.api)
  const sum = (f: (r: DailyRecord) => number) => (got.length ? got.reduce((s, r) => s + f(r), 0) : null)
  const last = got[got.length - 1]
  const values: KpiValues = {
    followers: last ? last.api!.followers : null,
    reach: sum((r) => r.api!.reach),
    impressions: sum((r) => r.api!.impressions),
    engagement: sum((r) => r.api!.interactions),
    saves: sum((r) => r.api!.saves),
    linkTaps: sum((r) => r.api!.linkTaps),
  }
  const newFollows = rows.reduce((s, r) => s + (r.manual.newFollows ?? 0), 0)
  const unfollows = rows.reduce((s, r) => s + (r.manual.unfollows ?? 0), 0)
  const posts = got.reduce((s, r) => s + r.api!.posts, 0)
  return {
    values,
    newFollows,
    unfollows,
    posts,
    days: rows.length,
    missingApi: rows.filter((r) => !r.api).map((r) => r.date),
    missingManual: rows.filter((r) => r.api && (r.manual.newFollows == null || r.manual.unfollows == null)).map((r) => r.date),
  }
}

export function achievement(actual: number | null | undefined, target: number | null | undefined) {
  if (actual == null || !target) return null
  return actual / target
}

export function delta(cur: number | null, prev: number | null) {
  if (cur == null || prev == null || prev === 0) return null
  return (cur - prev) / prev
}

/** 3 か月推移（指定月を末尾に） */
export function trend(data: DemoData, accountId: string, month: string, n = 3) {
  return Array.from({ length: n }, (_, i) => addMonths(month, i - n + 1)).map((m) => ({
    month: m,
    actual: monthActual(data, accountId, m).values,
    target: data.targets[accountId]?.[m] ?? {},
  }))
}

export function isConfirmed(data: DemoData, accountId: string, month: string) {
  return !!data.closes[accountId]?.[month]?.confirmed
}

/* ------------------------------------------------------------------ */
/* 権限                                                                 */
/* ------------------------------------------------------------------ */

export function visibleClients(data: DemoData, user: User): Client[] {
  return user.role === 'PM' ? data.clients : data.clients.filter((c) => c.aeId === user.id)
}

export function visibleAccountIds(data: DemoData, user: User): Set<string> {
  return new Set(visibleClients(data, user).flatMap((c) => c.accountIds))
}

export function canEditClient(data: DemoData, user: User, clientId: string) {
  const c = data.clients.find((x) => x.id === clientId)
  if (!c) return false
  return user.role === 'PM' || c.aeId === user.id
}

/* ------------------------------------------------------------------ */
/* クライアント一覧                                                      */
/* ------------------------------------------------------------------ */

export interface ClientHealth {
  client: Client
  fetch: Record<FetchStatus, string[]>
  reports: Partial<Record<ReportStatus, string[]>>
  missingManual: string[]
  issues: number
}

export function reportFor(data: DemoData, accountId: string, month: string): Report | undefined {
  return data.reports.find((r) => r.accountId === accountId && r.month === month)
}

export function reportStatus(data: DemoData, accountId: string, month: string): ReportStatus {
  return reportFor(data, accountId, month)?.status ?? 'not_generated'
}

export function clientHealth(data: DemoData, client: Client, fetchDate: string, reportMonth: string): ClientHealth {
  const fetch: ClientHealth['fetch'] = { success: [], failed: [], not_run: [] }
  const reports: ClientHealth['reports'] = {}
  const missingManual: string[] = []
  for (const id of client.accountIds) {
    const acc = data.accounts.find((a) => a.id === id)!
    const log = data.fetchLogs[id]?.[fetchDate]
    fetch[log?.status ?? 'not_run'].push(acc.handle)
    const st = reportStatus(data, id, reportMonth)
    ;(reports[st] ??= []).push(acc.handle)
    if (reportMonth < monthOf(LAST_FETCH_DATE) && monthActual(data, id, reportMonth).missingManual.length) missingManual.push(acc.handle)
  }
  const issues =
    fetch.failed.length + fetch.not_run.length + (reports.rejected?.length ?? 0) + (reports.failed?.length ?? 0) + missingManual.length
  return { client, fetch, reports, missingManual, issues }
}

/* ------------------------------------------------------------------ */
/* 自動チェック                                                          */
/* ------------------------------------------------------------------ */

export function reportChecks(data: DemoData, accountId: string, month: string): CheckItem[] {
  const out: CheckItem[] = []
  const a = monthActual(data, accountId, month)
  const confirmed = isConfirmed(data, accountId, month)
  out.push(
    confirmed
      ? { id: 'close', level: 'ok', title: '月次集計', detail: `${fmtMonth(month)}の集計は確定済みです` }
      : { id: 'close', level: 'error', title: '月次集計が確定していません', detail: '確定後にレポートを生成できます' },
  )
  out.push(
    a.missingApi.length
      ? { id: 'api', level: 'error', title: `取得できていない日が ${a.missingApi.length} 日あります`, detail: a.missingApi.map(fmtDay).join('、'), page: 3 }
      : { id: 'api', level: 'ok', title: 'API 取得', detail: `${a.days} 日分すべて取得済み` },
  )
  out.push(
    a.missingManual.length
      ? {
          id: 'manual', level: 'warning', title: `手入力の指標値が ${a.missingManual.length} 日分ありません`,
          detail: `新規フォロワー数・フォロー解除数：${a.missingManual.map(fmtDay).join('、')}`, page: 4,
        }
      : { id: 'manual', level: 'ok', title: '手入力の指標値', detail: 'すべて入力済み' },
  )
  const mismatch = monthRecords(data, accountId, month).filter(
    (r) => r.api && r.manual.newFollows != null && r.manual.unfollows != null && r.manual.newFollows - r.manual.unfollows !== r.api.followerDelta,
  )
  if (mismatch.length)
    out.push({
      id: 'consistency', level: 'warning', title: 'フォロワー増減と手入力値が一致しない日があります',
      detail: mismatch.map((r) => fmtDay(r.date)).join('、'), page: 4,
    })
  const t = data.targets[accountId]?.[month] ?? {}
  const unset = KPI_DEFS.filter((d) => !t[d.key])
  out.push(
    unset.length
      ? { id: 'target', level: 'warning', title: 'KPI 目標が未設定の指標があります', detail: unset.map((d) => d.label).join('、'), page: 2 }
      : { id: 'target', level: 'ok', title: 'KPI 目標', detail: '6 指標すべて設定済み' },
  )
  const nInit = data.initiatives.filter((i) => i.accountId === accountId && monthOf(i.date) === month).length
  out.push(
    nInit
      ? { id: 'init', level: 'ok', title: '施策履歴', detail: `${nInit} 件を掲載` }
      : { id: 'init', level: 'warning', title: '当月の施策履歴がありません', detail: '施策がない月は「特記事項なし」と表示されます', page: 5 },
  )
  return out
}

export const checkCounts = (items: CheckItem[]) => ({
  error: items.filter((i) => i.level === 'error').length,
  warning: items.filter((i) => i.level === 'warning').length,
})

export function canGenerate(data: DemoData, accountId: string, month: string) {
  return isConfirmed(data, accountId, month) && monthActual(data, accountId, month).missingApi.length === 0
}

export function daysWithStatus(data: DemoData, accountId: string, month: string, status: FetchStatus) {
  return daysOfMonth(month).filter((d) => data.fetchLogs[accountId]?.[d]?.status === status)
}
