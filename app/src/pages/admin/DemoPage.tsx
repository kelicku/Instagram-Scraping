import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Database, RotateCcw, Zap, CheckCircle2, Hammer, CircleSlash } from 'lucide-react'
import { Page } from '@/layout/AppShell'
import { useDemo } from '@/store/demo'
import { SCOPE } from '@/layout/DemoScope'
import { StatusButton } from '@/ui/Button'
import { Confirm } from '@/ui/Dialog'
import { toast } from '@/ui/Toast'
import { cn } from '@/ui/cn'

const ICONS = { demo: <CheckCircle2 className="size-4" />, prod: <Hammer className="size-4" />, out: <CircleSlash className="size-4" /> }

export function DemoPage() {
  const data = useDemo((s) => s.data)
  const failNext = useDemo((s) => s.failNextGeneration)
  const setFailNext = useDemo((s) => s.setFailNext)
  const reset = useDemo((s) => s.resetDemo)
  const nav = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const size = new Blob([localStorage.getItem('insta-report-demo') ?? '']).size

  return (
    <Page crumbs={[{ label: '管理' }, { label: 'デモ設定' }]} title="デモ設定" subtitle="説明用の設定と、デモの範囲・本番開発の範囲をまとめています。">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-err/5 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink-900 text-white"><Database className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold">デモデータを初期化</h2>
              <p className="mt-1 text-[13px] leading-6 text-ink-500">
                目標・施策・手入力値・レポート・監査ログ・アップロードしたファイルをすべて初期状態に戻します。打ち合わせの前に実行してください。
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                {[['クライアント', `${data.clients.length} 社`], ['アカウント', `${data.accounts.length} 件`], ['監査ログ', `${data.audit.length} 件`]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-surface-3 px-3 py-2"><dt className="text-2xs text-ink-400">{k}</dt><dd className="font-display text-xl">{v}</dd></div>
                ))}
              </dl>
              <p className="mt-2 text-2xs text-ink-400">保存先：ブラウザの localStorage（約 {Math.round(size / 1024)} KB）と IndexedDB（PowerPoint ファイル）</p>
              <div className="mt-5"><StatusButton tone="reject" icon={<RotateCcw className="size-3.5" />} onClick={() => setConfirm(true)}>初期状態に戻す</StatusButton></div>
            </div>
          </div>
        </section>

        <section className="panel p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warn-bg text-warn"><Zap className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold">生成失敗を再現する</h2>
              <p className="mt-1 text-[13px] leading-6 text-ink-500">オンにすると、次回のレポート生成が途中で失敗します。再生成の流れを説明するときに使います。</p>
            </div>
            <button role="switch" aria-checked={failNext} aria-label="次回の生成を失敗させる" onClick={() => { setFailNext(!failNext); toast.info(failNext ? '通常の生成に戻しました' : '次回の生成は失敗します') }}
              className={cn('focus-ring relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors duration-300', failNext ? 'bg-err' : 'bg-paper-3')}>
              <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 32 }}
                className={cn('absolute top-1 size-5 rounded-full bg-white shadow', failNext ? 'right-1' : 'left-1')} />
            </button>
          </div>
        </section>
      </div>

      <h2 className="mb-3 mt-10 text-[17px] font-bold">デモの範囲と本番開発の範囲</h2>
      <div className="grid gap-4 md:grid-cols-[1.2fr_1.2fr_0.8fr]">
        {SCOPE.map((s) => (
          <section key={s.key} className={cn('rounded-panel p-5', s.key === 'demo' ? 'panel' : s.key === 'prod' ? 'border border-indigo-100 bg-indigo-50/40' : 'border border-dashed border-line-strong')}>
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold"><span className={cn('grid size-7 place-items-center rounded-lg ring-1 ring-inset', s.tone)}>{ICONS[s.key as keyof typeof ICONS]}</span>{s.title}</h3>
            <ul className="space-y-2">{s.items.map((t) => <li key={t} className="flex gap-2 text-xs leading-5 text-ink-600"><span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-300" />{t}</li>)}</ul>
          </section>
        ))}
      </div>

      <Confirm open={confirm} onOpenChange={setConfirm} tone="danger" icon={<RotateCcw className="size-4" />} title="デモデータを初期化しますか？"
        description="この操作は取り消せません。ログイン状態は維持されます。" confirmLabel="初期化する"
        onConfirm={async () => { await reset(); toast.ok('デモデータを初期化しました'); nav('/clients') }} />
    </Page>
  )
}
