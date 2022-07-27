import Character from './Character'
import yeast from 'yeast'
import Matter from 'matter-js'

export default class Bot extends Character {
  constructor ({ x = 0, y = 0, radius = 15, angle = 0, color = 'green' }: {
    x: number
    y: number
    angle?: number
    color?: string
    radius?: number
  }) {
    const id = yeast()
    super({ x, y, id, angle, color, radius })
  }

  update (): void {
    if (Character.it === this) {
      let minDist = Infinity
      let closest
      for (const [, character] of Character.characters) {
        if (character !== this) {
          const vector = Matter.Vector.sub(character.compound.position, this.compound.position)
          const dist = Matter.Vector.magnitude(vector)
          if (dist < minDist) {
            closest = character
            minDist = dist
          }
        }
      }
      if (closest != null) {
        const angle = Matter.Vector.angle(this.compound.position, closest.compound.position) / Math.PI
        // console.log(angle)
        if (-1 / 8 <= angle && angle < 1 / 8) {
          // console.log('RIGHT')
          this.input.up = false
          this.input.down = false
          this.input.left = false
          this.input.right = true
        } else if (-3 / 8 <= angle && angle < -1 / 8) {
          // console.log('UP RIGHT')
          this.input.up = true
          this.input.down = false
          this.input.left = false
          this.input.right = true
        } else if (-5 / 8 <= angle && angle < -3 / 8) {
          // console.log('UP')
          this.input.up = true
          this.input.down = false
          this.input.left = false
          this.input.right = false
        } else if (-7 / 8 <= angle && angle < -5 / 8) {
          // console.log('UP LEFT')
          this.input.up = true
          this.input.down = false
          this.input.left = true
          this.input.right = false
        } else if (1 / 8 <= angle && angle < 3 / 8) {
          // console.log('DOWN RIGHT')
          this.input.up = false
          this.input.down = true
          this.input.left = false
          this.input.right = true
        } else if (3 / 8 <= angle && angle < 5 / 8) {
          // console.log('DOWN')
          this.input.up = false
          this.input.down = true
          this.input.left = false
          this.input.right = false
        } else if (5 / 8 <= angle && angle < 7 / 8) {
          // console.log('DOWN LEFT')
          this.input.up = false
          this.input.down = true
          this.input.left = true
          this.input.right = false
        } else {
          // console.log('LEFT')
          this.input.up = false
          this.input.down = false
          this.input.left = true
          this.input.right = false
        }
      }
    } else {
      this.input.up = false
      this.input.down = false
      this.input.left = false
      this.input.right = false
    }
    super.update()
  }
}
