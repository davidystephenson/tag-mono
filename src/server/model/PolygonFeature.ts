import Matter from 'matter-js'
import VISION from '../../shared/VISION'
import { isPointInRange } from '../lib/inRange'
import { someClearPoint } from '../lib/isClear'
import Feature from './Feature'

export default class PolygonFeature extends Feature {
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
