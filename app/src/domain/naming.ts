export function reportFileName(handle: string, month: string, version: number) {
  return `${handle}_${month.replace('-', '')}_月次レポート_v${version}.pptx`
}
