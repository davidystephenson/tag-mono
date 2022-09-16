import Matter from 'matter-js'
import { isPointInVisionRange } from '../lib/inRange'
import { getViewpoints } from '../lib/math'
import { isSomeStartClear } from '../lib/raycast'
import Feature from './Feature'

export default class PolygonFeature extends Feature {
  isClear ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    const viewpoints = getViewpoints({ start: center, end: this.body.position, radius })
    const otherBodies = Feature.bodies.filter(obstacle => this.body.id !== obstacle.id)
    return this.body.vertices.some(vertex => isSomeStartClear({ starts: viewpoints, end: vertex, obstacles: otherBodies }))
  }

  isVisible ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    return true
    //     const inRange = this
    //       .body
    //       .vertices
    //       .some(vertex => isPointInVisionRange({
    //         start: center, end: vertex
    //       }))
    //     if (!inRange) return false
    //     const viewpoints = getViewpoints({ start: center, end: this.body.position, radius })
    //     const otherObstacles = Feature.obstacles.filter(obstacle => this.body.id !== obstacle.id)
    //     return this.body.vertices.some(vertex => isSomeStartClear({ starts: viewpoints, end: vertex, obstacles: otherObstacles }))
  }
}
