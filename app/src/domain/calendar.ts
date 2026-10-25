/**
 * デモの基準日。実行日に依存せずデータの整合性を保つため、
 * 日付はこの値に固定し、時刻のみ実時間を使う。
 */
export const DEMO_TODAY = '2026-10-23'
export const DATA_START = '2026-07-01'
/** 取得処理が完了している最終日（前日） */
export const LAST_FETCH_DATE = '2026-10-22'
export const DEFAULT_REPORT_MONTH = '2026-09'
export const FISCAL_YEAR_START = '2026-04'
export const REPORT_MONTHS = ['2026-07', '2026-08', '2026-09', '2026-10']

const WEEK = ['日', '月', '火', '水', '木', '金', '土']

const pad = (n: number) => String(n).padStart(2, '0')

export function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(d: string, n: number): string {
  const x = parseDate(d)
  x.setDate(x.getDate() + n)
  return toDateStr(x)
}

export function daysInRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export function monthOf(d: string) {
  return d.slice(0, 7)
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const x = new Date(y, m - 1 + n, 1)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`
}

export function daysOfMonth(month: string): string[] {
  const first = `${month}-01`
  const last = addDays(`${addMonths(month, 1)}-01`, -1)
  return daysInRange(first, last)
}

export function fiscalMonths(startMonth = FISCAL_YEAR_START): string[] {
  return Array.from({ length: 12 }, (_, i) => addMonths(startMonth, i))
}

export function weekday(d: string) {
  return parseDate(d).getDay()
}

export function fmtMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return `${y}年${m}月`
}

export function fmtMonthShort(month: string) {
  return `${Number(month.split('-')[1])}月`
}

export function fmtDay(d: string) {
  const [, m, day] = d.split('-').map(Number)
  return `${m}/${day}（${WEEK[weekday(d)]}）`
}

export function fmtDateLong(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return `${y}年${m}月${day}日（${WEEK[weekday(d)]}）`
}

/** 'YYYY-MM-DDTHH:mm' → '10/21 18:05' */
export function fmtStamp(s?: string) {
  if (!s) return '—'
  const [d, t] = s.split('T')
  const [, m, day] = d.split('-').map(Number)
  return `${m}/${day} ${t?.slice(0, 5) ?? ''}`
}

export function fmtStampFull(s?: string) {
  if (!s) return '—'
  const [d, t] = s.split('T')
  return `${d.replace(/-/g, '/')} ${t?.slice(0, 5) ?? ''}`
}

/** デモ基準日 + 現在時刻 */
export function demoNow(): string {
  const n = new Date()
  return `${DEMO_TODAY}T${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`
}

export function isPastMonth(month: string) {
  return month < monthOf(DEMO_TODAY)
}
