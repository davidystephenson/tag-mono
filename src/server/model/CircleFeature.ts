import Matter from 'matter-js'
import VISION from '../../shared/VISION'
import { isPointInRange } from '../lib/inRange'
import { getSides } from '../lib/math'
import Feature from './Feature'

export default class CircleFeature extends Feature {
  static circleFeatures = new Map<number, CircleFeature>()
  readonly radius: number
  constructor ({ x, y, radius, isObstacle = false, density = 0.001, color = 'gray' }: {
    x: number
    y: number
    radius: number
    isObstacle?: boolean
    density?: number
    color?: string
  }) {
    const body = Matter.Bodies.circle(x, y, radius)
    super({ body, isObstacle, density, color })
    this.radius = radius
    CircleFeature.circleFeatures.set(this.body.id, this)
  }

  destroy (): void {
    super.destroy()
    CircleFeature.circleFeatures.delete(this.body.id)
  }

  getSides (point: Matter.Vector): Matter.Vector[] {
    return getSides({
      start: this.body.position,
      end: point,
      radius: this.radius
    })
  }

  isVisible ({ center, radius }: {
    center: Matter.Vector
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
    return Feature.isPointVisionClear({
      start: center,
      end: this.body.position,
      startRadius: radius,
      endRadius: this.radius
    })
  }
}
