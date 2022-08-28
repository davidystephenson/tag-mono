import Matter from 'matter-js'
import { EAST_VECTOR } from '../lib/directions'
import Actor from './Actor'
import Figure from './Figure'

export default class Puppet extends Actor {
  readonly direction: Matter.Vector
  readonly targetSpeed: number
  readonly force: number

  constructor ({
    x,
    y,
    vertices,
    density = 0.0005,
    targetSpeed = 0.5,
    force = 0.01,
    direction = EAST_VECTOR,
    color = 'aqua'
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
    const figure = new Figure({ x, y, vertices, density })
    super({ feature: figure })
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

  characterCollide ({ actor }: { actor: Actor }): void {
    super.characterCollide({ actor })
    this.dent()
  }
}
