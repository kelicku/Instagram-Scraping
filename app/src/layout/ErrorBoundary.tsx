import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

/** 画面単位のエラー境界。1 画面の不具合でアプリ全体が真っ白にならないようにする */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[page error]', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto mt-16 max-w-md px-6 text-center" role="alert">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-err-bg text-err"><AlertTriangle className="size-6" /></span>
        <h1 className="mt-4 text-lg font-bold text-ink-900">この画面を表示できませんでした</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">左のメニューから別の画面に移動するか、画面を読み込み直してください。入力済みのデータは保存されています。</p>
        <button onClick={() => window.location.reload()}
          className="focus-ring mt-5 inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-[13px] font-medium text-ink-800 hover:border-ink-300">
          <RotateCw className="size-3.5" />読み込み直す
        </button>
        <p className="mt-4 break-words text-2xs text-ink-300">{this.state.error.message}</p>
      </div>
    )
  }
}
