import { createStore, get, set, clear } from 'idb-keyval'

/** レポートの実ファイルは容量の大きい IndexedDB に保存する（メタ情報は localStorage） */
const store = createStore('insta-report-demo', 'files')

export const saveFile = (key: string, blob: Blob) => set(key, blob, store)
export const loadFile = (key: string) => get<Blob>(key, store)
export const clearFiles = () => clear(store)

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
