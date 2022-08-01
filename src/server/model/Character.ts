import Matter from 'matter-js'
import { someRaycast, someToPoint } from '../lib/raycast'
import VISION from '../../shared/VISION'
import Input from '../../shared/Input'
import inRange from '../lib/inRange'
import Actor from './Actor'

export default class Character extends Actor {
  static polygons = ['frame', 'rock']
  static it?: Character
  static characters = new Map<number, Character>()
  readonly torso: Matter.Body
  readonly radius: number
  input = new Input()

  constructor ({ x = 0, y = 0, radius = 15, angle = 0, color = 'green' }: {
    x: number
    y: number
    angle?: number
    color?: string
    radius?: number
  }) {
    const torso = Matter.Bodies.circle(x, y, radius)
    super({ x, y, id: torso.id, angle, color, parts: [torso] })
    this.radius = radius
    this.torso = torso
    this.torso.render.fillStyle = color
    this.torso.label = 'torso'
    Character.characters.set(this.id, this)
    if (Character.characters.size === 1) this.makeIt()
  }

  act (): void {
    super.act()
    const vector = { x: 0, y: 0 }
    if (this.input.up) vector.y += -1
    if (this.input.down) vector.y += 1
    if (this.input.left) vector.x += -1
    if (this.input.right) vector.x += 1
    const direction = Matter.Vector.normalise(vector)
    const force = Matter.Vector.mult(direction, 0.00005)
    Matter.Body.applyForce(this.compound, this.compound.position, force)
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
    const filtered = obstacles.filter(obstacle =>
      obstacle.parts.every(obstaclePart => obstaclePart.id !== part.id)
    )
    switch (part.label) {
      case 'wall': {
        return true
      }
      case 'torso': {
        if (!this.isPartInRange(part)) return false
        const diameter = part.bounds.max.x - part.bounds.min.x
        const endRadius = 0.5 * diameter
        const endPerp = Matter.Vector.mult(perp, endRadius)
        const leftEnd = Matter.Vector.add(part.position, endPerp)
        const rightEnd = Matter.Vector.sub(part.position, endPerp)

        const casts = [[this.compound.position, part.position], [leftSide, leftEnd], [rightSide, rightEnd]]
        return someRaycast({ casts, obstacles: filtered })
      }
      default: {
        if (Actor.polygons.includes(part.label)) {
          if (!this.isPartInRange(part)) return false

          const starts = [this.compound.position, leftSide, rightSide]
          return part.vertices.some(vertex => someToPoint({ starts, end: vertex, obstacles: filtered }))
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

  isPartInRange (part: Matter.Body): boolean {
    switch (part.label) {
      case 'wall': {
        return true
      }
      case 'torso': {
        if (part.circleRadius == null) throw new Error('Torso must have a circleRadius')

        const rangeX = VISION.width + part.circleRadius
        const inRangeX = inRange({ start: this.compound.position.x, end: part.position.x, range: rangeX })

        const rangeY = VISION.height + part.circleRadius
        const inRangeY = inRange({ start: this.compound.position.y, end: part.position.y, range: rangeY })

        return inRangeX && inRangeY
      }
      default: {
        if (Actor.polygons.includes(part.label)) {
          return part.vertices.some(vertex => {
            const inRangeX = inRange({ start: this.compound.position.x, end: vertex.x, range: VISION.width })
            const inRangeY = inRange({ start: this.compound.position.y, end: vertex.y, range: VISION.height })

            return inRangeX && inRangeY
          })
        }

        console.warn('Unmatched label:', part.label)
        return true
      }
    }
  }

  getVisibleCompounds ({ compounds, obstacles }: {
    compounds: Matter.Body[]
    obstacles: Matter.Body[]
  }): Matter.Body[] {
    return compounds.filter(compound => this.isVisible({ compound: compound, obstacles }))
  }

  makeIt (): void {
    console.log('makeIt', this.id)
    this.torso.render.fillStyle = 'red'
    if (Character.it != null) Character.it.torso.render.fillStyle = 'green'
    Character.it = this
  }
}
