import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarPlus, Pencil, Plus, Trash2, Sparkles, ListFilter } from 'lucide-react'
import { Page } from '@/layout/AppShell'
import { useDemo } from '@/store/demo'
import { DataTabs, ScopeBar, useScope } from './scope'
import { CATEGORY } from '@/domain/labels'
import { DEMO_TODAY, fmtMonth, fmtMonthShort, monthOf, parseDate, REPORT_MONTHS, fmtStamp } from '@/domain/calendar'
import type { Initiative, InitiativeCategory } from '@/domain/types'
import { Denied, Empty, Field, Select } from '@/ui/bits'
import { IconButton, PrimaryButton, SecondaryButton } from '@/ui/Button'
import { Confirm, Sheet } from '@/ui/Dialog'
import { toast } from '@/ui/Toast'
import { cn } from '@/ui/cn'
import { userName } from '@/store/demo'

const WEEK = ['日', '月', '火', '水', '木', '金', '土']

export function InitiativesPage() {
  const scope = useScope({ allowAllAccounts: true, defaultMonth: monthOf(DEMO_TODAY) })
  const { data, client, accounts, account, month, set, denied } = scope
  const del = useDemo((s) => s.deleteInitiative)
  const [cat, setCat] = useState<InitiativeCategory | 'all'>('all')
  const [editing, setEditing] = useState<Partial<Initiative> | null>(null)
  const [deleting, setDeleting] = useState<Initiative | null>(null)

  const inScope = useMemo(
    () => data.initiatives
      .filter((i) => accounts.some((a) => a.id === i.accountId) && (account === 'all' || i.accountId === account) && monthOf(i.date) === month)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [data.initiatives, accounts, account, month],
  )
  const list = inScope.filter((i) => cat === 'all' || i.category === cat)
  const byDate = list.reduce<Record<string, Initiative[]>>((m, i) => ((m[i.date] ??= []).push(i), m), {})
  const handle = (id: string) => data.accounts.find((a) => a.id === id)!.handle

  if (denied) return <Page crumbs={[{ label: 'データ' }, { label: '施策履歴' }]} title="施策履歴"><DataTabs /><div className="panel"><Denied /></div></Page>
  if (!client) return <Page crumbs={[{ label: 'データ' }, { label: '施策履歴' }]} title="施策履歴"><Empty title="担当クライアントがありません" /></Page>

  const openNew = () => setEditing({ accountId: account === 'all' ? accounts[0].id : (account as string), date: month === monthOf(DEMO_TODAY) ? DEMO_TODAY : `${month}-15`, category: 'post', title: '', body: '', result: '' })

  return (
    <Page
      crumbs={[{ label: 'データ' }, { label: '施策履歴' }]}
      title="施策履歴"
      subtitle="実施した施策と結果を記録します。月次レポートの「施策履歴」ページにそのまま掲載されます。"
      actions={<PrimaryButton icon={<Plus className="size-4" />} onClick={openNew}>施策を登録</PrimaryButton>}
    >
      <DataTabs />
      <ScopeBar>
        <Field label="クライアント" className="w-[220px]">
          <Select value={client.id} onChange={(v) => set({ client: v, account: null })} options={scope.clients.map((c) => ({ value: c.id, label: c.name }))} ariaLabel="クライアント" />
        </Field>
        <Field label="アカウント" className="w-[200px]">
          <Select value={account as string} onChange={(v) => set({ account: v })} options={[{ value: 'all', label: 'すべて' }, ...accounts.map((a) => ({ value: a.id, label: `@${a.handle}` }))]} ariaLabel="アカウント" />
        </Field>
        <Field label="月" className="w-[170px]">
          <Select value={month} onChange={(v) => set({ month: v })} options={REPORT_MONTHS.map((m) => ({ value: m, label: fmtMonth(m) }))} ariaLabel="月" />
        </Field>
      </ScopeBar>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_300px]">
        <section className="panel min-w-0 p-2 sm:p-4" aria-label="施策のタイムライン">
          {list.length ? (
            <ol className="relative">
              <AnimatePresence initial={false}>
                {Object.entries(byDate).map(([date, items]) => {
                  const d = parseDate(date)
                  const wd = d.getDay()
                  return (
                    <motion.li key={date} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                      className="relative grid grid-cols-[64px_1fr] gap-3 pb-2 sm:grid-cols-[84px_1fr] sm:gap-5">
                      <div className="sticky top-16 self-start pt-3 text-right">
                        <p className="font-display text-[34px] leading-none text-ink-950">{d.getDate()}</p>
                        <p className={cn('mt-1 text-2xs font-semibold', wd === 0 ? 'text-err' : wd === 6 ? 'text-sky-600' : 'text-ink-400')}>{fmtMonthShort(month)}・{WEEK[wd]}曜</p>
                      </div>
                      <div className="relative space-y-2 border-l border-line pl-5 sm:pl-6">
                        {items.map((it) => (
                          <motion.article key={it.id} layout exit={{ opacity: 0, x: 20 }}
                            className="group relative rounded-2xl border border-transparent p-4 transition-[background-color,border-color,box-shadow] duration-200 hover:border-line hover:bg-white hover:shadow-card">
                            <span className="absolute -left-[29px] top-6 size-3 rounded-full border-2 border-white ring-1 ring-line sm:-left-[31px]" style={{ background: CATEGORY[it.category].color }} aria-hidden />
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full px-2 py-0.5 text-2xs font-bold" style={{ color: CATEGORY[it.category].color, background: CATEGORY[it.category].color + '18' }}>{CATEGORY[it.category].label}</span>
                              <span className="text-xs font-medium text-ink-500">@{handle(it.accountId)}</span>
                              <div className="ml-auto flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                <IconButton label="編集" icon={<Pencil className="size-[15px]" />} tone="accent" onClick={() => setEditing(it)} />
                                <IconButton label="削除" icon={<Trash2 className="size-[15px]" />} tone="danger" onClick={() => setDeleting(it)} />
                              </div>
                            </div>
                            <h3 className="mt-2 text-[15px] font-bold leading-6 text-ink-950">{it.title}</h3>
                            {it.body && <p className="mt-1 text-[13px] leading-6 text-ink-600">{it.body}</p>}
                            <div className={cn('mt-3 flex gap-2 rounded-xl px-3 py-2 text-[12.5px] leading-5', it.result ? 'bg-indigo-50/70 text-indigo-900' : 'border border-dashed border-line-strong text-ink-400')}>
                              <span className="shrink-0 font-semibold">結果</span>
                              <span>{it.result || '未記入（結果が出たら追記してください）'}</span>
                            </div>
                            <p className="mt-2 text-2xs text-ink-300">更新 {fmtStamp(it.updatedAt)}・{userName(data, it.updatedBy)}</p>
                          </motion.article>
                        ))}
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ol>
          ) : (
            <Empty icon={<CalendarPlus className="size-6" />} title={cat === 'all' ? `${fmtMonth(month)}の施策はまだありません` : `「${CATEGORY[cat].label}」の施策はありません`}
              desc="実施した施策を登録すると、月次レポートに自動で掲載されます。"
              action={<SecondaryButton icon={<Plus className="size-4" />} onClick={openNew} tone="accent">施策を登録</SecondaryButton>} />
          )}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-20">
          <section className="panel p-5">
            <p className="eyebrow flex items-center gap-1.5"><ListFilter className="size-3" />区分で絞り込み</p>
            <p className="mt-3 font-display text-5xl leading-none">{inScope.length}<span className="ml-1.5 font-sans text-xs text-ink-400">件・{fmtMonth(month)}</span></p>
            <ul className="mt-4 space-y-1">
              {(['all', 'campaign', 'ad', 'post', 'other'] as const).map((c) => {
                const n = c === 'all' ? inScope.length : inScope.filter((i) => i.category === c).length
                const on = cat === c
                return (
                  <li key={c}>
                    <button onClick={() => setCat(c)} aria-pressed={on}
                      className={cn('focus-ring relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2 text-left text-[13px] transition-colors', on ? 'bg-ink-900 text-white' : 'hover:bg-surface-3')}>
                      <span className="size-2 rounded-full" style={{ background: c === 'all' ? '#9095AE' : CATEGORY[c].color }} />
                      <span className="flex-1 font-medium">{c === 'all' ? 'すべて' : CATEGORY[c].label}</span>
                      <span className={cn('tnum text-xs', on ? 'text-white/70' : 'text-ink-400')}>{n}</span>
                      {!on && inScope.length > 0 && c !== 'all' && (
                        <motion.span className="absolute bottom-0 left-3 h-0.5 rounded-full" style={{ background: CATEGORY[c].color }}
                          initial={{ width: 0 }} animate={{ width: `${(n / inScope.length) * 85}%` }} transition={{ duration: 0.6 }} />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
          <section className="rounded-panel border border-dashed border-line-strong p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-700"><Sparkles className="size-3.5 text-iris-500" />結果メモ未記入</p>
            <p className="mt-2 font-display text-3xl leading-none">{inScope.filter((i) => !i.result).length}<span className="ml-1 font-sans text-xs text-ink-400">件</span></p>
            <p className="mt-2 text-2xs leading-4 text-ink-500">レポートでは「計測中」と表示されます。生成前に追記しておくと説明がしやすくなります。</p>
          </section>
        </aside>
      </div>

      <InitiativeSheet value={editing} onClose={() => setEditing(null)} accounts={accounts} />
      <Confirm open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)} tone="danger" icon={<Trash2 className="size-4" />}
        title="この施策を削除しますか？" description={deleting ? `「${deleting.title}」を削除します。削除の記録は監査ログに残ります。` : ''}
        confirmLabel="削除する" onConfirm={async () => { await new Promise((r) => setTimeout(r, 350)); del(deleting!.id); toast.ok('施策を削除しました', deleting!.title) }} />
    </Page>
  )
}

function InitiativeSheet({ value, onClose, accounts }: { value: Partial<Initiative> | null; onClose: () => void; accounts: { id: string; handle: string }[] }) {
  const upsert = useDemo((s) => s.upsertInitiative)
  const [f, setF] = useState<Partial<Initiative>>({})
  const [touched, setTouched] = useState(false)
  useEffect(() => { if (value) { setF(value); setTouched(false) } }, [value])
  const errors = { title: !f.title?.trim() ? '件名を入力してください' : f.title.length > 60 ? '60 文字以内で入力してください' : '', date: !f.date ? '実施日を入力してください' : '' }
  const ok = !errors.title && !errors.date
  const isNew = !value?.id

  const submit = async () => {
    setTouched(true)
    if (!ok) throw new Error('invalid')
    await new Promise((r) => setTimeout(r, 450))
    upsert({ id: f.id, accountId: f.accountId!, date: f.date!, category: f.category!, title: f.title!.trim(), body: f.body?.trim() ?? '', result: f.result?.trim() ?? '' })
    toast.ok(isNew ? '施策を登録しました' : '施策を更新しました', f.title)
    setTimeout(onClose, 450)
  }

  return (
    <Sheet open={!!value} onOpenChange={(v) => !v && onClose()} title={isNew ? '施策を登録' : '施策を編集'} description="登録した内容は月次レポートの施策履歴に掲載されます。"
      footer={<>
        <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
        <PrimaryButton onClick={submit} loadingLabel="保存中…" successLabel="保存しました" errorLabel="入力を確認">{isNew ? '登録する' : '更新する'}</PrimaryButton>
      </>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit().catch(() => {}) }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="実施日" htmlFor="i-date" required error={touched ? errors.date : ''}>
            <input id="i-date" type="date" className="field" value={f.date ?? ''} min="2026-04-01" max="2027-03-31" onChange={(e) => setF({ ...f, date: e.target.value })} aria-invalid={touched && !!errors.date} />
          </Field>
          <Field label="アカウント" htmlFor="i-acc">
            <Select id="i-acc" value={f.accountId ?? ''} onChange={(v) => setF({ ...f, accountId: v })} options={accounts.map((a) => ({ value: a.id, label: `@${a.handle}` }))} />
          </Field>
        </div>
        <Field label="区分">
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="区分">
            {(Object.keys(CATEGORY) as InitiativeCategory[]).map((c) => {
              const on = f.category === c
              return (
                <button type="button" key={c} role="radio" aria-checked={on} onClick={() => setF({ ...f, category: c })}
                  className={cn('focus-ring relative h-10 rounded-[11px] border text-xs font-semibold transition-all duration-200', on ? 'border-transparent text-white shadow-lift' : 'border-line bg-white text-ink-600 hover:border-line-strong')}
                  style={on ? { background: CATEGORY[c].color } : undefined}>
                  {CATEGORY[c].label}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="件名" htmlFor="i-title" required hint={`${f.title?.length ?? 0} / 60`} error={touched ? errors.title : ''}>
          <input id="i-title" className="field" value={f.title ?? ''} placeholder="例：秋の新作プレゼントキャンペーン開始" onChange={(e) => setF({ ...f, title: e.target.value })} aria-invalid={touched && !!errors.title} />
        </Field>
        <Field label="内容" htmlFor="i-body" hint="任意">
          <textarea id="i-body" rows={3} className="field h-auto resize-none py-2.5 leading-6" value={f.body ?? ''} placeholder="例：フォローといいねで応募。期間は 10/31 まで。" onChange={(e) => setF({ ...f, body: e.target.value })} />
        </Field>
        <Field label="結果メモ" htmlFor="i-result" hint="任意・あとから追記できます">
          <textarea id="i-result" rows={3} className="field h-auto resize-none py-2.5 leading-6" value={f.result ?? ''} placeholder="例：開始 3 日で応募 420 件。フォロワーが 180 人増加。" onChange={(e) => setF({ ...f, result: e.target.value })} />
        </Field>
        <button type="submit" className="sr-only">保存</button>
      </form>
    </Sheet>
  )
}
