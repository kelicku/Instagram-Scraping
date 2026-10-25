import PptxGenJS from 'pptxgenjs'
import type { ReportInput } from './reportInput'
import { CATEGORY } from '@/domain/labels'
import { fmtMonth, fmtMonthShort, parseDate } from '@/domain/calendar'

/** レポートの所見欄。修正版アップロード時の文字数チェックでこの名前を探す */
export const COMMENT_OBJECT_NAME = '所見'
export const COMMENT_LIMIT = 250
export const TEMPLATE_SLIDES = 7

const C = {
  navy: '111833', navyDeep: '0B1026', indigo: '434BCF', indigoSoft: 'C7CDFF', sky: '3B82F6', iris: '7F6BDE',
  paper: 'F4F3EF', white: 'FFFFFF', line: 'E5E2DB', ink: '1D2547', mute: '676D90', faint: '9095AE',
  ok: '1E7F55', err: 'B8352E', target: '8A8FA8',
}
const JP = 'Yu Gothic'
const NUM = 'Georgia'

const n = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('ja-JP'))
const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`)
const mom = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '▲' : '▼'} ${Math.abs(v * 100).toFixed(1)}%`)

/** 複合グラフ（棒＋折れ線）。型定義と実装の引数順が異なるため吸収する */
function combo(slide: PptxGenJS.Slide, types: PptxGenJS.IChartMulti[], opts: PptxGenJS.IChartOpts) {
  ;(slide.addChart as unknown as (t: PptxGenJS.IChartMulti[], o: PptxGenJS.IChartOpts) => void)(types, opts)
}

function header(slide: PptxGenJS.Slide, no: string, title: string, sub: string) {
  slide.addText(no, { x: 0.6, y: 0.42, w: 0.8, h: 0.5, fontFace: NUM, fontSize: 26, color: C.indigo, italic: true, margin: 0 })
  slide.addText(title, { x: 1.35, y: 0.38, w: 8, h: 0.42, fontFace: JP, fontSize: 22, bold: true, color: C.navy, margin: 0 })
  slide.addText(sub, { x: 1.35, y: 0.8, w: 9, h: 0.3, fontFace: JP, fontSize: 11, color: C.mute, margin: 0 })
}

function card(slide: PptxGenJS.Slide, x: number, y: number, w: number, h: number, fill = C.white) {
  slide.addShape('roundRect', { x, y, w, h, fill: { color: fill }, line: { color: C.line, width: 0.75 }, rectRadius: 0.08 })
}

function bar(slide: PptxGenJS.Slide, x: number, y: number, w: number, ratio: number | null) {
  slide.addShape('roundRect', { x, y, w, h: 0.07, fill: { color: 'ECEAE4' }, line: { type: 'none' }, rectRadius: 0.035 })
  if (ratio == null) return
  const fw = Math.max(0.07, w * Math.min(ratio, 1))
  slide.addShape('roundRect', { x, y, w: fw, h: 0.07, fill: { color: ratio >= 1 ? C.indigo : C.sky }, line: { type: 'none' }, rectRadius: 0.035 })
}

