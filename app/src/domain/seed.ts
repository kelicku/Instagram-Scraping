import type {
  Account, ApiDaily, AuditEntry, Client, DailyRecord, FetchLog, Initiative, KpiKey, KpiTargets,
  ManualDaily, Report, ReportEvent, User, FileVersion,
} from './types'
import { DATA_START, LAST_FETCH_DATE, addMonths, daysInRange, fiscalMonths, monthOf, weekday, addDays } from './calendar'
import { reportFileName } from './naming'

export interface MonthClose {
  confirmed: boolean
  at?: string
}

export interface DemoData {
  schema: number
  users: User[]
  clients: Client[]
  accounts: Account[]
  daily: Record<string, DailyRecord[]>
  fetchLogs: Record<string, Record<string, FetchLog>>
  closes: Record<string, Record<string, MonthClose>>
  targets: Record<string, Record<string, KpiTargets>>
  initiatives: Initiative[]
  reports: Report[]
  audit: AuditEntry[]
}

export const SCHEMA = 3

/* ------------------------------------------------------------------ */
/* マスタ                                                              */
/* ------------------------------------------------------------------ */

export const USERS: User[] = [
  { id: 'u-suzuki', name: '鈴木 花子', role: 'AE', title: '担当AE' },
  { id: 'u-takahashi', name: '高橋 健太', role: 'AE', title: '担当AE' },
  { id: 'u-tanaka', name: '田中 一郎', role: 'PM', title: 'PM' },
  { id: 'u-sato', name: '佐藤 美穂', role: 'PM', title: 'PM' },
]

const CLIENTS: Client[] = [
  { id: 'c-minamo', name: '株式会社ミナモ化粧品', industry: '化粧品', aeId: 'u-suzuki', pmId: 'u-tanaka', accountIds: ['a-minamo-beauty', 'a-minamo-men', 'a-minamo-salon'] },
  { id: 'c-hinoki', name: '株式会社ヒノキ住建', industry: '住宅・リフォーム', aeId: 'u-suzuki', pmId: 'u-tanaka', accountIds: ['a-hinoki-home', 'a-hinoki-reform'] },
  { id: 'c-tsumugi', name: '株式会社つむぎ食品', industry: '食品', aeId: 'u-suzuki', pmId: 'u-tanaka', accountIds: ['a-tsumugi-foods', 'a-tsumugi-kitchen'] },
  { id: 'c-komorebi', name: '合同会社こもれびベーカリー', industry: '飲食', aeId: 'u-takahashi', pmId: 'u-tanaka', accountIds: ['a-komorebi-cafe', 'a-komorebi-bakery'] },
  { id: 'c-aoi', name: '株式会社アオイアウトドア', industry: 'アウトドア用品', aeId: 'u-takahashi', pmId: 'u-sato', accountIds: ['a-aoi-outdoor', 'a-aoi-store', 'a-aoi-kids'] },
]

const ACCOUNTS: Account[] = [
  { id: 'a-minamo-beauty', clientId: 'c-minamo', handle: 'minamo_beauty', label: 'ブランド公式' },
  { id: 'a-minamo-men', clientId: 'c-minamo', handle: 'minamo_men', label: 'メンズライン' },
  { id: 'a-minamo-salon', clientId: 'c-minamo', handle: 'minamo_salon', label: '直営サロン' },
  { id: 'a-hinoki-home', clientId: 'c-hinoki', handle: 'hinoki_home', label: '注文住宅' },
  { id: 'a-hinoki-reform', clientId: 'c-hinoki', handle: 'hinoki_reform', label: 'リフォーム' },
  { id: 'a-tsumugi-foods', clientId: 'c-tsumugi', handle: 'tsumugi_foods', label: 'コーポレート' },
  { id: 'a-tsumugi-kitchen', clientId: 'c-tsumugi', handle: 'tsumugi_kitchen', label: 'レシピ' },
  { id: 'a-komorebi-cafe', clientId: 'c-komorebi', handle: 'komorebi_cafe', label: 'カフェ' },
  { id: 'a-komorebi-bakery', clientId: 'c-komorebi', handle: 'komorebi_bakery', label: 'ベーカリー' },
  { id: 'a-aoi-outdoor', clientId: 'c-aoi', handle: 'aoi_outdoor', label: 'ブランド公式' },
  { id: 'a-aoi-store', clientId: 'c-aoi', handle: 'aoi_store', label: '直営店' },
  { id: 'a-aoi-kids', clientId: 'c-aoi', handle: 'aoi_kids', label: 'キッズ' },
]

