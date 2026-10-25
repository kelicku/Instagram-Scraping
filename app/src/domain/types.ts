export type Role = 'AE' | 'PM'

export interface User {
  id: string
  name: string
  role: Role
  title: string
}

export interface Client {
  id: string
  name: string
  industry: string
  aeId: string
  pmId: string
  accountIds: string[]
}

export interface Account {
  id: string
  clientId: string
  handle: string
  label: string
}

export type FetchStatus = 'success' | 'failed' | 'not_run'

export interface FetchLog {
  status: FetchStatus
  message?: string
  at?: string
}

/** API から取得する日次値。取得失敗日は null */
export interface ApiDaily {
  followers: number
  followerDelta: number
  following: number
  mediaCount: number
  posts: number
  reach: number
  impressions: number
  engagedAccounts: number
  interactions: number
  likes: number
  comments: number
  saves: number
  shares: number
  linkTaps: number
}

/** API で取得できず手入力する日次値 */
export interface ManualDaily {
  newFollows: number | null
  unfollows: number | null
}

export interface DailyRecord {
  date: string
  api: ApiDaily | null
  manual: ManualDaily
}

export type KpiKey = 'followers' | 'reach' | 'impressions' | 'engagement' | 'saves' | 'linkTaps'

export type KpiTargets = Partial<Record<KpiKey, number>>

export type InitiativeCategory = 'campaign' | 'ad' | 'post' | 'other'

export interface Initiative {
  id: string
  accountId: string
  date: string
  category: InitiativeCategory
  title: string
  body: string
  result: string
  updatedAt: string
  updatedBy: string
}

export type ReportStatus =
  | 'not_generated'
  | 'generating'
  | 'failed'
  | 'draft'
  | 'pending'
  | 'rejected'
  | 'approved'
  | 'submitted'

export type CheckLevel = 'error' | 'warning' | 'ok'

export interface CheckItem {
  id: string
  level: CheckLevel
  title: string
  detail?: string
  page?: number
}

export interface FileVersion {
  no: number
  kind: 'generated' | 'uploaded'
  fileName: string
  size: number
  createdAt: string
  createdBy: string
  /** IndexedDB 上の実ファイル。未保存（シード版）はダウンロード時に再生成 */
  blobKey?: string
  checks?: CheckItem[]
}

export type ReportEventType =
  | 'generate'
  | 'generate_failed'
  | 'replace'
  | 'request'
  | 'approve'
  | 'reject'
  | 'submit'

export interface ReportEvent {
  id: string
  at: string
  type: ReportEventType
  by: string
  version?: number
  comment?: string
}

export interface Submission {
  at: string
  method: string
  to: string
  note: string
  by: string
  recordedAt: string
}

export interface Report {
  id: string
  accountId: string
  month: string
  status: ReportStatus
  versions: FileVersion[]
  events: ReportEvent[]
  generationError?: string
  rejection?: { by: string; at: string; comment: string; checks: string[] }
  submission?: Submission
  updatedAt?: string
}

export type AuditEntity = 'kpi_target' | 'initiative' | 'manual_metric' | 'report' | 'fetch' | 'system'

export interface AuditEntry {
  id: string
  at: string
  userId: string
  entity: AuditEntity
  action: string
  target: string
  clientId?: string
  changes?: { field: string; before: string; after: string }[]
}
