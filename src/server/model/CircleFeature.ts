import Matter from 'matter-js'
import VISION from '../../shared/VISION'
import { isPointInRange } from '../lib/inRange'
import { getSides } from '../lib/math'
import { isCircleShown } from '../lib/raycast'
import Feature from './Feature'
import Stage from './Stage'

export default class CircleFeature extends Feature {
  static circleFeatures = new Map<number, CircleFeature>()

  readonly radius: number
  constructor ({ color = 'gray', density = 0.001, isObstacle = false, radius, stage, x, y }: {
    color?: string
    density?: number
    isObstacle?: boolean
    radius: number
    stage: Stage
    x: number
    y: number
  }) {
    const body = Matter.Bodies.circle(x, y, radius)
    super({ body, color, density, isObstacle, stage })
    this.radius = radius
    CircleFeature.circleFeatures.set(this.body.id, this)
  }

  destroy (): void {
    super.destroy()
    CircleFeature.circleFeatures.delete(this.body.id)
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
    return isCircleShown({
      debug,
      obstacles: Feature.scenery,
      end: this.body.position,
      endRadius: this.radius,
      start: center,
      startRadius: radius
    })
  }
}
