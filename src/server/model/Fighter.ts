import Matter from 'matter-js'
import Actor from './Actor'

export default class Fighter extends Actor {
  readonly torso: Matter.Body

  constructor ({ x = 0, y = 0, angle = 0, color = 'Orange' }: {
    x: number
    y: number
    angle?: number
    color?: string
  }) {
    const torso = Matter.Bodies.circle(x, y, 15)
    super({ parts: [torso] })
    this.torso = torso
    this.torso.render.fillStyle = color
    this.torso.label = 'torso'
    Matter.Body.setAngle(this.compound, angle)
    this.compound.restitution = 0
    this.compound.friction = 0
    this.compound.frictionAir = 0.01
    Matter.Body.setCentre(this.compound, { x, y }, false)
    Matter.Body.setInertia(this.compound, 2 * this.compound.inertia)
  }
}
