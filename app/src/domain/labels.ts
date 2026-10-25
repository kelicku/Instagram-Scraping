import type { FetchStatus, InitiativeCategory, KpiKey, ReportStatus, CheckLevel } from './types'

export const KPI_DEFS: { key: KpiKey; label: string; short: string; unit: string; hint: string }[] = [
  { key: 'followers', label: 'フォロワー数', short: 'フォロワー', unit: '人', hint: '月末時点' },
  { key: 'reach', label: 'リーチ', short: 'リーチ', unit: '', hint: '月間合計' },
  { key: 'impressions', label: 'インプレッション', short: 'インプレッション', unit: '回', hint: '表示回数の月間合計' },
  { key: 'engagement', label: 'エンゲージメント', short: 'エンゲージメント', unit: '件', hint: 'いいね・コメント・保存・シェアの合計' },
  { key: 'saves', label: '保存数', short: '保存', unit: '件', hint: '月間合計' },
  { key: 'linkTaps', label: 'プロフィールのリンクタップ', short: 'リンクタップ', unit: '回', hint: '月間合計' },
]

export const kpiLabel = (k: KpiKey) => KPI_DEFS.find((d) => d.key === k)!.label

export const REPORT_STATUS: Record<ReportStatus, { label: string; tone: Tone; order: number }> = {
  not_generated: { label: '未生成', tone: 'neutral', order: 0 },
  generating: { label: '生成中', tone: 'progress', order: 1 },
  failed: { label: '生成失敗', tone: 'err', order: 1 },
  draft: { label: '下書き', tone: 'warn', order: 2 },
  rejected: { label: '差し戻し', tone: 'err', order: 2 },
  pending: { label: '承認待ち', tone: 'info', order: 3 },
  approved: { label: '承認済み', tone: 'iris', order: 4 },
  submitted: { label: '提出済み', tone: 'ok', order: 5 },
}

export const FETCH_STATUS: Record<FetchStatus, { label: string; tone: Tone }> = {
  success: { label: '成功', tone: 'ok' },
  failed: { label: '失敗', tone: 'err' },
  not_run: { label: '未実行', tone: 'neutral' },
}

export const CHECK_LEVEL: Record<CheckLevel, { label: string; tone: Tone }> = {
  error: { label: '要修正', tone: 'err' },
  warning: { label: '確認', tone: 'warn' },
  ok: { label: 'OK', tone: 'ok' },
}

export const CATEGORY: Record<InitiativeCategory, { label: string; color: string }> = {
  campaign: { label: 'キャンペーン', color: '#7F6BDE' },
  ad: { label: '広告', color: '#3B82F6' },
  post: { label: '投稿', color: '#434BCF' },
  other: { label: 'その他', color: '#8A8FA8' },
}

export type Tone = 'ok' | 'warn' | 'err' | 'info' | 'iris' | 'neutral' | 'progress'

export const SUBMIT_METHODS = ['メール', 'チャット', '共有フォルダ', '定例会で手渡し', 'その他']
