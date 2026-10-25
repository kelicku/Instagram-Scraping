import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSeed, trueSeries, SCHEMA, type DemoData } from '@/domain/seed'
import type { AuditEntry, CheckItem, Initiative, KpiKey, ManualDaily, Report, Submission, User } from '@/domain/types'
import { demoNow, fmtDay, fmtMonth } from '@/domain/calendar'
import { kpiLabel, CATEGORY } from '@/domain/labels'
import { canGenerate, reportChecks } from '@/domain/metrics'
import { reportFileName } from '@/domain/naming'
import { buildReportInput } from '@/services/reportInput'
import { clearFiles, downloadBlob, loadFile, saveFile } from '@/services/files'

export const GEN_STEPS = ['データを集計', '自動チェック', 'グラフを作成', 'PowerPoint を書き出し', '保存'] as const

interface Progress {
  step: number
  pct: number
}

interface DemoState {
  data: DemoData
  userId: string | null
  failNextGeneration: boolean
  /** 生成中の進捗（永続化しない） */
  progress: Record<string, Progress>

  login: (userId: string) => void
  logout: () => void
  setFailNext: (v: boolean) => void
  resetDemo: () => Promise<void>

  saveTargets: (accountId: string, changes: { month: string; key: KpiKey; value: number | undefined }[], via?: 'csv') => void
  upsertInitiative: (i: Omit<Initiative, 'id' | 'updatedAt' | 'updatedBy'> & { id?: string }) => void
  deleteInitiative: (id: string) => void
  saveManual: (accountId: string, changes: { date: string; key: keyof ManualDaily; value: number | null }[]) => void
  retryFetch: (accountId: string, date: string) => Promise<void>
  confirmMonth: (accountId: string, month: string) => void

  generate: (accountId: string, month: string) => Promise<Report>
  uploadRevision: (reportId: string, file: File) => Promise<{ ok: boolean; checks: CheckItem[] }>
  requestApproval: (reportId: string) => void
  approve: (reportId: string, comment: string) => void
  reject: (reportId: string, comment: string) => void
  recordSubmission: (reportId: string, s: Omit<Submission, 'by' | 'recordedAt'>) => void
  download: (reportId: string, versionNo?: number) => Promise<void>
}

