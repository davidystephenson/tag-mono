import Matter from 'matter-js'
import Feature from './Feature'

export default class Actor extends Feature {
  static paused = false
  static actors = new Map<number, Actor>()
  static polygons = ['frame', 'rock']
  readonly id: number

  constructor ({ x = 0, y = 0, parts = [], id, angle = 0, color = 'green' }: {
    x: number
    y: number
    parts: Matter.Body[]
    id: number
    angle?: number
    color?: string
    radius?: number
  }) {
    super({ parts })
    this.id = id
    Matter.Body.setAngle(this.compound, angle)
    this.compound.restitution = 0
    this.compound.friction = 0
    this.compound.frictionAir = 0.01
    Matter.Body.setCentre(this.compound, { x, y }, false)
    Matter.Body.setInertia(this.compound, 2 * this.compound.inertia)
    Actor.actors.set(this.id, this)
  }

  act (): void {}

  destroy (): void {
    super.destroy()
    Actor.actors.delete(this.id)
  }
}
