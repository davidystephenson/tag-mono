import Matter from 'matter-js'
import { EAST_VECTOR } from '../shared/math'
import Scenery from './Scenery'
import Stage from './Stage'
import VerticesFeature from './VerticesFeature'

export default class Puppet extends Scenery {
  readonly direction: Matter.Vector
  readonly targetSpeed: number
  readonly force: number
  constructor ({
    blue = Scenery.BLUE,
    density = Scenery.DENSITY,
    direction = EAST_VECTOR,
    force = 0.001,
    green = Scenery.GREEN,
    red = Scenery.RED,
    stage,
    targetSpeed = 0.5,
    vertices,
    x,
    y
  }: {
    blue?: number
    density?: number
    direction?: Matter.Vector
    force?: number
    green?: number
    red?: number
    stage: Stage
    targetSpeed?: number
    vertices: Matter.Vector[]
    x: number
    y: number
  }) {
    const figure = new VerticesFeature({ blue, density, green, red, stage, vertices, x, y })
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
}
