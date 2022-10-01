import Matter from 'matter-js'
import { EAST_VECTOR } from '../lib/directions'
import Actor from './Actor'
import Stage from './Stage'
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
    stage,
    targetSpeed = 0.5,
    vertices,
    x,
    y
  }: {
    color?: string
    density?: number
    direction?: Matter.Vector
    force?: number
    stage: Stage
    targetSpeed?: number
    vertices: Matter.Vector[]
    x: number
    y: number
  }) {
    const figure = new VerticesFeature({ color, density, stage, vertices, x, y })
    super({ feature: figure, stage })
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
