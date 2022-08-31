import Matter from 'matter-js'
import DebugLine from '../../shared/DebugLine'
import { getPerpendicular, getPerpendicularSides } from './math'

export default function isPointClear ({ start, end, obstacles, debug }: {
  start: Matter.Vector
  end: Matter.Vector
  obstacles: Matter.Body[]
  debug?: boolean
}): boolean {
  const dist = Matter.Vector.magnitude(Matter.Vector.sub(end, start))
  if (dist === 0) return true
  const collisions = Matter.Query.ray(obstacles, start, end)
  const collide = collisions.length > 0
  if (debug === true || DebugLine.IS_CLEAR) {
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

export function getSideCasts ({ start, end, startRadius, endRadius }: {
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

export function isPointReachable ({
  start, end, radius, debug, obstacles
}: {
  start: Matter.Vector
  end: Matter.Vector
  radius: number
  debug?: boolean
  obstacles: Matter.Body[]
}): boolean {
  const casts = getSideCasts({
    start, end, startRadius: radius, endRadius: radius
  })

  return isEveryCastClear({ casts, obstacles, debug })
}

export function isPointVisionClear ({
  start, end, startRadius, endRadius, debug, obstacles
}: {
  start: Matter.Vector
  end: Matter.Vector
  startRadius: number
  endRadius: number
  debug?: boolean
  obstacles: Matter.Body[]
}): boolean {
  const sideCasts = getSideCasts({
    start, end, startRadius, endRadius
  })
  const center = [start, end]
  const casts = [center, ...sideCasts]

  return isSomeCastClear({ casts, obstacles, debug })
}
