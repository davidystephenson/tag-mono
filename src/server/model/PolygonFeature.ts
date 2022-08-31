import Matter from 'matter-js'
import { isPointInVisionRange } from '../lib/inRange'
import { getViewpoints } from '../lib/math'
import { isSomeStartClear } from '../lib/raycast'
import Feature from './Feature'

export default class PolygonFeature extends Feature {
  isVisible ({ center, radius, obstacles }: {
    center: Matter.Vector
    radius: number
    obstacles: Matter.Body[]
  }): boolean {
    const inRange = this
      .body
      .vertices
      .some(vertex => isPointInVisionRange({
        start: center, end: vertex
      }))
    if (!inRange) return false
    const viewpoints = getViewpoints({ start: center, end: this.body.position, radius })
    const otherObstacles = obstacles.filter(obstacle => this.body.id !== obstacle.id)
    return this.body.vertices.some(vertex => isSomeStartClear({ starts: viewpoints, end: vertex, obstacles: otherObstacles }))
  }
}
