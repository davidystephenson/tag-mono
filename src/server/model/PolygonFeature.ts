import Matter from 'matter-js'
import VISION from '../../shared/VISION'
import { isPointInRange } from '../lib/inRange'
import { someClearPoint } from '../lib/isClear'
import Feature from './Feature'

export default class PolygonFeature extends Feature {
  static polygonFeatures = new Map<number, PolygonFeature>()
  constructor ({ body, isObstacle = true, density = 0.001 }: {
    body: Matter.Body
    isObstacle?: boolean
    density?: number
  }) {
    super({ body, isObstacle, density })
    PolygonFeature.polygonFeatures.set(this.body.id, this)
  }

  destroy (): void {
    super.destroy()
    PolygonFeature.polygonFeatures.delete(this.body.id)
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
    const otherObstacles = obstacles.filter(obstacle => this.body.id !== obstacle.id)
    return this.body.vertices.some(vertex => someClearPoint({ starts: viewpoints, end: vertex, obstacles: otherObstacles }))
  }
}
