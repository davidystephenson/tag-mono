import Matter from 'matter-js'
import { EAST_VECTOR } from '../lib/directions'
import Actor from './Actor'

export default class Puppet extends Actor {
  readonly figure: Matter.Body
  readonly direction: Matter.Vector
  readonly targetSpeed: number
  readonly force: number

  constructor ({
    x,
    y,
    vertices,
    density = 0.0001,
    targetSpeed = 0.5,
    force = 0.00001,
    direction = EAST_VECTOR,
    color = 'green'
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
    const figure = Matter.Bodies.fromVertices(x, y, [vertices])
    super({ x, y, id: figure.id, color, parts: [figure] })
    this.figure = figure
    this.figure.render.fillStyle = color
    this.figure.label = 'rock'
    Matter.Body.setDensity(this.compound, density)
    this.direction = direction
    this.targetSpeed = targetSpeed
    this.force = force
  }

  act (): void {
    super.act()
    if (this.compound.speed < this.targetSpeed) {
      const magnified = Matter.Vector.mult(this.direction, this.force)
      Matter.Body.applyForce(this.compound, this.compound.position, magnified)
    }
  }
}
