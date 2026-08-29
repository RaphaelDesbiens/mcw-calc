export type SulfurCubeViewMode = 'full' | 'compact'

export function parseSulfurCubeViewMode(view: unknown): SulfurCubeViewMode {
  return view === 'compact' ? 'compact' : 'full'
}

export function createFullSulfurCubeToolUrl(currentUrl: string): string {
  const url = new URL(currentUrl)

  url.searchParams.delete('view')
  url.hash = ''

  return url.toString()
}
