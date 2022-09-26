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
    return this.body.vertices.some(vertex => {
      const inRange = isPointInVisionRange({ start: center, end: vertex })
      if (!inRange) return false
      return isSomeStartClear({ starts: viewpoints, end: vertex, obstacles: otherBodies, debug: true })
    })
  }

  isVisible ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    const viewpoints = getViewpoints({ start: center, end: this.body.position, radius })
    const otherScenery = Feature.scenery.filter(obstacle => this.body.id !== obstacle.id)
    const ends = [...this.body.vertices, this.body.position]
    return ends.some(vertex => {
      const inRange = isPointInVisionRange({ start: center, end: vertex })
      if (!inRange) return false
      return isSomeStartClear({ starts: viewpoints, end: vertex, obstacles: otherScenery })
    })
  }
}
