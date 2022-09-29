import Matter from 'matter-js'
import { EAST_VECTOR } from '../lib/directions'
import Actor from './Actor'
import VerticesFeature from './VerticesFeature'

export default class Puppet extends Actor {
  readonly direction: Matter.Vector
  readonly targetSpeed: number
  readonly force: number
  constructor ({
    color = Actor.SCENERY_COLOR,
    density = Actor.SCENERY_DENSITY,
    direction = EAST_VECTOR,
    force = 0.001,
    targetSpeed = 0.5,
    vertices,
    x,
    y
  }: {
    color?: string
    density?: number
    direction?: Matter.Vector
    force?: number
    targetSpeed?: number
    vertices: Matter.Vector[]
    x: number
    y: number
  }) {
    const figure = new VerticesFeature({ x, y, vertices, density, color })
    super({ feature: figure })
    this.feature.body.label = 'figure'
    this.direction = direction
    this.targetSpeed = targetSpeed
    this.force = force
  }

  act (): void {
    super.act()
    if (this.feature.body.speed < this.targetSpeed) {
      const magnified = Matter.Vector.mult(this.direction, this.force)
      Matter.Body.applyForce(this.feature.body, this.feature.body.position, magnified)
    }
  }

  characterCollide ({ actor, delta, normal }: {
    actor: Actor
    delta?: number
    normal: Matter.Vector
  }): void {
    super.characterCollide({ actor, delta, normal })
    this.dent({ actor, delta, normal })
  }
}
