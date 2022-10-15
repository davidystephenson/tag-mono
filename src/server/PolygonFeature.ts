import Matter from 'matter-js'
import Feature from './Feature'
import { isPointInVisionRange, getViewpoints } from './math'

export default class PolygonFeature extends Feature {
  isInRange ({ point }: {
    point: Matter.Vector
  }): boolean {
    const ends = [...this.body.vertices, this.body.position]
    return ends.some(vertex => {
      const inRange = isPointInVisionRange({ start: point, end: vertex })
      return inRange
    })
  }

  isVisible ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    const viewpoints = getViewpoints({ start: center, end: this.body.position, radius })
    const otherScenery = this.stage.scenery.filter(obstacle => this.body.id !== obstacle.id)
    const ends = [...this.body.vertices, this.body.position]
    return ends.some(vertex => {
      const inRange = isPointInVisionRange({ start: center, end: vertex })
      if (!inRange) return false
      return this.stage.raycast.isSomeStartClear({
        starts: viewpoints,
        end: vertex,
        obstacles: otherScenery
      })
    })
  }
}
