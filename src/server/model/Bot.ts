import yeast from 'yeast'
import Matter from 'matter-js'
import Input, { DOWN_INPUT, DOWN_LEFT_INPUT, DOWN_RIGHT_INPUT, LEFT_INPUT, RIGHT_INPUT, STILL_INPUT, UP_INPUT, UP_LEFT_INPUT, UP_RIGHT_INPUT } from '../../shared/Input'
import Character from './Character'

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

  takeInput (input: Input): void {
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
        const angle = Matter.Vector.angle(this.compound.position, enemy.compound.position) / Math.PI
        // console.log(angle)
        if (-1 / 8 <= angle && angle < 1 / 8) {
          this.takeInput(RIGHT_INPUT)
        } else if (-3 / 8 <= angle && angle < -1 / 8) {
          this.takeInput(UP_RIGHT_INPUT)
        } else if (-5 / 8 <= angle && angle < -3 / 8) {
          this.takeInput(UP_INPUT)
        } else if (-7 / 8 <= angle && angle < -5 / 8) {
          this.takeInput(UP_LEFT_INPUT)
        } else if (1 / 8 <= angle && angle < 3 / 8) {
          this.takeInput(DOWN_RIGHT_INPUT)
        } else if (3 / 8 <= angle && angle < 5 / 8) {
          this.takeInput(DOWN_INPUT)
        } else if (5 / 8 <= angle && angle < 7 / 8) {
          this.takeInput(DOWN_LEFT_INPUT)
        } else {
          this.takeInput(LEFT_INPUT)
        }
      }
    } else {
      this.takeInput(STILL_INPUT)
    }

    super.act()
  }
}
