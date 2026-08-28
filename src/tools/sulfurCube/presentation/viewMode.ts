export type SulfurCubeViewMode = 'full' | 'compact'

export function parseSulfurCubeViewMode(search: string): SulfurCubeViewMode {
  return new URLSearchParams(search).get('view') === 'compact' ? 'compact' : 'full'
}

export function createFullSulfurCubeToolUrl(currentUrl: string): string {
  const url = new URL(currentUrl)

  url.searchParams.delete('view')
  url.hash = ''

  return url.toString()
}
