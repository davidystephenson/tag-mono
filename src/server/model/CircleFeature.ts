import Matter from 'matter-js'
import VISION from '../../shared/VISION'
import { isPointInRange } from '../lib/inRange'
import { isSomeStartClear } from '../lib/raycast'
import Feature from './Feature'

export default class CircleFeature extends Feature {
  static circleFeatures = new Map<number, CircleFeature>()
  readonly radius: number
  constructor ({ x, y, radius, isObstacle = false, density = 0.001 }: {
    x: number
    y: number
    radius: number
    isObstacle?: boolean
    density?: number
  }) {
    const body = Matter.Bodies.circle(x, y, radius)
    super({ body, isObstacle, density })
    this.radius = radius
    CircleFeature.circleFeatures.set(this.body.id, this)
  }

  destroy (): void {
    super.destroy()
    CircleFeature.circleFeatures.delete(this.body.id)
  }

  isVisible ({ center, viewpoints, obstacles }: {
    center: Matter.Vector
    viewpoints: Matter.Vector[]
    obstacles: Matter.Body[]
  }): boolean {
    const inRange = this.body.vertices.some(vertex => isPointInRange({
      start: center, end: vertex, xRange: VISION.width, yRange: VISION.height
    }))
    if (!inRange) return false
    const arrow = Matter.Vector.sub(this.body.position, center)
    const direction = Matter.Vector.normalise(arrow)
    const perp = Matter.Vector.perp(direction)
    const startPerp = Matter.Vector.mult(perp, this.radius)
    const leftSide = Matter.Vector.add(this.body.position, startPerp)
    const rightSide = Matter.Vector.sub(this.body.position, startPerp)
    const endpoints = [this.body.position, leftSide, rightSide]
    return endpoints.some(endpoint => isSomeStartClear({ starts: viewpoints, end: endpoint, obstacles }))
  }
}
