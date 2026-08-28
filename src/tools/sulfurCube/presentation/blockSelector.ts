const blockSpriteAliases: Readonly<Record<string, string>> = {
  amethyst_block: 'block-of-amethyst',
  bamboo_block: 'block-of-bamboo',
  coal_block: 'block-of-coal',
  copper_block: 'block-of-copper',
  deepslate_lapis_ore: 'deepslate-lapis-lazuli-ore',
  diamond_block: 'block-of-diamond',
  emerald_block: 'block-of-emerald',
  gold_block: 'block-of-gold',
  hay_block: 'hay-bale',
  iron_block: 'block-of-iron',
  jack_o_lantern: "jack-o'lantern",
  lapis_block: 'block-of-lapis-lazuli',
  lapis_ore: 'lapis-lazuli-ore',
  netherite_block: 'block-of-netherite',
  quartz_block: 'block-of-quartz',
  raw_copper_block: 'block-of-raw-copper',
  raw_gold_block: 'block-of-raw-gold',
  raw_iron_block: 'block-of-raw-iron',
  resin_block: 'block-of-resin',
  smooth_quartz: 'smooth-quartz-block',
  stripped_bamboo_block: 'block-of-stripped-bamboo',
}

const woodIdentifierPattern = /^(stripped_)?(.+)_wood$/
const stemIdentifierPattern = /^(stripped_)?(crimson|warped)_stem$/

export function identifierPath(id: string): string {
  return id.includes(':') ? id.slice(id.indexOf(':') + 1) : id
}

export function humanizeIdentifier(id: string): string {
  const path = identifierPath(id)

  if (path === 'tnt') {
    return 'TNT'
  }

  return path
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

export function blockSelectorSearchText(itemId: string): string {
  return `${itemId} ${identifierPath(itemId)} ${humanizeIdentifier(itemId)}`.toLowerCase()
}

export function blockSpriteFileName(itemId: string): string {
  const originalPath = identifierPath(itemId)
  const path = originalPath.startsWith('waxed_')
    ? originalPath.slice('waxed_'.length)
    : originalPath
  const directAlias = blockSpriteAliases[path]

  if (directAlias !== undefined) {
    return `BlockSprite_${directAlias}.png`
  }

  const woodMatch = woodIdentifierPattern.exec(path)
  if (woodMatch !== null) {
    const stripped = woodMatch[1] === undefined ? '' : 'stripped-'
    const woodType = woodMatch[2]!.replace(/_/g, '-')

    return `BlockSprite_${stripped}${woodType}-log.png`
  }

  const stemMatch = stemIdentifierPattern.exec(path)
  if (stemMatch !== null) {
    const stripped = stemMatch[1] === undefined ? '' : 'stripped-'

    return `BlockSprite_${stripped}${stemMatch[2]}-stem-top.png`
  }

  return `BlockSprite_${path.replace(/_/g, '-')}.png`
}
