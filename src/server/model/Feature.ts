import Matter from 'matter-js'
import { engine } from '../lib/engine'
import { isPointClear, isPointReachable, isPointVisionClear } from '../lib/raycast'
import Actor from './Actor'

export default class Feature {
  static features = new Map<number, Feature>()
  static obstacles: Matter.Body[] = []
  static isPointClear ({ start, end, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    debug?: boolean
  }): boolean {
    return isPointClear({ start, end, obstacles: Feature.obstacles, debug })
  }

  static isPointReachable ({ start, end, radius, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
    debug?: boolean
  }): boolean {
    return isPointReachable({
      start, end, radius, obstacles: Feature.obstacles, debug
    })
  }

  static isPointVisionClear ({ start, end, startRadius, endRadius, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    startRadius: number
    endRadius: number
    debug?: boolean
  }): boolean {
    return isPointVisionClear({
      start, end, startRadius, endRadius, obstacles: Feature.obstacles, debug
    })
  }

  readonly body: Matter.Body
  readonly isObstacle: boolean
  actor?: Actor

  constructor ({ body, isObstacle = true, density = 0.001, color = 'gray' }: {
    body: Matter.Body
    isObstacle?: boolean
    density?: number
    color?: string
  }) {
    this.body = body
    this.body.render.fillStyle = color
    this.body.render.strokeStyle = color
    this.isObstacle = isObstacle
    Matter.Composite.add(engine.world, this.body)
    this.body.restitution = 1
    this.body.friction = 0
    this.body.frictionAir = 0.01
    Matter.Body.setDensity(this.body, density)
    Feature.features.set(this.body.id, this)
    if (this.isObstacle) Feature.obstacles.push(this.body)
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
    if (this.isObstacle) Feature.obstacles = Feature.obstacles.filter(obstacle => obstacle.id !== this.body.id)
  }
}
