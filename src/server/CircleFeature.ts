import Matter from 'matter-js'
import VISION from '../shared/VISION'
import Feature from './Feature'
import { getSides, isPointInRange } from './math'
import Stage from './Stage'

export default class CircleFeature extends Feature {
  constructor ({ blue = 128, density = 0.001, green = 128, isObstacle = false, radius, red = 128, stage, x, y }: {
    blue?: number
    density?: number
    green?: number
    isObstacle?: boolean
    radius: number
    red?: number
    stage: Stage
    x: number
    y: number
  }) {
    const body = Matter.Bodies.circle(x, y, radius)
    super({ body, blue, density, green, isObstacle, red, stage })
  }

  getArea (): number {
    const radius = this.getRadius()
    return Math.PI * radius * radius
  }

  getRadius (): number {
    if (this.body.circleRadius == null) throw new Error('circleRadius is not defined')
    return this.body.circleRadius
  }

  getSides (point: Matter.Vector): Matter.Vector[] {
    return getSides({
      start: this.body.position,
      end: point,
      radius: this.getRadius()
    })
  }

  isInLine ({ center, debug, radius }: {
    center: Matter.Vector
    debug?: boolean
    radius: number
  }): boolean {
    return this.stage.raycast.isCircleShown({
      debug,
      obstacles: this.stage.scenery,
      end: this.body.position,
      endRadius: this.getRadius(),
      start: center,
      startRadius: radius
    })
  }

  isInRange ({ point }: {
    point: Matter.Vector
  }): boolean {
    const arrow = Matter.Vector.sub(point, this.body.position)
    const direction = Matter.Vector.normalise(arrow)
    const magnified = Matter.Vector.mult(direction, this.getRadius())
    const closest = Matter.Vector.add(this.body.position, magnified)
    const inRange = isPointInRange({
      start: point, end: closest, xRange: VISION.width, yRange: VISION.height
    })
    return inRange
  }

  isVisible ({ center, debug, radius }: {
    center: Matter.Vector
    debug?: boolean
    radius: number
  }): boolean {
    const inRange = this.isInRange({ point: center })
    if (!inRange) return false
    return this.stage.raycast.isCircleShown({
      debug,
      obstacles: this.stage.scenery,
      end: this.body.position,
      endRadius: this.getRadius(),
      start: center,
      startRadius: radius
    })
  }
}
