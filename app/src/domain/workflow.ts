import type { Report, ReportStatus, User } from './types'

export type ReportAction = 'generate' | 'download' | 'upload' | 'request' | 'approve' | 'reject' | 'submit'

export interface ActionGate {
  allowed: boolean
  /** 表示はするが押せない理由。undefined なら非表示 */
  reason?: string
}

/**
 * 状態 × ロールで、どの操作ができるかを決める。
 * - AE：生成・修正版アップロード・承認依頼・提出記録
 * - PM：承認・差し戻し（生成とダウンロードは双方可）
 */
export function gate(action: ReportAction, status: ReportStatus, user: User, ctx: { canGenerate: boolean; hasFile: boolean; isOwner: boolean }): ActionGate | null {
  const ae = user.role === 'AE'
  const pm = user.role === 'PM'
  switch (action) {
    case 'generate':
      if (!['not_generated', 'failed', 'draft', 'rejected'].includes(status)) return null
      if (!ctx.canGenerate) return { allowed: false, reason: '月次集計が確定していないため生成できません' }
      if (ae && !ctx.isOwner) return { allowed: false, reason: '担当AEのみ生成できます' }
      return { allowed: true }
    case 'download':
      return ctx.hasFile ? { allowed: true } : null
    // ロールに関係のない操作はボタン自体を出さない（null）
    case 'upload':
      if (!['draft', 'rejected'].includes(status) || pm) return null
      return ctx.isOwner ? { allowed: true } : { allowed: false, reason: '担当AEが修正版をアップロードします' }
    case 'request':
      if (!['draft', 'rejected'].includes(status) || pm) return null
      return ctx.isOwner ? { allowed: true } : { allowed: false, reason: '承認の依頼は担当AEが行います' }
    case 'approve':
    case 'reject':
      if (status !== 'pending' || ae) return null
      return { allowed: true }
    case 'submit':
      if (status !== 'approved') return null
      return ae && ctx.isOwner ? { allowed: true } : { allowed: false, reason: '提出の記録は担当AEが行います' }
  }
}

export const LIFECYCLE: { key: string; label: string; done: (r?: Report) => boolean }[] = [
  { key: 'generate', label: '生成', done: (r) => !!r?.versions.length },
  { key: 'request', label: '承認依頼', done: (r) => !!r && ['pending', 'approved', 'submitted'].includes(r.status) },
  { key: 'approve', label: 'PM 承認', done: (r) => !!r && ['approved', 'submitted'].includes(r.status) },
  { key: 'submit', label: '提出', done: (r) => r?.status === 'submitted' },
]

export function parseReportId(id: string): { accountId: string; month: string } | null {
  const m = id.match(/^r-(.+)-(\d{4}-\d{2})$/)
  return m ? { accountId: m[1], month: m[2] } : null
}
