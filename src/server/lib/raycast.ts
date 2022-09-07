import Matter from 'matter-js'
import DebugLine from '../../shared/DebugLine'
import VISION from '../../shared/VISION'
import { DEBUG } from './debug'
import { getPerpendicular, getPerpendicularSides } from './math'

export default function raycast ({ start, end, obstacles }: {
  start: Matter.Vector
  end: Matter.Vector
  obstacles: Matter.Body[]
}): {entryPoint: Matter.Vector, exitPoint?: Matter.Vector, hitBody?: Matter.Body} {
  const dist = Matter.Vector.magnitude(Matter.Vector.sub(end, start))
  if (dist === 0) return { entryPoint: end }
  const collisions = Matter.Query.ray(obstacles, start, end)
  const collide = collisions.length > 0
  if (!collide) {
    if (DEBUG.COLLISON) {
      void new DebugLine({ start, end, color: 'purple' })
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
  const xTime1 = (hitBody.bounds.min.x - start.x) * (1.0 / arrow.x)
  const xTime2 = (hitBody.bounds.max.x - start.x) * (1.0 / arrow.x)
  const xEntryTime = Math.min(xTime1, xTime2)
  const xExitTime = Math.max(xTime1, xTime2)
  const yTime1 = (hitBody.bounds.min.y - start.y) * (1.0 / arrow.y)
  const yTime2 = (hitBody.bounds.max.y - start.y) * (1.0 / arrow.y)
  const yEntryTime = Math.min(yTime1, yTime2)
  const yExitTime = Math.max(yTime1, yTime2)
  const rayEntryTime = Math.max(xEntryTime, yEntryTime)
  const entryArrow = Matter.Vector.mult(arrow, rayEntryTime)
  const direction = Matter.Vector.normalise(arrow)
  const away = Matter.Vector.mult(direction, -15)
  const entryPoint = Matter.Vector.add(Matter.Vector.add(start, entryArrow), away)
  const visibleX = start.x - VISION.width < entryPoint.x && entryPoint.x < start.x + VISION.width
  const visibleY = start.y - VISION.height < entryPoint.y && entryPoint.y < start.y + VISION.height
  if (!visibleX || !visibleY) return { entryPoint }
  const rayExitTime = Math.min(xExitTime, yExitTime)
  const exitArrow = Matter.Vector.mult(arrow, rayExitTime)
  const exitPoint = Matter.Vector.add(start, exitArrow)
  return { entryPoint, exitPoint, hitBody }
}

export function isPointClear ({ start, end, obstacles, debug }: {
  start: Matter.Vector
  end: Matter.Vector
  obstacles: Matter.Body[]
  debug?: boolean
}): boolean {
  const dist = Matter.Vector.magnitude(Matter.Vector.sub(end, start))
  if (dist === 0) return true
  const collisions = Matter.Query.ray(obstacles, start, end)
  const collide = collisions.length > 0
  if (debug === true || DEBUG.IS_CLEAR) {
    const color = collide ? 'red' : 'green'
    void new DebugLine({ start, end, color })
  }
  return !collide
}

export function isSomeCastClear ({ casts, obstacles, debug }: {
  casts: Matter.Vector[][]
  obstacles: Matter.Body[]
  debug?: boolean
}): boolean {
  const open = casts.some(cast => isPointClear({
    start: cast[0],
    end: cast[1],
    obstacles,
    debug
  }))

  return open
}

export function isEveryCastClear ({ casts, obstacles, debug }: {
  casts: Matter.Vector[][]
  obstacles: Matter.Body[]
  debug?: boolean
}): boolean {
  const open = casts.every(cast => isPointClear({
    start: cast[0],
    end: cast[1],
    obstacles,
    debug
  }))

  return open
}

export function casterPointClear ({ starts, end, obstacles, caster, debug }: {
  starts: Matter.Vector[]
  end: Matter.Vector
  obstacles: Matter.Body[]
  caster: ({ casts, obstacles, debug }: { casts: Matter.Vector[][], obstacles: Matter.Body[], debug?: boolean }) => boolean
  debug?: boolean
}): boolean {
  const casts = starts.map(start => [start, end])

  return caster({ casts, obstacles, debug })
}

export function isSomeStartClear ({ starts, end, obstacles }: {
  starts: Matter.Vector[]
  end: Matter.Vector
  obstacles: Matter.Body[]
}): boolean {
  return casterPointClear({ starts, end, obstacles, caster: isSomeCastClear })
}

export function isEveryStartClear ({ starts, end, obstacles, debug }: {
  starts: Matter.Vector[]
  end: Matter.Vector
  obstacles: Matter.Body[]
  debug?: boolean
}): boolean {
  return casterPointClear({ starts, end, obstacles, caster: isEveryCastClear, debug })
}

export function getSideCasts ({ start, end, radius }: {
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

export function getCircleCasts ({ start, end, startRadius, endRadius }: {
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
  const endPerpendicular = getPerpendicular({
    start, end, radius: endRadius - 1
  })
  const [leftEnd, rightEnd] = getPerpendicularSides({
    point: end, perpendicular: endPerpendicular
  })
  const left = [leftStart, leftEnd]
  const right = [rightStart, rightEnd]
  const casts = [left, right]

  return casts
}

export function isPointOpen ({
  start, end, radius, debug, obstacles
}: {
  start: Matter.Vector
  end: Matter.Vector
  radius: number
  debug?: boolean
  obstacles: Matter.Body[]
}): boolean {
  const casts = getCircleCasts({
    start, end, startRadius: radius, endRadius: radius
  })

  return isEveryCastClear({ casts, obstacles, debug })
}

export function isPointShown ({ debug, end, obstacles, radius, start }: {
  debug?: boolean
  end: Matter.Vector
  obstacles: Matter.Body[]
  radius: number
  start: Matter.Vector
}): boolean {
  const sideCasts = getSideCasts({ start, end, radius })
  const center = [start, end]
  const casts = [center, ...sideCasts]

  return isSomeCastClear({ casts, obstacles, debug })
}

export function isCircleShown ({
  start, end, startRadius, endRadius, debug, obstacles
}: {
  start: Matter.Vector
  end: Matter.Vector
  startRadius: number
  endRadius: number
  debug?: boolean
  obstacles: Matter.Body[]
}): boolean {
  const sideCasts = getCircleCasts({
    start, end, startRadius, endRadius
  })
  const center = [start, end]
  const casts = [center, ...sideCasts]

  return isSomeCastClear({ casts, obstacles, debug })
}
