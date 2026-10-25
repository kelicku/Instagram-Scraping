import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useDemo } from '@/store/demo'
import { Avatar } from '@/layout/Avatar'
import { Logo } from '@/layout/Sidebar'
import { visibleClients } from '@/domain/metrics'
import { stagger } from '@/ui/bits'
import { cn } from '@/ui/cn'

const SCENARIO = [
  'AE としてログイン', '担当クライアントを確認', '取得エラーのアカウントを確認', 'KPI 目標を編集', '施策履歴を追加', '不足している指標を手入力',
  '月次レポートを生成', 'PowerPoint をダウンロード', '修正版をアップロード', '承認を依頼', 'PM として承認', '提出済みとして記録',
]

export function LoginPage() {
  const data = useDemo((s) => s.data)
  const login = useDemo((s) => s.login)
  const nav = useNavigate()
  const people = data.users.filter((u) => u.id !== 'u-sato')

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[1.05fr_1fr]">
      {/* 左：ブランド面 */}
      <section className="relative hidden overflow-hidden bg-ink-950 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[640px] rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-52 right-[-120px] size-[520px] rounded-full bg-iris-600/25 blur-[120px]" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
          <defs>
            <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0v44" fill="none" stroke="white" strokeWidth=".6" /></pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div className="relative flex items-center gap-3">
          <Logo />
          <span className="text-[15px] font-bold">自動レポーティング</span>
        </div>
        <div className="relative mt-auto max-w-[520px]">
          <p className="mb-5 flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.24em] text-indigo-300">
            <span className="h-px w-8 bg-indigo-300/60" />Instagram Operations Workspace
          </p>
          <h1 className="font-display text-[64px] leading-[0.95] tracking-tight">
            From data<br /><em className="text-indigo-200">to delivery.</em>
          </h1>
          <p className="mt-6 text-[15px] leading-7 text-white/65">
            取得状況の確認から、KPI・施策の管理、月次レポートの生成と承認、提出の記録まで。運用チームの毎月の仕事を、ひとつの画面でつなぎます。
          </p>
          <MiniChart />
        </div>
      </section>

      {/* 右：ユーザー選択 */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-[460px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><Logo /><span className="font-bold">自動レポーティング</span></div>
          <p className="eyebrow">ログイン</p>
          <h2 className="mt-2 text-[26px] font-bold tracking-tight">ユーザーを選んでください</h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">デモのため、パスワードの代わりにユーザーを選んでログインします。担当AEは担当クライアントのみ、PM はすべてのクライアントを表示します。</p>

          <motion.ul className="mt-8 space-y-3" variants={stagger.container} initial="hidden" animate="show">
            {people.map((u) => {
              const cs = visibleClients(data, u)
              const accounts = cs.reduce((s, c) => s + c.accountIds.length, 0)
              return (
                <motion.li key={u.id} variants={stagger.item}>
                  <button
                    onClick={() => { login(u.id); nav('/clients') }}
                    className="focus-ring group relative flex w-full items-center gap-4 overflow-hidden rounded-[4px_18px_18px_18px] bg-white p-4 text-left shadow-card transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <span className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-gradient-to-b from-sky-400 to-iris-500 transition-transform duration-300 group-hover:scale-y-100" />
                    <Avatar user={u} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-ink-900">{u.name}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-2xs font-bold', u.role === 'PM' ? 'bg-iris-50 text-iris-600' : 'bg-sky-50 text-sky-600')}>{u.title}</span>
                      </span>
                      <span className="mt-1 block text-xs text-ink-500">
                        {u.role === 'PM' ? `全 ${cs.length} 社・${accounts} アカウント／承認・差し戻し` : `担当 ${cs.length} 社・${accounts} アカウント／データ管理・レポート作成`}
                      </span>
                    </span>
                    <span className="grid size-9 place-items-center rounded-full border border-line text-ink-400 transition-all duration-300 group-hover:border-ink-900 group-hover:bg-ink-900 group-hover:text-white">
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>

          <details className="group mt-8 rounded-2xl border border-dashed border-line-strong bg-surface-2/60 p-4 open:bg-white">
            <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 rounded text-xs font-semibold text-ink-600">
              <Sparkles className="size-3.5 text-indigo-500" />説明用のデモシナリオ（12 ステップ）
              <span className="ml-auto text-ink-400 transition-transform group-open:rotate-90">›</span>
            </summary>
            <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {SCENARIO.map((s, i) => (
                <li key={s} className="flex items-baseline gap-2 text-xs text-ink-600">
                  <span className="tnum w-4 shrink-0 text-right font-display text-sm text-indigo-500">{i + 1}</span>{s}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-2xs leading-4 text-ink-400">おすすめ：鈴木 花子でログインし「株式会社つむぎ食品 @tsumugi_foods」の 9 月レポートを作成します。</p>
          </details>
        </div>
      </section>
    </div>
  )
}

function MiniChart() {
  const pts = [18, 26, 22, 34, 31, 44, 40, 52, 49, 61]
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${i * 50},${80 - v}`).join(' ')
  return (
    <svg viewBox="0 0 450 90" className="mt-10 w-full max-w-[460px]" aria-hidden>
      <defs>
        <linearGradient id="mcf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7A86F7" stopOpacity=".35" /><stop offset="1" stopColor="#7A86F7" stopOpacity="0" /></linearGradient>
      </defs>
      <motion.path d={`${d} L450,90 L0,90 Z`} fill="url(#mcf)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} />
      <motion.path d={d} fill="none" stroke="#A1ABFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
      <motion.circle cx={450} cy={80 - 61} r="4" fill="#fff" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.3 }} />
    </svg>
  )
}
