import Matter from 'matter-js'
import VISION from '../shared/VISION'
import { getPerpendicular, getPerpendicularSides } from './math'
import Stage from './Stage'

export default class Raycast {
  stage: Stage
  stepRayCount = 0
  stepClears = 0
  stepRaycasts = 0
  rayCountTotal = 0
  constructor ({ stage }: { stage: Stage }) {
    this.stage = stage
  }

  raycast ({ end, obstacles, start }: {
    end: Matter.Vector
    obstacles: Matter.Body[]
    start: Matter.Vector
  }): Matter.ICollision[] {
    this.stepRayCount = this.stepRayCount + 1
    return Matter.Query.ray(obstacles, start, end)
  }

  getHit ({ start, end, obstacles }: {
    start: Matter.Vector
    end: Matter.Vector
    obstacles: Matter.Body[]
  }): { entryPoint: Matter.Vector, exitPoint?: Matter.Vector, hitBody?: Matter.Body } {
    const dist = Matter.Vector.magnitude(Matter.Vector.sub(end, start))
    if (dist === 0) {
      return { entryPoint: end }
    }
    const collisions = this.raycast({ end, start, obstacles })
    this.stepRaycasts = this.stepRaycasts + 1
    const collide = collisions.length > 0
    if (!collide) {
      if (this.stage.debugCollision) {
        this.stage.line({ color: 'purple', end, start })
      }
      return { entryPoint: end }
    }
    const distances = collisions.map(collision => {
      const position = collision.bodyA.position
      const vector = Matter.Vector.sub(position, start)
      return Matter.Vector.magnitude(vector)
    })
    const collision = collisions[distances.indexOf(Math.min(...distances))]
    const hitBody = collision.bodyA
    const arrow = Matter.Vector.sub(end, start)
    const xTime1 = arrow.x === 0 ? 0 : (hitBody.bounds.min.x - start.x) * (1.0 / arrow.x)
    const xTime2 = arrow.x === 0 ? 0 : (hitBody.bounds.max.x - start.x) * (1.0 / arrow.x)
    const xEntryTime = Math.min(xTime1, xTime2)
    const xExitTime = Math.max(xTime1, xTime2)
    const yTime1 = arrow.y === 0 ? 0 : (hitBody.bounds.min.y - start.y) * (1.0 / arrow.y)
    const yTime2 = arrow.y === 0 ? 0 : (hitBody.bounds.max.y - start.y) * (1.0 / arrow.y)
    const yEntryTime = Math.min(yTime1, yTime2)
    const yExitTime = Math.max(yTime1, yTime2)
    const rayEntryTime = Math.max(xEntryTime, yEntryTime)
    const entryArrow = Matter.Vector.mult(arrow, rayEntryTime)
    const entryPoint = Matter.Vector.add(start, entryArrow)
    const visibleX = start.x - VISION.width < entryPoint.x && entryPoint.x < start.x + VISION.width
    const visibleY = start.y - VISION.height < entryPoint.y && entryPoint.y < start.y + VISION.height
    if (!visibleX || !visibleY) {
      return { entryPoint }
    }
    const rayExitTime = Math.min(xExitTime, yExitTime)
    const exitArrow = Matter.Vector.mult(arrow, rayExitTime)
    const exitPoint = Matter.Vector.add(start, exitArrow)
    return { entryPoint, exitPoint, hitBody }
  }

  isPointClear ({ start, end, obstacles, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    obstacles: Matter.Body[]
    debug?: boolean
  }): boolean {
    const dist = Matter.Vector.magnitude(Matter.Vector.sub(end, start))
    if (dist === 0) return true
    const collisions = this.raycast({ end, start, obstacles })
    this.stepClears = this.stepClears + 1
    const collide = collisions.length > 0
    if (debug === true || this.stage.debugIsClear) {
      if (!collide) {
        this.stage.line({ color: 'green', end, start })
      } else {
        this.stage.line({ color: 'rgba(255, 0, 0, 0.5)', end, start })
      }
    }
    return !collide
  }

