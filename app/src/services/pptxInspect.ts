import JSZip from 'jszip'
import type { CheckItem } from '@/domain/types'
import { COMMENT_LIMIT, COMMENT_OBJECT_NAME, TEMPLATE_SLIDES } from './pptx'

const PLACEHOLDER = 'ここに今月の所見を記入してください。'

const decode = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

/** アップロードされた PPTX を開き、テンプレートとの整合と所見の文字数を確認する */
export async function inspectPptx(file: File): Promise<{ ok: boolean; checks: CheckItem[] }> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    return { ok: false, checks: [{ id: 'zip', level: 'error', title: 'PowerPoint ファイルとして読み込めません', detail: '.pptx 形式で保存し直してください' }] }
  }
  const slides = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))
  if (!zip.file('ppt/presentation.xml') || !slides.length)
    return { ok: false, checks: [{ id: 'zip', level: 'error', title: 'PowerPoint のスライドが見つかりません', detail: 'ファイルが壊れている可能性があります' }] }

  const checks: CheckItem[] = []
  checks.push(
    slides.length === TEMPLATE_SLIDES
      ? { id: 'slides', level: 'ok', title: 'スライド構成', detail: `${slides.length} 枚（テンプレートと一致）` }
      : { id: 'slides', level: 'warning', title: 'スライド枚数がテンプレートと異なります', detail: `${slides.length} 枚（テンプレートは ${TEMPLATE_SLIDES} 枚）` },
  )

  let found = false
  for (let i = 0; i < slides.length; i++) {
    const xml = await zip.file(slides[i])!.async('string')
    const shapes = xml.split('<p:sp>').slice(1)
    for (const sp of shapes) {
      if (!sp.includes(`name="${COMMENT_OBJECT_NAME}"`)) continue
      found = true
      const text = decode([...sp.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(''))
      const len = [...text.trim()].length
      if (!len || text.trim() === PLACEHOLDER)
        checks.push({ id: 'comment', level: 'warning', title: '所見が未記入です', detail: 'テンプレートの記入例のままです', page: i + 1 })
      else if (len > COMMENT_LIMIT)
        checks.push({ id: 'comment', level: 'error', title: '所見の文字数が上限を超えています', detail: `${len} 文字（上限 ${COMMENT_LIMIT} 文字）`, page: i + 1 })
      else checks.push({ id: 'comment', level: 'ok', title: '所見の文字数', detail: `${len} 文字（上限 ${COMMENT_LIMIT} 文字）`, page: i + 1 })
    }
  }
  if (!found) checks.push({ id: 'comment', level: 'warning', title: '所見欄が見つかりません', detail: `「${COMMENT_OBJECT_NAME}」という名前の図形を削除していないか確認してください` })
  return { ok: true, checks }
}