interface Profile {
  f0: number
  newBase: number
  reachBase: number
  postRate: number
  eng: number
  growth: number
  following: number
  media0: number
  weekendLift: number
}

const PROFILES: Record<string, Profile> = {
  'a-minamo-beauty': { f0: 24820, newBase: 41, reachBase: 5200, postRate: 0.55, eng: 0.072, growth: 0.07, following: 312, media0: 846, weekendLift: 1.18 },
  'a-minamo-men': { f0: 6180, newBase: 15, reachBase: 1650, postRate: 0.38, eng: 0.061, growth: 0.05, following: 128, media0: 214, weekendLift: 1.1 },
  'a-minamo-salon': { f0: 3120, newBase: 7, reachBase: 940, postRate: 0.32, eng: 0.083, growth: 0.03, following: 205, media0: 388, weekendLift: 1.22 },
  'a-hinoki-home': { f0: 8910, newBase: 18, reachBase: 2600, postRate: 0.42, eng: 0.054, growth: 0.04, following: 96, media0: 512, weekendLift: 1.26 },
  'a-hinoki-reform': { f0: 2410, newBase: 6, reachBase: 760, postRate: 0.3, eng: 0.049, growth: 0.06, following: 74, media0: 133, weekendLift: 1.2 },
  'a-tsumugi-foods': { f0: 15640, newBase: 27, reachBase: 4100, postRate: 0.5, eng: 0.066, growth: 0.05, following: 241, media0: 1203, weekendLift: 1.08 },
  'a-tsumugi-kitchen': { f0: 4290, newBase: 10, reachBase: 1320, postRate: 0.45, eng: 0.091, growth: 0.08, following: 58, media0: 297, weekendLift: 1.15 },
  'a-komorebi-cafe': { f0: 11240, newBase: 22, reachBase: 3300, postRate: 0.48, eng: 0.078, growth: 0.04, following: 402, media0: 958, weekendLift: 1.3 },
  'a-komorebi-bakery': { f0: 5630, newBase: 11, reachBase: 1500, postRate: 0.4, eng: 0.075, growth: 0.03, following: 187, media0: 611, weekendLift: 1.25 },
  'a-aoi-outdoor': { f0: 31260, newBase: 46, reachBase: 8800, postRate: 0.52, eng: 0.058, growth: 0.06, following: 151, media0: 1488, weekendLift: 1.32 },
  'a-aoi-store': { f0: 7420, newBase: 13, reachBase: 2100, postRate: 0.36, eng: 0.052, growth: 0.04, following: 63, media0: 402, weekendLift: 1.28 },
  'a-aoi-kids': { f0: 2940, newBase: 6, reachBase: 820, postRate: 0.3, eng: 0.069, growth: 0.05, following: 44, media0: 176, weekendLift: 1.35 },
}

