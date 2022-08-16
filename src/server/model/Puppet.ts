import Matter from 'matter-js'
import { EAST_VECTOR } from '../lib/directions'
import Actor from './Actor'
import VerticesFeature from './VerticesFeature'

export default class Puppet extends Actor {
  readonly direction: Matter.Vector
  readonly targetSpeed: number
  readonly force: number

  constructor ({
    x,
    y,
    vertices,
    density = 0.0001,
    targetSpeed = 0.5,
    force = 0.01,
    direction = EAST_VECTOR,
    color = 'blue'
  }: {
    x: number
    y: number
    vertices: Matter.Vector[]
    density?: number
    targetSpeed?: number
    force?: number
    direction?: Matter.Vector
    color?: string
  }) {
    const feature = new VerticesFeature({ x, y, vertices, density })
    super({ feature })
    this.feature.body.render.fillStyle = color
    this.feature.body.label = 'rock'
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
