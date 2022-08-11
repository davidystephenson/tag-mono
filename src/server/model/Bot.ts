import Matter from 'matter-js'
import Character from './Character'
import { getRadiansInput as getRadiansControls } from '../lib/radians'
import Controls, { STILL } from '../../shared/controls'
import { raycast } from '../lib/raycast'
import Wall from './Wall'

export default class Bot extends Character {
  static oldest: Bot
  static bots = new Map<number, Bot>()

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color, radius })
    if (Bot.bots.size === 1) Bot.oldest = this
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }

  choose (): Partial<Controls> {
    const visibleFeatures = this.getVisibleFeatures()
    let itVisible = false
    const visibleCharacterFeatures = visibleFeatures.filter(feature => feature.body.label === 'character')
    const visibleCharacters = visibleCharacterFeatures.map(feature => {
      if (feature.actor === Character.it) itVisible = true
      return feature.actor as Character
    })
    if (Character.it === this) {
      const closest: { distance: number, enemy?: Character } = { distance: Infinity }
      for (const character of visibleCharacters) {
        if (character !== this) {
          const distance = Matter.Vector.sub(character.feature.body.position, this.feature.body.position)
          const magnitude = Matter.Vector.magnitude(distance)

          if (magnitude < closest.distance) {
            closest.enemy = character
            closest.distance = magnitude
          }
        }
      }

      if (closest.enemy != null) {
        const radians = Matter.Vector.angle(this.feature.body.position, closest.enemy.feature.body.position)
        const controls = getRadiansControls(radians)

        return controls
      }
    } else if (itVisible && Character.it != null) {
      const radians = Matter.Vector.angle(Character.it.feature.body.position, this.feature.body.position)
      const controls = getRadiansControls(radians)
      return controls
    }
    return STILL
  }

  act (): void {
    const choice = this.choose()
    this.takeInput(choice)
    raycast({
      start: this.feature.body.position,
      end: { x: 0, y: 0 },
      obstacles: Wall.wallObstacles
    })
    super.act()
  }
}
