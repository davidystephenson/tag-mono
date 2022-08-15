import Matter from 'matter-js'
import { engine } from '../lib/engine'
import Actor from './Actor'

export default class Feature {
  static features = new Map<number, Feature>()
  static obstacles: Matter.Body[] = []
  readonly body: Matter.Body
  readonly isObstacle: boolean
  actor?: Actor

  constructor ({ body, isObstacle = true }: {
    body: Matter.Body
    isObstacle?: boolean
  }) {
    this.body = body
    this.isObstacle = isObstacle
    Matter.Composite.add(engine.world, this.body)
    this.body.restitution = 1
    this.body.friction = 0
    this.body.frictionAir = 0.01
    Feature.features.set(this.body.id, this)
    if (this.isObstacle) Feature.obstacles.push(this.body)
  }

  isVisible ({ center, viewpoints, obstacles }: {
    center: Matter.Vector
    viewpoints: Matter.Vector[]
    obstacles: Matter.Body[]
  }): boolean {
    return true
  }

  destroy (): void {
    Matter.Composite.remove(engine.world, this.body)
    Feature.features.delete(this.body.id)
    if (this.isObstacle) Feature.obstacles = Feature.obstacles.filter(obstacle => obstacle.id !== this.body.id)
  }
}
