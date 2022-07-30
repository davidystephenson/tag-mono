import Matter from 'matter-js'
import Actor from './Actor'

export default class Puppet extends Actor {
  readonly figure: Matter.Body
  readonly direction: Matter.Vector
  readonly targetSpeed: number

  constructor ({ x, y, vertices, targetSpeed, direction, color = 'green' }: {
    x: number
    y: number
    vertices: Matter.Vector[]
    targetSpeed: number
    direction: Matter.Vector
    color?: string
  }) {
    const figure = Matter.Bodies.fromVertices(x, y, [vertices])
    super({ x, y, id: figure.id, color, parts: [figure] })
    this.figure = figure
    this.figure.render.fillStyle = color
    this.figure.label = 'rock'
    Matter.Body.setDensity(this.compound, 0.00001)
    this.direction = direction
    this.targetSpeed = targetSpeed
  }

  act (): void {
    super.act()
    if (this.compound.speed < this.targetSpeed) {
      const force = Matter.Vector.mult(this.direction, 0.00001)
      Matter.Body.applyForce(this.compound, this.compound.position, force)
    }
  }
}
