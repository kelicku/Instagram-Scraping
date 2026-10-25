import { CheckCircle2, CircleSlash, Hammer, FlaskConical } from 'lucide-react'
import { Modal } from '@/ui/Dialog'
import { cn } from '@/ui/cn'

export const SCOPE = [
  {
    key: 'demo', title: 'このデモで実際に動くもの', icon: <CheckCircle2 className="size-4" />, tone: 'text-ok bg-ok-bg ring-ok-line',
    items: [
      'すべての画面操作と状態遷移（ブラウザの localStorage・IndexedDB に保存）',
      'PowerPoint（.pptx）の生成とダウンロード。グラフは PowerPoint 上で編集できるネイティブ形式',
      '修正版 .pptx の取り込みと、所見の文字数・スライド構成の自動チェック',
      'KPI 目標の CSV 取り込み（列の自動判定・エラー行の表示・確定月の保護）',
      '承認依頼・承認・差し戻し・提出記録と、全操作の監査ログ',
    ],
  },
  {
    key: 'prod', title: '本番開発で実装するもの', icon: <Hammer className="size-4" />, tone: 'text-indigo-700 bg-indigo-50 ring-indigo-100',
    items: [
      'Instagram Graph API との連携（日次の自動取得・アクセストークンの更新と期限通知）',
      'ログイン認証（SSO 等）と、サーバー側での権限チェック',
      'データベース・ファイル保管・版管理のサーバー実装',
      '月次集計の自動確定（締め日のバッチ処理）',
      '承認依頼・差し戻し時の通知（メール・チャット）',
      '監査ログの改ざん防止保管と CSV 出力',
    ],
  },
  {
    key: 'out', title: '今回の対象外', icon: <CircleSlash className="size-4" />, tone: 'text-ink-600 bg-paper-2 ring-line',
    items: ['AI による所見の自動生成（所見は担当者が PowerPoint に記入）', '提出時のメール送信（提出の事実のみを記録）'],
  },
]

export function DemoScopeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} width="lg" icon={<FlaskConical className="size-[18px]" />}
      title="デモの範囲と本番開発の範囲" description="データの取得とログインは模擬です。基準日は 2026年10月23日に固定しています。">
      <div className="grid gap-3 pb-3 md:grid-cols-3">
        {SCOPE.map((s) => (
          <section key={s.key} className="rounded-2xl border border-line-soft bg-surface-2 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink-900">
              <span className={cn('grid size-7 place-items-center rounded-lg ring-1 ring-inset', s.tone)}>{s.icon}</span>
              {s.title}
            </h3>
            <ul className="space-y-2">
              {s.items.map((t) => (
                <li key={t} className="flex gap-2 text-xs leading-5 text-ink-600">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-300" />
                  {t}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}
