import Matter from 'matter-js'
import Input from '../../shared/Input'
import Fighter from './Fighter'
import raycast from '../lib/raycast'

export const players = new Map<string, Player>()

export default class Player extends Fighter {
  readonly socketId: string
  input = new Input()
  direction: Matter.Vector

  constructor ({ x = 0, y = 0, socketId }: {
    x: number
    y: number
    socketId: string
  }) {
    super({ x, y })
    this.socketId = socketId
    this.direction = { x: 0, y: 0 }
    players.set(this.socketId, this)
  }

  isVisible (body: Matter.Body, obstacles: Matter.Body[]): boolean {
    const part = body.parts.find(part => {
      if (part.label === 'wall') return true
      if (part.label === 'torso') {
        const start = this.compound.position
        const end = part.position
        const direction = Matter.Vector.normalise(Matter.Vector.sub(end, start))
        const perp = Matter.Vector.perp(direction)
        const startRadius = this.radius
        const endRadius = 0.5 * Math.max(part.bounds.max.x - part.bounds.min.x, part.bounds.max.y - part.bounds.min.y)
        const startPerp = Matter.Vector.mult(perp, startRadius)
        const endPerp = Matter.Vector.mult(perp, endRadius)
        const start1 = Matter.Vector.add(start, startPerp)
        const start2 = Matter.Vector.sub(start, startPerp)
        const end1 = Matter.Vector.add(end, endPerp)
        const end2 = Matter.Vector.sub(end, endPerp)
        return raycast({ start, end, obstacles }) ||
          raycast({ start: start1, end: end1, obstacles }) ||
          raycast({ start: start2, end: end2, obstacles })
      } else return false
    })
    if (part == null) return false
    else return true
  }
}
