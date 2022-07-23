import Matter from 'matter-js'
import Actor from './Actor'
import { someRaycast } from '../lib/raycast'
import VISION from '../../shared/VISION'

export default class Fighter extends Actor {
  static polygons = ['frame', 'rock']
  static it?: Fighter
  static xMax = VISION.width
  static yMax = VISION.height
  readonly torso: Matter.Body
  readonly radius: number
  leftSide?: Matter.Vector
  rightSide?: Matter.Vector

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

  findSides (perp: Matter.Vector): void {
    const startPerp = Matter.Vector.mult(perp, this.radius)

    this.leftSide = Matter.Vector.add(this.compound.position, startPerp)
    this.rightSide = Matter.Vector.sub(this.compound.position, startPerp)
  }

  isPointVisible ({ point, obstacles, center }: {
    point: Matter.Vector
    obstacles: Matter.Body[]
    center: Matter.Vector
  }): boolean {
    if (this.leftSide == null || this.rightSide == null) throw new Error('Sides not found')

    const casts = [[this.compound.position, point], [this.leftSide, point], [this.rightSide, point]]

    return someRaycast({ casts, obstacles })
  }

  isPolygonVisible ({ part, obstacles }: {
    part: Matter.Body
    obstacles: Matter.Body[]
  }): boolean {
    if (!this.isPartInRange(part)) return false

    return part.vertices.some(vertex => this.isPointVisible({
      point: vertex, obstacles, center: this.compound.position
    }))
  }

  isPartVisible ({ part, obstacles }: {
    part: Matter.Body
    obstacles: Matter.Body[]
  }): boolean {
    const direction = Matter.Vector.normalise(Matter.Vector.sub(part.position, this.compound.position))
    const perp = Matter.Vector.perp(direction)
    this.findSides(direction)

    if (this.leftSide == null || this.rightSide == null) throw new Error('Sides not found')

    switch (part.label) {
      case 'wall': {
        return true
      }
      case 'torso': {
        if (!this.isPartInRange(part)) return false

        const endRadius = 0.5 * Math.max(part.bounds.max.x - part.bounds.min.x, part.bounds.max.y - part.bounds.min.y)
        const endPerp = Matter.Vector.mult(perp, endRadius)
        const leftEnd = Matter.Vector.add(part.position, endPerp)
        const rightEnd = Matter.Vector.sub(part.position, endPerp)

        const casts = [[this.compound.position, part.position], [this.leftSide, leftEnd], [this.rightSide, rightEnd]]
        return someRaycast({ casts, obstacles })
      }
      default: {
        if (Fighter.polygons.includes(part.label)) {
          return this.isPolygonVisible({ part, obstacles })
        }

        return true
      }
    }
  }

  isVisible ({ compound, obstacles }: {compound: Matter.Body, obstacles: Matter.Body[]}): boolean {
    const part = compound.parts.slice(1).find(part => this.isPartVisible({ part, obstacles }))
    const isVisible = part != null

    return isVisible
  }

  isPolygonInRange (part: Matter.Body): boolean {
    return part.vertices.some(vertex => {
      const inRangeX = Math.abs(this.compound.position.x - vertex.x) < Fighter.xMax
      const inRangeY = Math.abs(this.compound.position.y - vertex.y) < Fighter.yMax

      return inRangeX && inRangeY
    })
  }

  isPartInRange (part: Matter.Body): boolean {
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
        if (Fighter.polygons.includes(part.label)) {
          return this.isPolygonInRange(part)
        }

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
