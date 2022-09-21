import Matter from 'matter-js'
import { engine } from '../lib/engine'
import { isPointClear, isPointOpen, isCircleShown, isPointShown } from '../lib/raycast'
import Actor from './Actor'
import Wall from './Wall'

export default class Feature {
  static features = new Map<number, Feature>()
  static scenery: Matter.Body[] = []
  static bodies: Matter.Body[] = []
  static isPointClear ({ start, end, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    debug?: boolean
  }): boolean {
    return isPointClear({ start, end, obstacles: Feature.bodies, debug })
  }

  static isPointOpen ({ start, end, radius, body, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
    body: Matter.Body
    debug?: boolean
  }): boolean {
    const bodies = Feature.bodies.filter(element => element !== body)
    return isPointOpen({
      start, end, radius, obstacles: bodies, debug
    })
  }

  static isPointX ({ start, end, radius, body, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
    body: Matter.Body
    debug?: boolean
  }): boolean {
    const bodies = Wall.wallObstacles.filter(element => element !== body)
    return isPointShown({
      start, end, radius, obstacles: bodies, debug
    })
  }

  static isPointShown ({ start, end, radius, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
    debug?: boolean
  }): boolean {
    return isPointShown({
      start, end, radius, obstacles: Feature.scenery, debug
    })
  }

  static isCircleShown ({ start, end, startRadius, endRadius, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    startRadius: number
    endRadius: number
    debug?: boolean
  }): boolean {
    return isCircleShown({
      start, end, startRadius, endRadius, obstacles: Feature.scenery, debug
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
    this.body.restitution = 0
    this.body.friction = 0
    this.body.frictionAir = 0.01
    Matter.Body.setDensity(this.body, density)
    Feature.features.set(this.body.id, this)
    // console.log('feature id test:', this.body.id)
    Feature.bodies.push(this.body)
    if (this.isObstacle) Feature.scenery.push(this.body)
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