  isSomeCastClear = ({ casts, obstacles, debug }: {
    casts: Matter.Vector[][]
    obstacles: Matter.Body[]
    debug?: boolean
  }): boolean => {
    const open = casts.some(cast => this.isPointClear({
      start: cast[0],
      end: cast[1],
      obstacles,
      debug
    }))

    return open
  }

  isEveryCastClear ({ casts, obstacles, debug }: {
    casts: Matter.Vector[][]
    obstacles: Matter.Body[]
    debug?: boolean
  }): boolean {
    const open = casts.every(cast => this.isPointClear({
      start: cast[0],
      end: cast[1],
      obstacles,
      debug
    }))

    return open
  }

  casterPointClear ({ starts, end, obstacles, caster, debug }: {
    starts: Matter.Vector[]
    end: Matter.Vector
    obstacles: Matter.Body[]
    caster: ({ casts, obstacles, debug }: { casts: Matter.Vector[][], obstacles: Matter.Body[], debug?: boolean }) => boolean
    debug?: boolean
  }): boolean {
    const casts = starts.map(start => [start, end])

    return caster({ casts, obstacles, debug })
  }

  isSomeStartClear ({ starts, end, obstacles, debug }: {
    starts: Matter.Vector[]
    end: Matter.Vector
    obstacles: Matter.Body[]
    debug?: boolean
  }): boolean {
    return this.casterPointClear({ starts, end, obstacles, caster: this.isSomeCastClear, debug })
  }

  isEveryStartClear ({ starts, end, obstacles, debug }: {
    starts: Matter.Vector[]
    end: Matter.Vector
    obstacles: Matter.Body[]
    debug?: boolean
  }): boolean {
    return this.casterPointClear({ starts, end, obstacles, caster: this.isEveryCastClear, debug })
  }

  getSideCasts ({ start, end, radius }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
  }): Matter.Vector[][] {
    const startPerpendicular = getPerpendicular({
      start, end, radius: radius - 1
    })
    const [leftStart, rightStart] = getPerpendicularSides({
      point: start, perpendicular: startPerpendicular
    })
    const left = [leftStart, end]
    const right = [rightStart, end]
    const casts = [left, right]

    return casts
  }

  getCircleCasts ({ start, end, startRadius, endRadius }: {
    start: Matter.Vector
    end: Matter.Vector
    startRadius: number
    endRadius: number
  }): Matter.Vector[][] {
    const startPerpendicular = getPerpendicular({
      start, end, radius: startRadius - 1
    })
    const [leftStart, rightStart] = getPerpendicularSides({
      point: start, perpendicular: startPerpendicular
    })
    const endPerpendicular = startRadius === endRadius
      ? startPerpendicular
      : getPerpendicular({
        start, end, radius: endRadius - 1
      })
    const [leftEnd, rightEnd] = getPerpendicularSides({
      point: end, perpendicular: endPerpendicular
    })
    const center = [start, end]
    const left = [leftStart, leftEnd]
    const right = [rightStart, rightEnd]
    const casts = [center, left, right]

    return casts
  }

  isPointOpen ({
    start, end, radius, debug, obstacles
  }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
    debug?: boolean
    obstacles: Matter.Body[]
  }): boolean {
    const casts = this.getCircleCasts({
      start, end, startRadius: radius, endRadius: radius
    })

    return this.isEveryCastClear({ casts, obstacles, debug })
  }

  isPointShown ({ debug, end, obstacles, radius, start }: {
    debug?: boolean
    end: Matter.Vector
    obstacles: Matter.Body[]
    radius: number
    start: Matter.Vector
  }): boolean {
    const casts = this.getCircleCasts({ start, end, startRadius: radius, endRadius: radius })

    return this.isSomeCastClear({ casts, obstacles, debug })
  }

  isCircleShown ({
    start, end, startRadius, endRadius, debug, obstacles
  }: {
    start: Matter.Vector
    end: Matter.Vector
    startRadius: number
    endRadius: number
    debug?: boolean
    obstacles: Matter.Body[]
  }): boolean {
    const casts = this.getCircleCasts({
      start, end, startRadius, endRadius
    })

    return this.isSomeCastClear({ casts, obstacles, debug })
  }
}
