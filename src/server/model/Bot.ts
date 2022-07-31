import yeast from 'yeast'
import Matter from 'matter-js'
import Input, { STILL } from '../../shared/Input'
import Character from './Character'
import { getRadiansInput } from '../lib/angles'

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

  act (): void {
    if (Character.it === this) {
      const { enemy } = Array.from(Character.characters.values()).reduce<{ enemy?: Character, minDist: number}>((closest, character) => {
        if (character === this) return closest

        const distance = Matter.Vector.sub(character.compound.position, this.compound.position)
        const magnitude = Matter.Vector.magnitude(distance)
        if (magnitude < closest.minDist) {
          closest.enemy = character
          closest.minDist = magnitude
        }

        return closest
      }, { minDist: Infinity })

      if (enemy != null) {
        const radians = Matter.Vector.angle(this.compound.position, enemy.compound.position)
        const input = getRadiansInput(radians)
        this.takeInput(input)
      }
    } else {
      this.takeInput(STILL)
    }

    super.act()
  }
}