/* ------------------------------------------------------------------ */
/* 乱数                                                                 */
/* ------------------------------------------------------------------ */

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: string) {
  let a = hash(seed)
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ */
/* 施策（キャンペーン・広告は日次値のブーストにも反映）                       */
/* ------------------------------------------------------------------ */

type Seed = [accountId: string, date: string, cat: Initiative['category'], title: string, body: string, result: string]

const INITIATIVES: Seed[] = [
  ['a-minamo-beauty', '2026-07-04', 'post', '夏の UV ケア特集をカルーセルで投稿', '日焼け止め 3 品の使用感比較を 8 枚で解説。', '保存数が通常投稿の 2.4 倍。'],
  ['a-minamo-beauty', '2026-07-18', 'campaign', 'サマーコフレ発売記念プレゼント', 'フォロー＋いいねで 30 名にコフレをプレゼント。期間は 7/31 まで。', '応募 2,140 件。期間中フォロワー +612 人。'],
  ['a-minamo-beauty', '2026-08-09', 'ad', 'リール広告「30 秒メイク」配信', '20〜34 歳女性向けに配信。予算 40 万円。', 'CPM 412 円。リンクタップが前月比 31% 増。'],
  ['a-minamo-beauty', '2026-08-22', 'post', '美容部員によるライブ配信', '秋の新色を 45 分紹介。', '同時視聴 最大 380 人。'],
  ['a-minamo-beauty', '2026-09-05', 'post', '投稿時間を 12 時から 20 時に変更', '平日の閲覧が多い夜の時間帯に合わせて変更。', '変更後 2 週間でリーチが 12% 増。'],
  ['a-minamo-beauty', '2026-09-16', 'campaign', '秋の新色発売プレゼントキャンペーン', 'ストーリーズのクイズ回答者から抽選で 50 名。', '応募 1,860 件。'],
  ['a-minamo-beauty', '2026-10-08', 'ad', 'ホリデーコフレ予約告知の広告配信', '予約ページへの誘導を目的に配信。予算 50 万円。', ''],
  ['a-minamo-men', '2026-07-12', 'post', 'スキンケア入門シリーズ開始', '週 1 回、基本の使い方を図解で紹介。', '保存率 4.1%。'],
  ['a-minamo-men', '2026-08-20', 'ad', '父の日以降の継続購入向け広告', '既存顧客類似の配信。予算 15 万円。', 'フォロー率は想定を下回った。'],
  ['a-minamo-men', '2026-09-12', 'other', 'プロフィール文とハイライトを刷新', '商品カテゴリ別にハイライトを整理。', 'リンクタップ +18%。'],
  ['a-minamo-salon', '2026-07-25', 'post', 'スタッフ紹介リールを公開', '各店舗のスタッフ 6 名を紹介。', ''],
  ['a-minamo-salon', '2026-09-03', 'campaign', '秋の予約キャンペーン', '投稿保存の提示で初回 20% オフ。', '予約経由 46 件。'],
  ['a-hinoki-home', '2026-07-08', 'post', '施工事例のビフォーアフター連載', '毎週火曜に 1 件ずつ公開。', ''],
  ['a-hinoki-home', '2026-08-01', 'campaign', '完成見学会の来場予約キャンペーン', 'DM で予約した方にカタログを進呈。', '予約 28 組。'],
  ['a-hinoki-home', '2026-09-10', 'ad', 'リール広告の配信開始', '新作 3 邸のルームツアーを広告配信。予算 30 万円。', '再生完了率 38%。'],
  ['a-hinoki-home', '2026-09-24', 'other', 'プロフィールのリンク先を秋の特集ページに変更', '', ''],
  ['a-hinoki-home', '2026-10-06', 'post', '投稿時間を 12 時から 20 時に変更', '平日の閲覧が多い夜の時間帯に合わせて変更。', '変更後の 1 週間でリーチが前週比 12% 増。'],
  ['a-hinoki-home', '2026-10-18', 'campaign', '秋の新作プレゼントキャンペーン開始', 'フォローといいねで応募。期間は 10/31 まで。', '開始 3 日で応募 420 件。フォロワーが 180 人増加。'],
  ['a-hinoki-reform', '2026-07-19', 'post', '水まわりリフォームの費用解説', '価格帯別の事例をカルーセルで紹介。', ''],
  ['a-hinoki-reform', '2026-08-28', 'ad', '近隣エリア向け広告', '半径 15km に限定して配信。予算 10 万円。', '問い合わせ 9 件。'],
  ['a-hinoki-reform', '2026-09-15', 'campaign', 'リフォーム相談会の告知', 'ストーリーズで日程を告知し DM 予約を受付。', '予約 12 件。'],
  ['a-hinoki-reform', '2026-10-10', 'ad', 'リール広告の配信開始', '外壁塗装の施工動画を広告配信。予算 15 万円。', ''],
  ['a-tsumugi-foods', '2026-07-06', 'post', '夏の冷やし麺レシピ連載', '自社の麺つゆを使ったレシピを週 2 回。', '保存数が前月比 1.6 倍。'],
  ['a-tsumugi-foods', '2026-08-03', 'campaign', '工場見学オンラインツアー', 'ライブ配信で工場を案内。視聴者から抽選で詰め合わせ。', '視聴 1,240 人、応募 680 件。'],
  ['a-tsumugi-foods', '2026-09-06', 'ad', '秋の新商品の認知広告', '「きのこだし」発売に合わせて配信。予算 45 万円。', 'リーチ 18 万。'],
  ['a-tsumugi-foods', '2026-09-20', 'post', 'UGC 紹介の定期投稿を開始', 'ハッシュタグ投稿を許諾のうえ紹介。', ''],
  ['a-tsumugi-foods', '2026-10-04', 'campaign', '鍋つゆ発売記念キャンペーン', 'レシピ投稿で応募。期間は 10/25 まで。', ''],
  ['a-tsumugi-kitchen', '2026-07-15', 'post', '3 分レシピのリールを週 3 回に増加', '', '平均再生数 1.4 倍。'],
  ['a-tsumugi-kitchen', '2026-08-25', 'other', '料理家とのコラボ企画の打ち合わせ', '10 月公開に向けて企画を調整。', ''],
  ['a-tsumugi-kitchen', '2026-09-18', 'post', '料理家コラボのレシピを先行公開', '', 'フォロワー +210 人。'],
  ['a-komorebi-cafe', '2026-07-10', 'post', '夏季限定ドリンクの紹介', '', ''],
  ['a-komorebi-cafe', '2026-08-14', 'campaign', '来店投稿でクッキープレゼント', 'ハッシュタグ付きの投稿でプレゼント。', '投稿 312 件。'],
  ['a-komorebi-cafe', '2026-09-09', 'post', '秋メニューの先行告知', 'リールとストーリーズで 3 日間告知。', '来店時の「見た」申告 84 件。'],
  ['a-komorebi-cafe', '2026-10-02', 'ad', 'エリア限定のリール広告', '店舗から半径 5km に配信。予算 8 万円。', ''],
  ['a-komorebi-bakery', '2026-07-22', 'post', '焼き上がり時間のストーリーズ投稿', '毎朝 7 時に投稿。', '閲覧率 22%。'],
  ['a-komorebi-bakery', '2026-09-12', 'campaign', '1 周年記念キャンペーン', 'フォロワー限定で 1 品プレゼント。', '来店 520 名。'],
  ['a-aoi-outdoor', '2026-07-01', 'campaign', '夏山シーズンのフォトコンテスト', 'ハッシュタグ投稿から優秀作品を表彰。', '投稿 1,920 件。'],
  ['a-aoi-outdoor', '2026-08-05', 'ad', 'キャンプ用品のリール広告', '25〜44 歳向けに配信。予算 80 万円。', 'リーチ 42 万。'],
  ['a-aoi-outdoor', '2026-09-01', 'post', '秋冬カタログのカルーセル', '新作 24 点を 4 回に分けて紹介。', ''],
  ['a-aoi-outdoor', '2026-09-19', 'campaign', 'アンバサダーによるテイクオーバー', '登山家が 3 日間アカウントを運用。', 'フォロワー +1,040 人。'],
  ['a-aoi-outdoor', '2026-10-12', 'ad', '冬物の先行予約広告', '予算 60 万円。', ''],
  ['a-aoi-store', '2026-07-27', 'post', '店舗スタッフのおすすめ紹介', '', ''],
  ['a-aoi-store', '2026-09-13', 'campaign', '店舗限定セールの告知', 'ストーリーズで 3 日間告知。', '来店数は前年比 108%。'],
  ['a-aoi-kids', '2026-08-10', 'post', '親子キャンプの持ち物リスト', '', '保存数 1,120 件。'],
  ['a-aoi-kids', '2026-09-23', 'campaign', '子ども向けワークショップ募集', 'DM で先着 30 組を受付。', '2 日で満席。'],
]

function boostOn(accountId: string, date: string) {
  let b = 1
  for (const [acc, d, cat] of INITIATIVES) {
    if (acc !== accountId || (cat !== 'campaign' && cat !== 'ad')) continue
    const lag = (+new Date(date) - +new Date(d)) / 86400000
    if (lag >= 0 && lag < 12) b = Math.max(b, (cat === 'campaign' ? 1.42 : 1.3) - lag * 0.025)
  }
  return b
}

/* ------------------------------------------------------------------ */
/* 日次データ                                                            */
/* ------------------------------------------------------------------ */

export interface TrueDay {
  date: string
  api: ApiDaily
  manual: { newFollows: number; unfollows: number }
}

const seriesCache = new Map<string, TrueDay[]>()

/** アカウントの「真の」日次値。取得失敗の再取得時もここから値を復元する */
export function trueSeries(accountId: string): TrueDay[] {
  const hit = seriesCache.get(accountId)
  if (hit) return hit
  const p = PROFILES[accountId]
  const out: TrueDay[] = []
  let followers = p.f0
  let media = p.media0
  let following = p.following
  for (const date of daysInRange(DATA_START, LAST_FETCH_DATE)) {
    const r = rng(accountId + date)
    const m = Number(date.slice(5, 7)) - 7
    const trend = 1 + p.growth * (m + Number(date.slice(8)) / 31)
    const wd = weekday(date)
    const weekend = wd === 0 || wd === 6 ? p.weekendLift : 1
    const posts = r() < p.postRate ? (r() < 0.14 ? 2 : 1) : 0
    const boost = boostOn(accountId, date)
    const newFollows = Math.round(p.newBase * trend * (0.6 + 0.8 * r()) * boost * (posts ? 1.15 : 1))
    const unfollows = Math.round(newFollows * (0.12 + 0.18 * r()))
    const delta = newFollows - unfollows
    followers += delta
    media += posts
    if (r() < 0.06) following += 1
    const reach = Math.round(p.reachBase * trend * weekend * (1 + 0.55 * posts) * boost * (0.75 + 0.5 * r()))
    const impressions = Math.round(reach * (1.55 + 0.5 * r()))
    const likes = Math.round(reach * p.eng * (0.75 + 0.5 * r()))
    const comments = Math.round(likes * (0.025 + 0.025 * r()))
    const saves = Math.round(reach * 0.011 * (0.6 + 0.8 * r()) * (posts ? 1.3 : 0.8))
    const shares = Math.round(reach * 0.005 * (0.6 + 0.8 * r()))
    const interactions = likes + comments + saves + shares
    out.push({
      date,
      api: {
        followers, followerDelta: delta, following, mediaCount: media, posts, reach, impressions,
        engagedAccounts: Math.round(interactions * (0.72 + 0.1 * r())),
        interactions, likes, comments, saves, shares,
        linkTaps: Math.round(reach * 0.0045 * (0.6 + 0.8 * r()) * (boost > 1 ? 1.4 : 1)),
      },
      manual: { newFollows, unfollows },
    })
  }
  seriesCache.set(accountId, out)
  return out
}

/** 取得失敗の日 */
const FETCH_FAILURES: Record<string, Record<string, FetchLog>> = {
  'a-hinoki-home': {
    '2026-10-21': { status: 'failed', message: 'アクセストークンの有効期限が切れています', at: '04:12' },
    '2026-10-22': { status: 'failed', message: 'アクセストークンの有効期限が切れています', at: '04:11' },
  },
  'a-tsumugi-kitchen': {
    '2026-10-22': { status: 'not_run', message: '取得ジョブが実行されていません（実行待ち）' },
  },
  'a-aoi-store': {
    '2026-09-28': { status: 'failed', message: 'API の呼び出し回数の上限に達しました', at: '04:20' },
    '2026-09-29': { status: 'failed', message: 'API の呼び出し回数の上限に達しました', at: '04:18' },
    '2026-09-30': { status: 'failed', message: 'API の呼び出し回数の上限に達しました', at: '04:21' },
  },
  'a-komorebi-bakery': {
    '2026-10-20': { status: 'failed', message: 'Instagram 側の一時的なエラー（HTTP 500）', at: '04:15' },
  },
}

/** 手入力が抜けている日（[日付, 抜けている項目]） */
const MANUAL_GAPS: Record<string, [string, (keyof ManualDaily)[]][]> = {
  'a-tsumugi-foods': [
    ['2026-09-08', ['newFollows', 'unfollows']],
    ['2026-09-14', ['newFollows', 'unfollows']],
    ['2026-09-22', ['newFollows', 'unfollows']],
  ],
  'a-hinoki-home': [['2026-09-14', ['newFollows']]],
}

/** 手入力は通常 2 日遅れで入る */
const MANUAL_ENTERED_UNTIL = '2026-10-20'

function buildDaily(accountId: string): DailyRecord[] {
  const gaps = new Map(MANUAL_GAPS[accountId] ?? [])
  const fails = FETCH_FAILURES[accountId] ?? {}
  return trueSeries(accountId).map((d) => {
    const fetched = !fails[d.date] || fails[d.date].status === 'success'
    const manual: ManualDaily = { ...d.manual }
    for (const k of gaps.get(d.date) ?? []) manual[k] = null
    if (d.date > MANUAL_ENTERED_UNTIL || !fetched) {
      manual.newFollows = null
      manual.unfollows = null
    }
    return { date: d.date, api: fetched ? { ...d.api } : null, manual }
  })
}

function buildFetchLogs(accountId: string): Record<string, FetchLog> {
  const r = rng('fetch' + accountId)
  const out: Record<string, FetchLog> = {}
  for (const date of daysInRange(DATA_START, LAST_FETCH_DATE)) {
    out[date] = FETCH_FAILURES[accountId]?.[date] ?? { status: 'success', at: `04:${String(5 + Math.floor(r() * 20)).padStart(2, '0')}` }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* KPI 目標                                                             */
/* ------------------------------------------------------------------ */

export function niceRound(v: number) {
  if (v >= 100000) return Math.round(v / 1000) * 1000
  if (v >= 10000) return Math.round(v / 100) * 100
  if (v >= 1000) return Math.round(v / 50) * 50
  if (v >= 100) return Math.round(v / 10) * 10
  return Math.max(5, Math.round(v / 5) * 5)
}

function monthTrueActual(accountId: string, month: string): Record<KpiKey, number> {
  const days = trueSeries(accountId).filter((d) => monthOf(d.date) === month)
  const sum = (f: (a: ApiDaily) => number) => days.reduce((s, d) => s + f(d.api), 0)
  return {
    followers: days[days.length - 1].api.followers,
    reach: sum((a) => a.reach),
    impressions: sum((a) => a.impressions),
    engagement: sum((a) => a.interactions),
    saves: sum((a) => a.saves),
    linkTaps: sum((a) => a.linkTaps),
  }
}

const KPI_KEYS: KpiKey[] = ['followers', 'reach', 'impressions', 'engagement', 'saves', 'linkTaps']

function buildTargets(accountId: string): Record<string, KpiTargets> {
  const r = rng('target' + accountId)
  const p = PROFILES[accountId]
  const out: Record<string, KpiTargets> = {}
  const base = monthTrueActual(accountId, '2026-09')
  // 9 月の達成率がアカウントごとにばらつくよう係数を決める
  const factor: Record<KpiKey, number> = Object.fromEntries(
    KPI_KEYS.map((k) => [k, k === 'followers' ? 0.985 + r() * 0.03 : 0.86 + r() * 0.3]),
  ) as Record<KpiKey, number>
  fiscalMonths().forEach((month, i) => {
    const offset = i - 5 // 9 月 = 0
    const t: KpiTargets = {}
    for (const k of KPI_KEYS) {
      const g = k === 'followers' ? p.growth * 0.28 : p.growth * 0.9
      t[k] = niceRound((base[k] / factor[k]) * (1 + g * offset))
    }
    out[month] = t
  })
  // 次年度計画が未確定の月は目標未設定
  if (accountId === 'a-tsumugi-foods') for (const m of fiscalMonths().slice(6)) out[m] = {}
  if (accountId === 'a-aoi-kids') for (const m of fiscalMonths().slice(7)) out[m] = {}
  return out
}

/* ------------------------------------------------------------------ */
/* レポート                                                             */
/* ------------------------------------------------------------------ */

let evSeq = 0
const ev = (at: string, type: ReportEvent['type'], by: string, extra: Partial<ReportEvent> = {}): ReportEvent => ({
  id: `ev-${++evSeq}`, at, type, by, ...extra,
})

function version(no: number, kind: FileVersion['kind'], at: string, by: string, handle: string, month: string, extra: Partial<FileVersion> = {}): FileVersion {
  return {
    no, kind, createdAt: at, createdBy: by,
    fileName: kind === 'generated' ? reportFileName(handle, month, no) : `${handle}_${month.replace('-', '')}_修正版.pptx`,
    size: kind === 'generated' ? 182_000 + no * 3100 : 196_400 + no * 2800,
    ...extra,
  }
}

const ae = (accountId: string) => CLIENTS.find((c) => c.accountIds.includes(accountId))!.aeId
const pm = (accountId: string) => CLIENTS.find((c) => c.accountIds.includes(accountId))!.pmId
const handleOf = (accountId: string) => ACCOUNTS.find((a) => a.id === accountId)!.handle

function submittedReport(accountId: string, month: string, dayOffset: number): Report {
  const next = addMonths(month, 1)
  const d = (n: number) => addDays(`${next}-01`, n + dayOffset)
  const a = ae(accountId)
  const h = handleOf(accountId)
  return {
    id: `r-${accountId}-${month}`, accountId, month, status: 'submitted',
    versions: [version(1, 'generated', `${d(3)}T10:20`, a, h, month)],
    events: [
      ev(`${d(3)}T10:20`, 'generate', a, { version: 1 }),
      ev(`${d(3)}T14:05`, 'request', a),
      ev(`${d(4)}T09:40`, 'approve', pm(accountId)),
      ev(`${d(5)}T11:00`, 'submit', a),
    ],
    submission: { at: `${d(5)}T11:00`, method: 'メール', to: 'ご担当者様', note: '', by: a, recordedAt: `${d(5)}T11:02` },
    updatedAt: `${d(5)}T11:02`,
  }
}

function buildReports(): Report[] {
  const out: Report[] = []
  for (const acc of ACCOUNTS) {
    out.push(submittedReport(acc.id, '2026-07', hash(acc.id) % 3))
    out.push(submittedReport(acc.id, '2026-08', hash(acc.id + 'x') % 3))
  }
  const S = '2026-09'
  const id = (a: string) => `r-${a}-${S}`
  for (const a of ['a-minamo-beauty', 'a-minamo-men', 'a-minamo-salon']) out.push(submittedReport(a, S, 2))
  out.push(submittedReport('a-aoi-kids', S, 12))

  out.push({
    id: id('a-hinoki-home'), accountId: 'a-hinoki-home', month: S, status: 'rejected',
    versions: [
      version(1, 'generated', '2026-10-20T14:30', 'u-suzuki', 'hinoki_home', S),
      version(2, 'uploaded', '2026-10-21T16:55', 'u-suzuki', 'hinoki_home', S, {
        checks: [
          { id: 'up-1', level: 'error', title: '所見の文字数が上限を超えています', detail: '312 文字（上限 250 文字）', page: 6 },
          { id: 'up-2', level: 'ok', title: 'スライド構成', detail: '7 枚（テンプレートと一致）' },
        ],
      }),
    ],
    events: [
      ev('2026-10-20T14:30', 'generate', 'u-suzuki', { version: 1 }),
      ev('2026-10-21T16:55', 'replace', 'u-suzuki', { version: 2 }),
      ev('2026-10-21T17:02', 'request', 'u-suzuki'),
      ev('2026-10-21T17:40', 'reject', 'u-tanaka', {
        comment: '月次サマリーの所見が長く、枠からはみ出しています。新規フォロワー数の値も抜けているので、手入力の指標値を確認してください。',
      }),
    ],
    rejection: {
      by: 'u-tanaka', at: '2026-10-21T17:40',
      comment: '月次サマリーの所見が長く、枠からはみ出しています。新規フォロワー数の値も抜けているので、手入力の指標値を確認してください。',
      checks: ['p.6 所見：312 文字（上限 250 文字）', 'p.4 新規フォロワー数：9/14 の値がありません'],
    },
    updatedAt: '2026-10-21T17:40',
  })
  out.push({
    id: id('a-hinoki-reform'), accountId: 'a-hinoki-reform', month: S, status: 'pending',
    versions: [
      version(1, 'generated', '2026-10-20T15:10', 'u-suzuki', 'hinoki_reform', S),
      version(2, 'uploaded', '2026-10-20T15:38', 'u-suzuki', 'hinoki_reform', S, {
        checks: [
          { id: 'up-1', level: 'ok', title: '所見の文字数', detail: '214 文字（上限 250 文字）', page: 6 },
          { id: 'up-2', level: 'ok', title: 'スライド構成', detail: '7 枚（テンプレートと一致）' },
        ],
      }),
    ],
    events: [
      ev('2026-10-20T15:10', 'generate', 'u-suzuki', { version: 1 }),
      ev('2026-10-20T15:38', 'replace', 'u-suzuki', { version: 2 }),
      ev('2026-10-20T15:42', 'request', 'u-suzuki'),
    ],
    updatedAt: '2026-10-20T15:42',
  })
  out.push({
    id: id('a-tsumugi-kitchen'), accountId: 'a-tsumugi-kitchen', month: S, status: 'draft',
    versions: [version(1, 'generated', '2026-10-22T11:20', 'u-suzuki', 'tsumugi_kitchen', S)],
    events: [ev('2026-10-22T11:20', 'generate', 'u-suzuki', { version: 1 })],
    updatedAt: '2026-10-22T11:20',
  })
  out.push({
    id: id('a-komorebi-cafe'), accountId: 'a-komorebi-cafe', month: S, status: 'approved',
    versions: [
      version(1, 'generated', '2026-10-18T10:15', 'u-takahashi', 'komorebi_cafe', S),
      version(2, 'uploaded', '2026-10-18T15:50', 'u-takahashi', 'komorebi_cafe', S, {
        checks: [
          { id: 'up-1', level: 'ok', title: '所見の文字数', detail: '238 文字（上限 250 文字）', page: 6 },
          { id: 'up-2', level: 'ok', title: 'スライド構成', detail: '7 枚（テンプレートと一致）' },
        ],
      }),
    ],
    events: [
      ev('2026-10-18T10:15', 'generate', 'u-takahashi', { version: 1 }),
      ev('2026-10-18T15:50', 'replace', 'u-takahashi', { version: 2 }),
      ev('2026-10-18T16:05', 'request', 'u-takahashi'),
      ev('2026-10-19T11:20', 'approve', 'u-tanaka'),
    ],
    updatedAt: '2026-10-19T11:20',
  })
  out.push({
    id: id('a-komorebi-bakery'), accountId: 'a-komorebi-bakery', month: S, status: 'failed',
    versions: [],
    events: [ev('2026-10-21T09:12', 'generate_failed', 'u-takahashi', { comment: 'グラフの書き出しがタイムアウトしました' })],
    generationError: 'グラフの書き出しがタイムアウトしました（処理時間 120 秒超過）。再生成してください。',
    updatedAt: '2026-10-21T09:12',
  })
  return out
}

/* ------------------------------------------------------------------ */
/* 監査ログ（初期分）                                                    */
/* ------------------------------------------------------------------ */

function buildAudit(reports: Report[]): AuditEntry[] {
  const out: AuditEntry[] = []
  let n = 0
  const push = (e: Omit<AuditEntry, 'id'>) => out.push({ id: `au-seed-${++n}`, ...e })
  const label: Record<ReportEvent['type'], string> = {
    generate: 'レポートを生成', generate_failed: 'レポート生成に失敗', replace: '修正版をアップロード',
    request: '承認を依頼', approve: '承認', reject: '差し戻し', submit: '提出を記録',
  }
  for (const r of reports) {
    if (r.month !== '2026-09') continue
    const acc = ACCOUNTS.find((a) => a.id === r.accountId)!
    for (const e of r.events) {
      push({
        at: e.at, userId: e.by, entity: 'report', action: label[e.type] + (e.version ? `（版 ${e.version}）` : ''),
        target: `@${acc.handle} 2026年9月`, clientId: acc.clientId,
        changes: e.comment ? [{ field: 'コメント', before: '', after: e.comment }] : undefined,
      })
    }
  }
  push({ at: '2026-10-19T10:02', userId: 'u-suzuki', entity: 'initiative', action: '施策を登録', target: '@hinoki_home 秋の新作プレゼントキャンペーン開始', clientId: 'c-hinoki' })
  push({
    at: '2026-10-21T09:30', userId: 'u-suzuki', entity: 'initiative', action: '施策を編集', target: '@hinoki_home 秋の新作プレゼントキャンペーン開始', clientId: 'c-hinoki',
    changes: [{ field: '結果メモ', before: '', after: '開始 3 日で応募 420 件。フォロワーが 180 人増加。' }],
  })
  push({
    at: '2026-10-14T13:12', userId: 'u-suzuki', entity: 'kpi_target', action: 'KPI 目標を変更', target: '@hinoki_home 2026年10月', clientId: 'c-hinoki',
    changes: [{ field: 'リーチ', before: '76,000', after: '78,000' }],
  })
  push({
    at: '2026-10-09T18:40', userId: 'u-takahashi', entity: 'manual_metric', action: '手入力指標を登録', target: '@aoi_outdoor 2026年9月', clientId: 'c-aoi',
    changes: [{ field: '9/30 新規フォロワー数', before: '—', after: '61' }],
  })
  push({ at: '2026-10-03T06:00', userId: 'system', entity: 'system', action: '月次集計を確定', target: '2026年9月（11 アカウント）' })
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

/* ------------------------------------------------------------------ */

export function createSeed(): DemoData {
  evSeq = 0
  const daily: DemoData['daily'] = {}
  const fetchLogs: DemoData['fetchLogs'] = {}
  const closes: DemoData['closes'] = {}
  const targets: DemoData['targets'] = {}
  for (const a of ACCOUNTS) {
    daily[a.id] = buildDaily(a.id)
    fetchLogs[a.id] = buildFetchLogs(a.id)
    targets[a.id] = buildTargets(a.id)
    closes[a.id] = {
      '2026-07': { confirmed: true, at: '2026-08-03T06:00' },
      '2026-08': { confirmed: true, at: '2026-09-03T06:00' },
      '2026-09': a.id === 'a-aoi-store' ? { confirmed: false } : { confirmed: true, at: '2026-10-03T06:00' },
      '2026-10': { confirmed: false },
    }
  }
  const initiatives: Initiative[] = INITIATIVES.map(([accountId, date, category, title, body, result], i) => ({
    id: `in-${i + 1}`, accountId, date, category, title, body, result,
    updatedAt: `${addDays(date, 1)}T10:00`, updatedBy: ae(accountId),
  }))
  const reports = buildReports()
  return {
    schema: SCHEMA, users: USERS, clients: CLIENTS, accounts: ACCOUNTS, daily, fetchLogs, closes, targets,
    initiatives, reports, audit: buildAudit(reports),
  }
}
