import Matter from 'matter-js'
import { EAST_VECTOR } from '../shared/math'
import PropActor from './PropActor'
import Stage from './Stage'
import VerticesFeature from './VerticesFeature'

export default class Puppet extends PropActor {
  readonly direction: Matter.Vector
  readonly targetSpeed: number
  readonly force: number
  constructor ({
    blue = PropActor.BLUE,
    density = PropActor.DENSITY,
    direction = EAST_VECTOR,
    force = 0.01,
    green = PropActor.GREEN,
    red = PropActor.RED,
    stage,
    targetSpeed = 0.5,
    vertices = [
      { x: 100, y: 100 },
      { x: 100, y: -100 },
      { x: -100, y: 0 }
    ],
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
    vertices?: Matter.Vector[]
    x: number
    y: number
  }) {
    const figure = new VerticesFeature({ blue, density, green, red, stage, vertices, x, y })
    super({ feature: figure, stage })
    this.feature.body.label = 'puppet'
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
