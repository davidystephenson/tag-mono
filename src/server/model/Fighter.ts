import Matter from 'matter-js'
import Actor from './Actor'
import raycast from '../lib/raycast'
import VISION from '../../shared/VISION'

export default class Fighter extends Actor {
  static it?: Fighter
  static xMax = VISION.width
  static yMax = VISION.height
  readonly torso: Matter.Body
  readonly radius: number

  constructor ({ x = 0, y = 0, radius = 15, angle = 0, color = 'green' }: {
    x: number
    y: number
    angle?: number
    color?: string
    radius?: number
  }) {
    const torso = Matter.Bodies.circle(x, y, radius)
    super({ parts: [torso] })
    this.radius = radius
    this.torso = torso
    this.torso.render.fillStyle = color
    this.torso.label = 'torso'
    Matter.Body.setAngle(this.compound, angle)
    this.compound.restitution = 0
    this.compound.friction = 0
    this.compound.frictionAir = 0.01
    Matter.Body.setCentre(this.compound, { x, y }, false)
    Matter.Body.setInertia(this.compound, 2 * this.compound.inertia)
  }

  isPartVisible (part: Matter.Body, obstacles: Matter.Body[]): boolean {
    switch (part.label) {
      case 'wall': {
        return true
      }
      case 'torso': {
        if (!this.isInRange(part)) return false
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
      }
      default: {
        return true
      }
    }
  }

  isVisible (body: Matter.Body, obstacles: Matter.Body[]): boolean {
    const part = body.parts.slice(1).find(part => this.isPartVisible(part, obstacles))
    const isVisible = part != null

    return isVisible
  }

  isInRange (part: Matter.Body): boolean {
    switch (part.label) {
      case 'wall': {
        return true
      }
      case 'torso': {
        const start = this.compound.position
        const end = part.position
        if (part.circleRadius == null) throw new Error('Torso must have a circleRadius')
        const inRangeX = Math.abs(start.x - end.x) < Fighter.xMax + part.circleRadius
        const inRangeY = Math.abs(start.y - end.y) < Fighter.yMax + part.circleRadius
        return inRangeX && inRangeY
      }
      default: {
        console.warn('Unmatched label:', part.label)
        return true
      }
    }
  }

  makeIt (): void {
    this.torso.render.fillStyle = 'red'
    if (Fighter.it != null) Fighter.it.torso.render.fillStyle = 'green'
    Fighter.it = this
  }
}