export async function generateReportPptx(input: ReportInput): Promise<Blob> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 in
  pptx.author = input.aeName
  pptx.company = input.clientName
  pptx.title = `${input.clientName} Instagram 月次レポート ${fmtMonth(input.month)}`
  pptx.theme = { headFontFace: JP, bodyFontFace: JP }

  const footer = `${input.clientName}　@${input.handle}　${fmtMonth(input.month)}`
  pptx.defineSlideMaster({
    title: 'BODY',
    background: { color: C.paper },
    objects: [
      { rect: { x: 0, y: 0, w: 13.333, h: 0.08, fill: { color: C.navy } } },
      { text: { text: footer, options: { x: 0.6, y: 7.02, w: 8, h: 0.25, fontFace: JP, fontSize: 8, color: C.faint, margin: 0 } } },
      { line: { x: 0.6, y: 6.92, w: 12.13, h: 0, line: { color: C.line, width: 0.75 } } },
    ],
    slideNumber: { x: 12.3, y: 7.0, w: 0.45, h: 0.28, fontFace: NUM, fontSize: 9, color: C.faint, align: 'right' },
  })

  /* 1. 表紙 ------------------------------------------------------- */
  {
    const s = pptx.addSlide()
    s.background = { color: C.navyDeep }
    s.addShape('ellipse', { x: 7.6, y: -2.4, w: 8.2, h: 8.2, fill: { color: C.indigo, transparency: 72 }, line: { type: 'none' } })
    s.addShape('ellipse', { x: 9.9, y: 2.6, w: 5.6, h: 5.6, fill: { color: C.iris, transparency: 78 }, line: { type: 'none' } })
    s.addShape('ellipse', { x: 6.4, y: 3.9, w: 3.2, h: 3.2, fill: { color: C.sky, transparency: 84 }, line: { type: 'none' } })
    s.addShape('line', { x: 0.8, y: 1.15, w: 0.9, h: 0, line: { color: '8EA2FF', width: 1.5 } })
    s.addText('INSTAGRAM MONTHLY REPORT', { x: 0.8, y: 1.3, w: 6, h: 0.3, fontFace: 'Arial', fontSize: 10, color: '8EA2FF', charSpacing: 4, margin: 0 })
    const [y, m] = input.month.split('-')
    s.addText([
      { text: y, options: { fontSize: 40, color: '8A93C2' } },
      { text: `.${m}`, options: { fontSize: 96, color: C.white } },
    ], { x: 0.75, y: 1.75, w: 7, h: 1.6, fontFace: NUM, margin: 0, valign: 'bottom' })
    s.addText(input.clientName, { x: 0.8, y: 3.75, w: 7.5, h: 0.6, fontFace: JP, fontSize: 30, bold: true, color: C.white, margin: 0 })
    s.addText(`@${input.handle}　${input.accountLabel}`, { x: 0.8, y: 4.35, w: 7.5, h: 0.4, fontFace: JP, fontSize: 15, color: 'C9CEEA', margin: 0 })
    s.addText(`${fmtMonth(input.month)}　Instagram 運用レポート`, { x: 0.8, y: 4.85, w: 7.5, h: 0.35, fontFace: JP, fontSize: 13, color: '9AA2CC', margin: 0 })
    s.addShape('line', { x: 0.8, y: 6.3, w: 11.7, h: 0, line: { color: '2A3360', width: 0.75 } })
    s.addText(`作成　${input.aeName}（担当AE）　／　確認　${input.pmName}（PM）`, { x: 0.8, y: 6.45, w: 8, h: 0.3, fontFace: JP, fontSize: 10, color: '9AA2CC', margin: 0 })
    s.addText(`${input.generatedAt.slice(0, 10).replace(/-/g, '/')}　版 ${input.version}`, { x: 9, y: 6.45, w: 3.5, h: 0.3, fontFace: JP, fontSize: 10, color: '9AA2CC', align: 'right', margin: 0 })
  }

  /* 2. KPI サマリー ---------------------------------------------- */
  {
    const s = pptx.addSlide({ masterName: 'BODY' })
    header(s, '01', 'KPI サマリー', `${fmtMonth(input.month)}の実績、前月比、目標達成率`)
    const main = input.kpis.slice(0, 4)
    const w = 2.92
    main.forEach((k, i) => {
      const x = 0.6 + i * (w + 0.15)
      const yTop = 1.45
      card(s, x, yTop, w, 2.75, i === 0 ? C.navy : C.white)
      const dark = i === 0
      s.addText(k.label, { x: x + 0.25, y: yTop + 0.22, w: w - 0.5, h: 0.3, fontFace: JP, fontSize: 11, bold: true, color: dark ? 'C9CEEA' : C.mute, margin: 0 })
      s.addText(n(k.value), { x: x + 0.22, y: yTop + 0.6, w: w - 0.4, h: 0.85, fontFace: NUM, fontSize: 38, color: dark ? C.white : C.navy, margin: 0 })
      s.addText(`前月比　${mom(k.mom)}`, {
        x: x + 0.25, y: yTop + 1.5, w: w - 0.5, h: 0.28, fontFace: JP, fontSize: 10.5, margin: 0,
        color: k.mom == null ? C.mute : k.mom >= 0 ? (dark ? '8FE0B8' : C.ok) : dark ? 'FFB4AD' : C.err,
      })
      bar(s, x + 0.25, yTop + 2.05, w - 0.5, k.ach)
      s.addText([
        { text: `目標 ${n(k.target)}`, options: { color: dark ? '9AA2CC' : C.mute } },
        { text: `　達成率 ${pct(k.ach)}`, options: { color: dark ? C.white : C.indigo, bold: true } },
      ], { x: x + 0.25, y: yTop + 2.2, w: w - 0.5, h: 0.3, fontFace: JP, fontSize: 10, margin: 0 })
    })
    const sub = [
      ...input.kpis.slice(4).map((k) => ({ label: k.label, value: n(k.value), note: `達成率 ${pct(k.ach)}` })),
      { label: '新規フォロワー数', value: n(input.totals.newFollows), note: input.totals.missingManual.length ? `未入力 ${input.totals.missingManual.length} 日` : '手入力値' },
      { label: 'フォロー解除数', value: n(input.totals.unfollows), note: '手入力値' },
      { label: '投稿数', value: n(input.totals.posts), note: 'フィード・リール' },
    ]
    const sw = 2.33
    sub.forEach((m, i) => {
      const x = 0.6 + i * (sw + 0.115)
      card(s, x, 4.45, sw, 1.55)
      s.addText(m.label, { x: x + 0.2, y: 4.6, w: sw - 0.3, h: 0.28, fontFace: JP, fontSize: 9.5, color: C.mute, margin: 0 })
      s.addText(m.value, { x: x + 0.2, y: 4.92, w: sw - 0.3, h: 0.6, fontFace: NUM, fontSize: 26, color: C.navy, margin: 0 })
      s.addText(m.note, { x: x + 0.2, y: 5.56, w: sw - 0.3, h: 0.26, fontFace: JP, fontSize: 9, color: C.indigo, margin: 0 })
    })
    s.addText('フォロワー数は月末時点、その他は月間合計。達成率は実績 ÷ 目標。', { x: 0.6, y: 6.25, w: 12, h: 0.3, fontFace: JP, fontSize: 8.5, color: C.faint, margin: 0 })
  }

  /* 3. 月次推移（編集可能なネイティブグラフ：棒＝実績、破線＝目標） ------- */
  {
    const s = pptx.addSlide({ masterName: 'BODY' })
    header(s, '02', '月次推移', '直近 3 か月の実績と目標（灰色の破線）。グラフは PowerPoint 上でデータを編集できます')
    const labels = input.trend.map((t) => fmtMonthShort(t.month))
    const axis = {
      fontFace: JP, showLegend: true, legendPos: 'b' as const, legendFontSize: 9, legendColor: C.mute,
      catAxisLabelColor: C.mute, catAxisLabelFontSize: 10, valAxisLabelColor: C.faint, valAxisLabelFontSize: 8,
      valGridLine: { color: C.line, size: 0.5 }, catGridLine: { style: 'none' as const }, valAxisLabelFormatCode: '#,##0',
      catAxisLineShow: false, valAxisLineShow: false,
    }
    const panel = (x: number, w: number, title: string) => {
      card(s, x, 1.4, w, 3.4)
      s.addText(title, { x: x + 0.25, y: 1.55, w: w - 0.5, h: 0.3, fontFace: JP, fontSize: 11, bold: true, color: C.ink, margin: 0 })
    }
    const target = (key: 'reach' | 'followers'): PptxGenJS.IChartMulti => ({
      type: pptx.ChartType.line,
      data: [{ name: '目標', labels, values: input.trend.map((t) => t.target[key] ?? 0) }],
      options: { chartColors: [C.target], lineSize: 1.75, lineDash: 'dash' as const, lineDataSymbol: 'circle' as const, lineDataSymbolSize: 6 },
    })
    // リーチは量なので 0 起点の棒
    panel(0.6, 6.0, 'リーチ（月間合計）')
    combo(s, [
      {
        type: pptx.ChartType.bar,
        data: [{ name: '実績', labels, values: input.trend.map((t) => t.actual.reach ?? 0) }],
        options: { chartColors: [C.indigo], barGapWidthPct: 110, showValue: true, dataLabelFontSize: 8, dataLabelColor: C.ink, dataLabelPosition: 'outEnd', dataLabelFormatCode: '#,##0' },
      },
      target('reach'),
    ], { x: 0.7, y: 1.9, w: 5.8, h: 2.8, ...axis, valAxisMinVal: 0 })
    // フォロワー数は水準の推移なので折れ線（0 起点でない軸に棒は使わない）
    panel(6.73, 6.0, 'フォロワー数（月末）')
    const fv = input.trend.flatMap((t) => [t.actual.followers ?? 0, t.target.followers ?? 0]).filter(Boolean)
    combo(s, [
      {
        type: pptx.ChartType.line,
        data: [{ name: '実績', labels, values: input.trend.map((t) => t.actual.followers ?? 0) }],
        options: { chartColors: [C.indigo], lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 8, showValue: true, dataLabelFontSize: 8, dataLabelColor: C.ink, dataLabelPosition: 't', dataLabelFormatCode: '#,##0' },
      },
      target('followers'),
    ], { x: 6.83, y: 1.9, w: 5.8, h: 2.8, ...axis, valAxisMinVal: Math.floor((Math.min(...fv) * 0.98) / 100) * 100, valAxisMaxVal: Math.ceil((Math.max(...fv) * 1.015) / 100) * 100 })
    const head = ['指標', ...labels, '前月比', `${labels[2]}目標`, '達成率']
    const rows: PptxGenJS.TableRow[] = [
      head.map((h, i) => ({ text: h, options: { bold: true, color: C.mute, fill: { color: 'ECEAE4' }, align: i ? 'right' : 'left' } })),
      ...input.kpis.map((k) => [
        { text: k.label, options: { bold: true, color: C.ink } },
        ...input.trend.map((t) => ({ text: n(t.actual[k.key]), options: { align: 'right' as const } })),
        { text: mom(k.mom), options: { align: 'right' as const, color: k.mom == null ? C.mute : k.mom >= 0 ? C.ok : C.err } },
        { text: n(k.target), options: { align: 'right' as const, color: C.mute } },
        { text: pct(k.ach), options: { align: 'right' as const, bold: true, color: (k.ach ?? 0) >= 1 ? C.indigo : C.ink } },
      ]),
    ]
    s.addTable(rows, {
      x: 0.6, y: 4.95, w: 12.13, colW: [2.6, 1.45, 1.45, 1.45, 1.6, 1.88, 1.7], fontFace: JP, fontSize: 9, valign: 'middle',
      color: C.ink, fill: { color: C.white }, border: { type: 'solid', color: C.line, pt: 0.5 }, rowH: 0.26, margin: [0, 0.08, 0, 0.08],
    })
  }

  /* 4. 日次推移（指標ごとに別グラフ。2 軸は使わない） -------------------- */
  {
    const s = pptx.addSlide({ masterName: 'BODY' })
    header(s, '03', '日次推移とフォロワー増減', '日別のリーチと新規フォロワー数。新規フォロワー数・フォロー解除数は手入力値')
    const labels = input.daily.map((d) => `${parseDate(d.date).getDate()}`)
    const base = {
      fontFace: JP, showLegend: false, catAxisLabelColor: C.faint, catAxisLabelFontSize: 7, valAxisLabelColor: C.faint, valAxisLabelFontSize: 8,
      valGridLine: { color: C.line, size: 0.5 }, catGridLine: { style: 'none' as const }, valAxisLabelFormatCode: '#,##0', catAxisLineShow: false, valAxisLineShow: false,
    }
    card(s, 0.6, 1.4, 9.1, 2.55)
    s.addText('リーチ（日別）', { x: 0.85, y: 1.52, w: 4, h: 0.28, fontFace: JP, fontSize: 10.5, bold: true, color: C.ink, margin: 0 })
    s.addChart(pptx.ChartType.line, [{ name: 'リーチ', labels, values: input.daily.map((d) => d.reach ?? 0) }], {
      x: 0.7, y: 1.8, w: 8.9, h: 2.1, ...base, chartColors: [C.indigo], lineSize: 2, lineDataSymbol: 'none',
    })
    card(s, 0.6, 4.1, 9.1, 2.6)
    s.addText('新規フォロワー数（日別・手入力）', { x: 0.85, y: 4.22, w: 5, h: 0.28, fontFace: JP, fontSize: 10.5, bold: true, color: C.ink, margin: 0 })
    s.addChart(pptx.ChartType.bar, [{ name: '新規フォロワー数', labels, values: input.daily.map((d) => d.newFollows ?? 0) }], {
      x: 0.7, y: 4.5, w: 8.9, h: 2.15, ...base, chartColors: [C.indigo], barGapWidthPct: 45,
    })
    const net = input.totals.newFollows - input.totals.unfollows
    const stats = [
      { label: '新規フォロワー数', value: n(input.totals.newFollows) },
      { label: 'フォロー解除数', value: n(input.totals.unfollows) },
      { label: '純増数', value: `${net >= 0 ? '+' : ''}${n(net)}` },
      { label: '投稿数', value: n(input.totals.posts) },
    ]
    stats.forEach((st, i) => {
      const y = 1.4 + i * 1.08
      card(s, 9.9, y, 2.83, 0.95, i === 2 ? C.navy : C.white)
      s.addText(st.label, { x: 10.1, y: y + 0.12, w: 2.5, h: 0.25, fontFace: JP, fontSize: 9, color: i === 2 ? 'C9CEEA' : C.mute, margin: 0 })
      s.addText(st.value, { x: 10.1, y: y + 0.38, w: 2.5, h: 0.48, fontFace: NUM, fontSize: 24, color: i === 2 ? C.white : C.navy, margin: 0 })
    })
    const miss = input.totals.missingManual
    s.addText(miss.length ? `未入力：${miss.map((d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`).join('、')}` : '手入力値はすべて入力済み', {
      x: 9.9, y: 5.8, w: 2.83, h: 0.6, fontFace: JP, fontSize: 9, color: miss.length ? C.err : C.ok, margin: 0, valign: 'top',
    })
  }

  /* 5. 施策履歴 --------------------------------------------------- */
  {
    const s = pptx.addSlide({ masterName: 'BODY' })
    header(s, '04', '施策履歴', `${fmtMonth(input.month)}に実施した施策と結果`)
    const list = input.initiatives.slice(0, 5)
    if (!list.length) {
      card(s, 0.6, 1.45, 12.13, 1.2)
      s.addText('当月の施策はありません（特記事項なし）', { x: 0.9, y: 1.6, w: 11, h: 0.9, fontFace: JP, fontSize: 13, color: C.mute, margin: 0 })
    }
    s.addShape('line', { x: 1.55, y: 1.55, w: 0, h: Math.max(0.5, list.length * 1.04 - 0.3), line: { color: C.indigoSoft, width: 1.5 } })
    list.forEach((it, i) => {
      const y = 1.45 + i * 1.04
      const d = parseDate(it.date)
      s.addShape('ellipse', { x: 1.42, y: y + 0.12, w: 0.26, h: 0.26, fill: { color: C.white }, line: { color: CATEGORY[it.category].color.slice(1), width: 2.25 } })
      s.addText(`${d.getMonth() + 1}/${d.getDate()}`, { x: 0.4, y: y + 0.06, w: 0.92, h: 0.38, fontFace: NUM, fontSize: 15, color: C.navy, align: 'right', margin: 0 })
      card(s, 1.95, y, 10.78, 0.9)
      s.addShape('roundRect', { x: 2.15, y: y + 0.15, w: 1.1, h: 0.26, fill: { color: CATEGORY[it.category].color.slice(1), transparency: 86 }, line: { type: 'none' }, rectRadius: 0.13 })
      s.addText(CATEGORY[it.category].label, { x: 2.15, y: y + 0.15, w: 1.1, h: 0.26, fontFace: JP, fontSize: 8.5, bold: true, color: CATEGORY[it.category].color.slice(1), align: 'center', margin: 0 })
      s.addText(it.title, { x: 3.4, y: y + 0.1, w: 5.2, h: 0.36, fontFace: JP, fontSize: 12, bold: true, color: C.ink, margin: 0 })
      s.addText(it.body || '—', { x: 3.4, y: y + 0.47, w: 5.2, h: 0.36, fontFace: JP, fontSize: 9, color: C.mute, margin: 0, valign: 'top' })
      s.addShape('line', { x: 8.8, y: y + 0.15, w: 0, h: 0.6, line: { color: C.line, width: 0.75 } })
      s.addText([
        { text: '結果　', options: { color: C.faint, fontSize: 8.5 } },
        { text: it.result || '計測中', options: { color: it.result ? C.indigo : C.faint, bold: !!it.result } },
      ], { x: 9.0, y: y + 0.1, w: 3.6, h: 0.7, fontFace: JP, fontSize: 9.5, margin: 0, valign: 'middle' })
    })
    if (input.initiatives.length > 5)
      s.addText(`ほか ${input.initiatives.length - 5} 件は管理画面の施策履歴を参照`, { x: 1.95, y: 6.6, w: 8, h: 0.25, fontFace: JP, fontSize: 8.5, color: C.faint, margin: 0 })
  }

  /* 6. 所見（担当者記入欄） ------------------------------------------ */
  {
    const s = pptx.addSlide({ masterName: 'BODY' })
    header(s, '05', '今月の所見', `担当者が記入します（${COMMENT_LIMIT} 文字以内）`)
    card(s, 0.6, 1.45, 8.4, 5.2)
    s.addText('ここに今月の所見を記入してください。', {
      x: 0.9, y: 1.7, w: 7.8, h: 4.7, fontFace: JP, fontSize: 13, color: C.ink, lineSpacingMultiple: 1.4, valign: 'top', margin: 0,
      objectName: COMMENT_OBJECT_NAME, paraSpaceAfter: 6,
    })
    const top = [...input.kpis].filter((k) => k.ach != null).sort((a, b) => (b.ach ?? 0) - (a.ach ?? 0))
    const best = top[0]
    const worst = top[top.length - 1]
    const facts = [
      { label: '最も達成率が高い指標', value: best ? `${best.label}　${pct(best.ach)}` : '—' },
      { label: '最も達成率が低い指標', value: worst ? `${worst.label}　${pct(worst.ach)}` : '—' },
      { label: '当月の施策', value: `${input.initiatives.length} 件` },
    ]
    facts.forEach((f, i) => {
      const y = 1.45 + i * 1.75
      card(s, 9.2, y, 3.53, 1.6, i === 0 ? 'EEF0FF' : C.white)
      s.addText(f.label, { x: 9.4, y: y + 0.2, w: 3.2, h: 0.28, fontFace: JP, fontSize: 9, color: C.mute, margin: 0 })
      s.addText(f.value, { x: 9.4, y: y + 0.6, w: 3.2, h: 0.7, fontFace: JP, fontSize: 14, bold: true, color: C.navy, margin: 0, valign: 'top' })
    })
  }

  /* 7. 次月の目標 -------------------------------------------------- */
  {
    const s = pptx.addSlide({ masterName: 'BODY' })
    header(s, '06', `${fmtMonthShort(input.nextMonth)}の目標`, `${fmtMonth(input.nextMonth)}の KPI 目標と、当月実績からの必要な伸び`)
    const rows: PptxGenJS.TableRow[] = [
      ['指標', `${fmtMonthShort(input.month)}実績`, `${fmtMonthShort(input.nextMonth)}目標`, '必要な伸び'].map((h, i) => ({
        text: h, options: { bold: true, color: C.mute, fill: { color: 'ECEAE4' }, align: i ? ('right' as const) : ('left' as const) },
      })),
      ...input.kpis.map((k) => {
        const t = input.nextTargets[k.key]
        const g = t && k.value ? (t - k.value) / k.value : null
        return [
          { text: k.label, options: { bold: true, color: C.ink } },
          { text: n(k.value), options: { align: 'right' as const } },
          { text: t ? n(t) : '未設定', options: { align: 'right' as const, bold: true, color: t ? C.navy : C.faint } },
          { text: g == null ? '—' : `${g >= 0 ? '+' : ''}${(g * 100).toFixed(1)}%`, options: { align: 'right' as const, color: C.indigo } },
        ]
      }),
    ]
    s.addTable(rows, {
      x: 0.6, y: 1.5, w: 12.13, colW: [4.13, 2.66, 2.66, 2.68], fontFace: JP, fontSize: 12, color: C.ink, valign: 'middle',
      fill: { color: C.white }, border: { type: 'solid', color: C.line, pt: 0.5 }, rowH: 0.56, margin: [0, 0.16, 0, 0.16],
    })
  }

  return (await pptx.write({ outputType: 'blob' })) as Blob
}
