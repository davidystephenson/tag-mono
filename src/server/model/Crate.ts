import Matter from 'matter-js'
import Actor from './Actor'
import VISION from '../../shared/VISION'

export default class Crate extends Actor {
  static xMax = VISION.width
  static yMax = VISION.height
  readonly frame: Matter.Body
  readonly radius: number

  constructor ({ x = 0, y = 0, radius = 15, angle = 0, color = 'green' }: {
    x: number
    y: number
    angle?: number
    color?: string
    radius?: number
  }) {
    const torso = Matter.Bodies.rectangle(x, y, 2 * radius, 2 * radius)
    super({ parts: [torso] })
    this.radius = radius
    this.frame = torso
    this.frame.render.fillStyle = color
    this.frame.label = 'frame'
    Matter.Body.setAngle(this.compound, angle)
    this.compound.restitution = 0
    this.compound.friction = 0
    this.compound.frictionAir = 0.01
    Matter.Body.setCentre(this.compound, { x, y }, false)
    Matter.Body.setInertia(this.compound, 2 * this.compound.inertia)
  }
}
