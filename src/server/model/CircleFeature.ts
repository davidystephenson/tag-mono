import Matter from 'matter-js'
import VISION from '../../shared/VISION'
import { isPointInRange } from '../lib/inRange'
import { getSides } from '../lib/math'
import { isPointVisionClear } from '../lib/raycast'
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

  isVisible ({ center, radius, obstacles }: {
    center: Matter.Vector
    radius: number
    obstacles: Matter.Body[]
  }): boolean {
    const inRange = this.body.vertices.some(vertex => isPointInRange({
      start: center, end: vertex, xRange: VISION.width, yRange: VISION.height
    }))
    if (!inRange) return false
    return isPointVisionClear({
      start: center,
      end: this.body.position,
      startRadius: radius,
      endRadius: this.radius,
      obstacles
    })
  }
}
