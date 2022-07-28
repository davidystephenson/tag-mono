import Matter from 'matter-js'
import Actor from './Actor'

export default class Boulder extends Actor {
  readonly rock: Matter.Body

  constructor ({ x, y, vertices, color = 'green' }: {
    x: number
    y: number
    vertices: Matter.Vector[]
    color?: string
  }) {
    const rock = Matter.Bodies.fromVertices(x, y, [vertices])
    super({ parts: [rock] })
    this.rock = rock
    this.rock.render.fillStyle = color
    this.rock.label = 'rock'
    this.compound.restitution = 0
    this.compound.friction = 0
    this.compound.frictionAir = 0.01
    Matter.Body.setCentre(this.compound, { x, y }, false)
    Matter.Body.setInertia(this.compound, 2 * this.compound.inertia)
  }
}
