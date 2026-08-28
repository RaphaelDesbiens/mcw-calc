import { describe, expect, it } from 'vitest'
import {
  blockSelectorSearchText,
  blockSpriteFileName,
  humanizeIdentifier,
} from '../presentation/blockSelector'

describe('block selector presentation', () => {
  it('humanizes visible labels without exposing the identifier namespace', () => {
    expect(humanizeIdentifier('minecraft:oak_planks')).toBe('Oak Planks')
    expect(humanizeIdentifier('minecraft:tnt')).toBe('TNT')
  })

  it('keeps both reader labels and technical identifiers searchable', () => {
    const searchText = blockSelectorSearchText('minecraft:oak_planks')

    expect(searchText).toContain('oak planks')
    expect(searchText).toContain('oak_planks')
    expect(searchText).toContain('minecraft:oak_planks')
  })

  it('maps game identifiers onto established Minecraft Wiki sprite aliases', () => {
    expect(blockSpriteFileName('minecraft:oak_planks')).toBe('BlockSprite_oak-planks.png')
    expect(blockSpriteFileName('minecraft:iron_block')).toBe('BlockSprite_block-of-iron.png')
    expect(blockSpriteFileName('minecraft:waxed_exposed_copper')).toBe(
      'BlockSprite_exposed-copper.png',
    )
    expect(blockSpriteFileName('minecraft:stripped_acacia_wood')).toBe(
      'BlockSprite_stripped-acacia-log.png',
    )
    expect(blockSpriteFileName('minecraft:stripped_warped_stem')).toBe(
      'BlockSprite_stripped-warped-stem-top.png',
    )
    expect(blockSpriteFileName('minecraft:jack_o_lantern')).toBe("BlockSprite_jack-o'lantern.png")
  })
})
