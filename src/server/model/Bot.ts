import yeast from 'yeast'
import Matter from 'matter-js'
import Input, { STILL } from '../../shared/Input'
import Character from './Character'
import { getRadiansInput } from '../lib/radians'

export default class Bot extends Character {
  constructor ({ x = 0, y = 0, radius = 15, angle = 0, color = 'green' }: {
    x: number
    y: number
    angle?: number
    color?: string
    radius?: number
  }) {
    const socketId = yeast()
    super({ x, y, socketId, angle, color, radius })
  }

  takeInput (input: Partial<Input>): void {
    this.input = { ...this.input, ...input }
  }

  choose (): Partial<Input> {
    if (Character.it === this) {
      const { enemy } = Array.from(Character.characters.values()).reduce<{ enemy?: Character, distance: number}>((closest, character) => {
        if (character === this) return closest

        const distance = Matter.Vector.sub(character.compound.position, this.compound.position)
        const magnitude = Matter.Vector.magnitude(distance)
        if (magnitude < closest.distance) {
          closest.enemy = character
          closest.distance = magnitude
        }

        return closest
      }, { distance: Infinity })

      if (enemy != null) {
        const radians = Matter.Vector.angle(this.compound.position, enemy.compound.position)
        const input = getRadiansInput(radians)

        return input
      }
    }

    return STILL
  }

  act (): void {
    const choice = this.choose()
    this.takeInput(choice)

    super.act()
  }
}