/** PowerPoint 関連は容量が大きいため、使うときに読み込む */
const generateReportPptx = async (...a: Parameters<typeof import('@/services/pptx').generateReportPptx>) => (await import('@/services/pptx')).generateReportPptx(...a)
const inspectPptx = async (f: File) => (await import('@/services/pptxInspect')).inspectPptx(f)

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('ja-JP'))

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => {
      const me = () => get().userId ?? 'system'
      const acc = (id: string) => get().data.accounts.find((a) => a.id === id)!

      /** data を書き換え、監査ログを積む */
      const commit = (fn: (d: DemoData) => void, logs: Omit<AuditEntry, 'id' | 'at' | 'userId'>[] = []) =>
        set((s) => {
          const d: DemoData = structuredClone(s.data)
          fn(d)
          const at = demoNow()
          d.audit = [...logs.map((l) => ({ id: uid('au'), at, userId: me(), ...l })), ...d.audit]
          return { data: d }
        })

      const patchReport = (reportId: string, fn: (r: Report) => void, log?: Omit<AuditEntry, 'id' | 'at' | 'userId' | 'entity' | 'target' | 'clientId'>) => {
        const r0 = get().data.reports.find((r) => r.id === reportId)!
        const a = acc(r0.accountId)
        commit(
          (d) => {
            const r = d.reports.find((x) => x.id === reportId)!
            fn(r)
            r.updatedAt = demoNow()
          },
          log ? [{ entity: 'report', target: `@${a.handle} ${fmtMonth(r0.month)}`, clientId: a.clientId, ...log }] : [],
        )
      }

      const blobFor = async (r: Report, versionNo: number) => {
        const v = r.versions.find((x) => x.no === versionNo)!
        if (v.blobKey) {
          const b = await loadFile(v.blobKey)
          if (b) return b
        }
        // シードの版は保存済みファイルがないため、同じデータから作り直す
        return generateReportPptx(buildReportInput(get().data, r.accountId, r.month, v.no, v.createdAt))
      }

      return {
        data: createSeed(),
        userId: null,
        failNextGeneration: false,
        progress: {},

        login: (userId) => set({ userId }),
        logout: () => set({ userId: null }),
        setFailNext: (v) => set({ failNextGeneration: v }),
        resetDemo: async () => {
          await clearFiles()
          set({ data: createSeed(), progress: {}, failNextGeneration: false })
        },

        saveTargets: (accountId, changes, via) => {
          const a = acc(accountId)
          const before = get().data.targets[accountId] ?? {}
          const byMonth = new Map<string, typeof changes>()
          for (const c of changes) byMonth.set(c.month, [...(byMonth.get(c.month) ?? []), c])
          commit(
            (d) => {
              for (const c of changes) {
                const t = ((d.targets[accountId] ??= {})[c.month] ??= {})
                if (c.value == null) delete t[c.key]
                else t[c.key] = c.value
              }
            },
            [...byMonth].map(([month, cs]) => ({
              entity: 'kpi_target' as const,
              action: via === 'csv' ? 'KPI 目標を CSV で取り込み' : 'KPI 目標を変更',
              target: `@${a.handle} ${fmtMonth(month)}`,
              clientId: a.clientId,
              changes: cs.map((c) => ({ field: kpiLabel(c.key), before: num(before[month]?.[c.key]), after: num(c.value) })),
            })),
          )
        },

        upsertInitiative: (input) => {
          const a = acc(input.accountId)
          const prev = input.id ? get().data.initiatives.find((i) => i.id === input.id) : undefined
          const next: Initiative = { ...input, id: input.id ?? uid('in'), updatedAt: demoNow(), updatedBy: me() }
          const fields: [keyof Initiative, string][] = [['date', '実施日'], ['category', '区分'], ['title', '件名'], ['body', '内容'], ['result', '結果メモ'], ['accountId', 'アカウント']]
          const show = (k: keyof Initiative, v: unknown) =>
            k === 'category' ? CATEGORY[v as Initiative['category']].label : k === 'accountId' ? `@${acc(v as string).handle}` : String(v || '—')
          commit(
            (d) => {
              d.initiatives = prev ? d.initiatives.map((i) => (i.id === next.id ? next : i)) : [next, ...d.initiatives]
            },
            [
              {
                entity: 'initiative',
                action: prev ? '施策を編集' : '施策を登録',
                target: `@${a.handle} ${next.title}`,
                clientId: a.clientId,
                changes: prev
                  ? fields.filter(([k]) => prev[k] !== next[k]).map(([k, f]) => ({ field: f, before: show(k, prev[k]), after: show(k, next[k]) }))
                  : undefined,
              },
            ],
          )
        },

        deleteInitiative: (id) => {
          const it = get().data.initiatives.find((i) => i.id === id)!
          const a = acc(it.accountId)
          commit((d) => void (d.initiatives = d.initiatives.filter((i) => i.id !== id)), [
            { entity: 'initiative', action: '施策を削除', target: `@${a.handle} ${it.title}`, clientId: a.clientId,
              changes: [{ field: '実施日', before: fmtDay(it.date), after: '（削除）' }] },
          ])
        },

        saveManual: (accountId, changes) => {
          const a = acc(accountId)
          const rows = get().data.daily[accountId]
          const label = { newFollows: '新規フォロワー数', unfollows: 'フォロー解除数' }
          const months = [...new Set(changes.map((c) => c.date.slice(0, 7)))]
          commit(
            (d) => {
              for (const c of changes) d.daily[accountId].find((r) => r.date === c.date)!.manual[c.key] = c.value
            },
            months.map((m) => ({
              entity: 'manual_metric' as const,
              action: '手入力指標を保存し再計算',
              target: `@${a.handle} ${fmtMonth(m)}`,
              clientId: a.clientId,
              changes: changes
                .filter((c) => c.date.startsWith(m))
                .map((c) => ({ field: `${fmtDay(c.date)} ${label[c.key]}`, before: num(rows.find((r) => r.date === c.date)!.manual[c.key]), after: num(c.value) })),
            })),
          )
        },

        retryFetch: async (accountId, date) => {
          await wait(1400)
          const a = acc(accountId)
          const truth = trueSeries(accountId).find((t) => t.date === date)!
          commit(
            (d) => {
              d.daily[accountId].find((r) => r.date === date)!.api = { ...truth.api }
              d.fetchLogs[accountId][date] = { status: 'success', at: demoNow().slice(11, 16), message: '手動で再取得' }
            },
            [{ entity: 'fetch', action: 'データを再取得', target: `@${a.handle} ${fmtDay(date)}`, clientId: a.clientId,
               changes: [{ field: '取得状況', before: '失敗', after: '成功' }] }],
          )
        },

        confirmMonth: (accountId, month) => {
          const a = acc(accountId)
          commit((d) => void (d.closes[accountId][month] = { confirmed: true, at: demoNow() }), [
            { entity: 'system', action: '月次集計を確定', target: `@${a.handle} ${fmtMonth(month)}`, clientId: a.clientId },
          ])
        },

        generate: async (accountId, month) => {
          const a = acc(accountId)
          if (!canGenerate(get().data, accountId, month)) throw new Error('月次集計が確定していないため生成できません')
          let report = get().data.reports.find((r) => r.accountId === accountId && r.month === month)
          const id = report?.id ?? `r-${accountId}-${month}`
          const prevStatus = report?.status
          commit((d) => {
            const r = d.reports.find((x) => x.id === id)
            if (r) {
              r.status = 'generating'
              r.generationError = undefined
            } else d.reports.push({ id, accountId, month, status: 'generating', versions: [], events: [] })
          })
          const tick = (step: number, pct: number) => set((s) => ({ progress: { ...s.progress, [id]: { step, pct } } }))
          const fail = get().failNextGeneration
          try {
            tick(0, 8)
            await wait(650)
            tick(1, 30)
            await wait(650)
            tick(2, 52)
            if (fail) {
              await wait(900)
              throw new Error('グラフの書き出しがタイムアウトしました（模擬エラー）。再生成してください。')
            }
            await wait(450)
            tick(3, 74)
            const no = (get().data.reports.find((r) => r.id === id)!.versions.at(-1)?.no ?? 0) + 1
            const at = demoNow()
            const blob = await generateReportPptx(buildReportInput(get().data, accountId, month, no, at))
            await wait(350)
            tick(4, 92)
            const key = `${id}-v${no}-${Date.now()}`
            await saveFile(key, blob)
            await wait(350)
            tick(5, 100)
            commit(
              (d) => {
                const r = d.reports.find((x) => x.id === id)!
                r.versions.push({ no, kind: 'generated', fileName: reportFileName(a.handle, month, no), size: blob.size, createdAt: at, createdBy: me(), blobKey: key })
                r.events.push({ id: uid('ev'), at, type: 'generate', by: me(), version: no })
                r.status = prevStatus === 'rejected' ? 'rejected' : 'draft'
                r.updatedAt = at
              },
              [{ entity: 'report', action: `レポートを生成（版 ${no}）`, target: `@${a.handle} ${fmtMonth(month)}`, clientId: a.clientId }],
            )
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            commit(
              (d) => {
                const r = d.reports.find((x) => x.id === id)!
                r.status = 'failed'
                r.generationError = msg
                r.events.push({ id: uid('ev'), at: demoNow(), type: 'generate_failed', by: me(), comment: msg })
                r.updatedAt = demoNow()
              },
              [{ entity: 'report', action: 'レポート生成に失敗', target: `@${a.handle} ${fmtMonth(month)}`, clientId: a.clientId,
                 changes: [{ field: 'エラー', before: '', after: msg }] }],
            )
            set({ failNextGeneration: false })
          } finally {
            await wait(300)
            set((s) => {
              const { [id]: _, ...rest } = s.progress
              return { progress: rest }
            })
          }
          report = get().data.reports.find((r) => r.id === id)!
          return report
        },

        uploadRevision: async (reportId, file) => {
          const res = await inspectPptx(file)
          if (!res.ok) return res
          const r = get().data.reports.find((x) => x.id === reportId)!
          const no = (r.versions.at(-1)?.no ?? 0) + 1
          const key = `${reportId}-v${no}-${Date.now()}`
          await saveFile(key, file)
          const at = demoNow()
          patchReport(
            reportId,
            (x) => {
              x.versions.push({ no, kind: 'uploaded', fileName: file.name, size: file.size, createdAt: at, createdBy: me(), blobKey: key, checks: res.checks })
              x.events.push({ id: uid('ev'), at, type: 'replace', by: me(), version: no })
            },
            { action: `修正版をアップロード（版 ${no}）`, changes: [{ field: 'ファイル', before: r.versions.at(-1)?.fileName ?? '—', after: file.name }] },
          )
          return res
        },

        requestApproval: (reportId) =>
          patchReport(
            reportId,
            (r) => {
              r.status = 'pending'
              r.events.push({ id: uid('ev'), at: demoNow(), type: 'request', by: me(), version: r.versions.at(-1)?.no })
            },
            { action: '承認を依頼' },
          ),

        approve: (reportId, comment) =>
          patchReport(
            reportId,
            (r) => {
              r.status = 'approved'
              r.rejection = undefined
              r.events.push({ id: uid('ev'), at: demoNow(), type: 'approve', by: me(), comment: comment || undefined })
            },
            { action: '承認', changes: comment ? [{ field: 'コメント', before: '', after: comment }] : undefined },
          ),

        reject: (reportId, comment) => {
          const r0 = get().data.reports.find((x) => x.id === reportId)!
          const latest = r0.versions.at(-1)
          const issues = [
            ...(latest?.checks ?? []).filter((c) => c.level !== 'ok'),
            ...reportChecks(get().data, r0.accountId, r0.month).filter((c) => c.level !== 'ok'),
          ].map((c) => `${c.page ? `p.${c.page} ` : ''}${c.title}${c.detail ? `：${c.detail}` : ''}`)
          patchReport(
            reportId,
            (r) => {
              r.status = 'rejected'
              r.rejection = { by: me(), at: demoNow(), comment, checks: issues }
              r.events.push({ id: uid('ev'), at: demoNow(), type: 'reject', by: me(), comment })
            },
            { action: '差し戻し', changes: [{ field: 'コメント', before: '', after: comment }] },
          )
        },

        recordSubmission: (reportId, s) =>
          patchReport(
            reportId,
            (r) => {
              r.status = 'submitted'
              r.submission = { ...s, by: me(), recordedAt: demoNow() }
              r.events.push({ id: uid('ev'), at: demoNow(), type: 'submit', by: me(), comment: `${s.method}／${s.to}` })
            },
            { action: '提出を記録', changes: [{ field: '提出', before: '', after: `${s.at.replace('T', ' ')} ${s.method} → ${s.to}` }] },
          ),

        download: async (reportId, versionNo) => {
          const r = get().data.reports.find((x) => x.id === reportId)!
          const v = versionNo ? r.versions.find((x) => x.no === versionNo)! : r.versions.at(-1)!
          const blob = await blobFor(r, v.no)
          downloadBlob(blob, v.fileName)
        },
      }
    },
    {
      name: 'insta-report-demo',
      version: SCHEMA,
      partialize: (s) => ({ data: s.data, userId: s.userId, failNextGeneration: s.failNextGeneration }),
      migrate: () => ({ data: createSeed(), userId: null, failNextGeneration: false }) as never,
      merge: (persisted, current) => {
        const p = persisted as Partial<DemoState> | undefined
        if (!p?.data || p.data.schema !== SCHEMA) return current
        // 生成中にリロードされた場合は失敗扱いにして再生成できるようにする
        for (const r of p.data.reports)
          if (r.status === 'generating') {
            r.status = r.versions.length ? 'draft' : 'failed'
            if (!r.versions.length) r.generationError = '生成中に画面が再読み込みされたため中断しました。再生成してください。'
          }
        return { ...current, ...p, progress: {} }
      },
    },
  ),
)

export function useMe(): User | null {
  return useDemo((s) => s.data.users.find((u) => u.id === s.userId) ?? null)
}

export const userName = (data: DemoData, id: string) => (id === 'system' ? 'システム' : data.users.find((u) => u.id === id)?.name ?? id)
