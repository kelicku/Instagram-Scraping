import { useNavigate } from 'react-router-dom'
import { RefreshCcw, Wand2 } from 'lucide-react'
import { useDemo, GEN_STEPS } from '@/store/demo'
import { PrimaryButton } from '@/ui/Button'
import { toast } from '@/ui/Toast'
import { fmtMonth } from '@/domain/calendar'
import { motion } from 'motion/react'

/** 生成ボタン：処理中は進捗を、完了・失敗は状態を表示する */
export function GenerateButton({ accountId, month, retry, disabledReason, size, openAfter }: {
  accountId: string; month: string; retry?: boolean; disabledReason?: string; size?: 'md' | 'lg'; openAfter?: boolean
}) {
  const generate = useDemo((s) => s.generate)
  const id = `r-${accountId}-${month}`
  const progress = useDemo((s) => s.progress[id])
  const handle = useDemo((s) => s.data.accounts.find((a) => a.id === accountId)!.handle)
  const nav = useNavigate()
  const run = async () => {
    const r = await generate(accountId, month)
    if (r.status === 'failed') {
      toast.err('レポートの生成に失敗しました', r.generationError)
      throw new Error('failed')
    }
    toast.ok(`@${handle} ${fmtMonth(month)}のレポートを生成しました`, `版 ${r.versions.at(-1)!.no}・PowerPoint をダウンロードできます`)
    if (openAfter) nav(`/reports/${id}`)
  }
  return (
    <PrimaryButton size={size} icon={retry ? <RefreshCcw className="size-4" /> : <Wand2 className="size-4" />} onClick={run}
      state={progress ? 'loading' : undefined} progress={progress?.pct}
      loadingLabel={progress ? `${GEN_STEPS[Math.min(progress.step, GEN_STEPS.length - 1)]}…` : '生成中…'}
      successLabel="生成しました" errorLabel="失敗しました" disabled={!!disabledReason} disabledReason={disabledReason}>
      {retry ? '再生成' : '生成する'}
    </PrimaryButton>
  )
}

/** 生成の進行状況（ステップ表示） */
export function GenerationSteps({ reportId }: { reportId: string }) {
  const progress = useDemo((s) => s.progress[reportId])
  if (!progress) return null
  return (
    <div className="w-full">
      <div className="h-1 overflow-hidden rounded-full bg-paper-2">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-iris-500" animate={{ width: `${progress.pct}%` }} transition={{ duration: 0.45 }} />
      </div>
      <ol className="mt-3 grid grid-cols-5 gap-1">
        {GEN_STEPS.map((s, i) => {
          const done = i < progress.step
          const on = i === progress.step
          return (
            <li key={s} className="flex flex-col items-center gap-1.5 text-center">
              <span className={`relative grid size-6 place-items-center rounded-full text-2xs font-bold transition-colors duration-300 ${done ? 'bg-indigo-600 text-white' : on ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-400' : 'bg-paper-2 text-ink-400'}`}>
                {on && <span className="absolute inset-0 animate-ping rounded-full bg-indigo-300/50" />}
                <span className="relative">{done ? '✓' : i + 1}</span>
              </span>
              <span className={`text-2xs leading-tight ${on ? 'font-semibold text-ink-900' : 'text-ink-400'}`}>{s}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
