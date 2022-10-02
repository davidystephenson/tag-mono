import Matter from 'matter-js'
import { engine } from '../lib/engine'
import Actor from './Actor'
import Stage from './Stage'

export default class Feature {
  static features = new Map<number, Feature>()
  static scenery: Matter.Body[] = []
  static bodies: Matter.Body[] = []

  actor?: Actor
  readonly body: Matter.Body
  readonly isObstacle: boolean
  readonly stage: Stage
  constructor ({ body, color = 'gray', density = 0.001, isObstacle = true, stage }: {
    body: Matter.Body
    color?: string
    density?: number
    isObstacle?: boolean
    stage: Stage
  }) {
    this.body = body
    this.stage = stage
    this.body.render.fillStyle = color
    this.body.render.strokeStyle = color
    this.isObstacle = isObstacle
    Matter.Composite.add(engine.world, this.body)
    this.body.restitution = 0
    this.body.friction = 0
    this.body.frictionAir = 0.01
    Matter.Body.setDensity(this.body, density)
    Feature.features.set(this.body.id, this)
    Feature.bodies.push(this.body)
    if (this.isObstacle) Feature.scenery.push(this.body)
  }

  getArea (): number {
    return Matter.Vertices.area(this.body.vertices, true)
  }

  isClear ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    return true
  }

  isVisible ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    return true
  }

  destroy (): void {
    Matter.Composite.remove(engine.world, this.body)
    Feature.features.delete(this.body.id)
    if (this.isObstacle) Feature.scenery = Feature.scenery.filter(obstacle => obstacle.id !== this.body.id)
  }
}
