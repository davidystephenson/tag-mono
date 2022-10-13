import Matter from 'matter-js'
import VISION from '../../shared/VISION'
import { isPointInRange } from '../lib/inRange'
import { getSides } from '../../shared/math'
import Feature from './Feature'
import Stage from './Stage'

export default class CircleFeature extends Feature {
  readonly radius: number
  constructor ({ blue = 128, density = 0.001, green = 128, isObstacle = false, radius, red = 128, stage, x, y }: {
    blue?: number
    density?: number
    green?: number
    isObstacle?: boolean
    radius: number
    red?: number
    stage: Stage
    x: number
    y: number
  }) {
    const body = Matter.Bodies.circle(x, y, radius)
    super({ body, blue, density, green, isObstacle, red, stage })
    this.radius = radius
  }

  getArea (): number {
    return Math.PI * this.radius * this.radius
  }

  getSides (point: Matter.Vector): Matter.Vector[] {
    return getSides({
      start: this.body.position,
      end: point,
      radius: this.radius
    })
  }

  isClear ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    return this.isVisible({ center, radius })
  }

  isVisible ({ center, debug, radius }: {
    center: Matter.Vector
    debug?: boolean
    radius: number
  }): boolean {
    const arrow = Matter.Vector.sub(center, this.body.position)
    const direction = Matter.Vector.normalise(arrow)
    const magnified = Matter.Vector.mult(direction, this.radius)
    const closest = Matter.Vector.add(this.body.position, magnified)
    const inRange = isPointInRange({
      start: center, end: closest, xRange: VISION.width, yRange: VISION.height
    })
    if (!inRange) return false
    return this.stage.raycast.isCircleShown({
      debug,
      obstacles: this.stage.scenery,
      end: this.body.position,
      endRadius: this.radius,
      start: center,
      startRadius: radius
    })
  }
}
