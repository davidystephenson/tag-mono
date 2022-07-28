import Matter from 'matter-js'
import Actor from './Actor'
import { someRaycast, someToPoint } from '../lib/raycast'
import VISION from '../../shared/VISION'
import Input from '../../shared/Input'
import inRange from '../lib/inRange'

export default class Character extends Actor {
  static paused = false
  static characters = new Map<string, Character>()
  static polygons = ['frame', 'rock']
  static it?: Character
  static xMax = VISION.width
  static yMax = VISION.height
  readonly torso: Matter.Body
  readonly radius: number
  readonly id: string
  input = new Input()

  constructor ({ x = 0, y = 0, id, radius = 15, angle = 0, color = 'green' }: {
    x: number
    y: number
    id: string
    angle?: number
    color?: string
    radius?: number
  }) {
    const torso = Matter.Bodies.circle(x, y, radius)
    super({ parts: [torso] })
    this.id = id
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
    Character.characters.set(this.id, this)
    if (Character.characters.size === 1) this.makeIt()
  }

  update (): void {
    const vector = { x: 0, y: 0 }
    if (this.input.up) vector.y += -1
    if (this.input.down) vector.y += 1
    if (this.input.left) vector.x += -1
    if (this.input.right) vector.x += 1
    const direction = Matter.Vector.normalise(vector)
    const force = Matter.Vector.mult(direction, 0.00005)
    Matter.Body.applyForce(this.compound, this.compound.position, force)
  }

  destroy (): void {
    super.destroy()
    Character.characters.delete(this.id)
  }

  isPartVisible ({ part, obstacles }: {
    part: Matter.Body
    obstacles: Matter.Body[]
  }): boolean {
    const direction = Matter.Vector.normalise(Matter.Vector.sub(part.position, this.compound.position))
    const perp = Matter.Vector.perp(direction)
    const startPerp = Matter.Vector.mult(perp, this.radius)
    const leftSide = Matter.Vector.add(this.compound.position, startPerp)
    const rightSide = Matter.Vector.sub(this.compound.position, startPerp)

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

        const casts = [[this.compound.position, part.position], [leftSide, leftEnd], [rightSide, rightEnd]]
        return someRaycast({ casts, obstacles })
      }
      default: {
        if (Character.polygons.includes(part.label)) {
          if (!this.isPartInRange(part)) return false

          const starts = [this.compound.position, leftSide, rightSide]
          return part.vertices.some(vertex => someToPoint({ starts, end: vertex, obstacles }))
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

  isCircleInRange ({ part, maximum }: {
    part: Matter.Body
    maximum: number
  }): boolean {
    if (part.circleRadius == null) throw new Error('Circle must have a circleRadius')

    const range = maximum + part.circleRadius
    return inRange({ start: this.compound.position.x, end: part.position.x, range })
  }

  isPolygonInRange (part: Matter.Body): boolean {
    return part.vertices.some(vertex => {
      const inRangeX = inRange({ start: this.compound.position.x, end: vertex.x, range: Character.xMax })
      const inRangeY = inRange({ start: this.compound.position.y, end: vertex.y, range: Character.yMax })

      return inRangeX && inRangeY
    })
  }

  isPartInRange (part: Matter.Body): boolean {
    switch (part.label) {
      case 'wall': {
        return true
      }
      case 'torso': {
        if (part.circleRadius == null) throw new Error('Torso must have a circleRadius')

        const rangeX = Character.xMax + part.circleRadius
        const inRangeX = inRange({ start: this.compound.position.x, end: part.position.x, range: rangeX })

        const rangeY = Character.yMax + part.circleRadius
        const inRangeY = inRange({ start: this.compound.position.y, end: part.position.y, range: rangeY })

        return inRangeX && inRangeY
      }
      default: {
        if (Character.polygons.includes(part.label)) {
          return this.isPolygonInRange(part)
        }

        console.warn('Unmatched label:', part.label)
        return true
      }
    }
  }

  makeIt (): void {
    console.log('makeIt', this.id)
    this.torso.render.fillStyle = 'red'
    if (Character.it != null) Character.it.torso.render.fillStyle = 'green'
    Character.it = this
  }
}
