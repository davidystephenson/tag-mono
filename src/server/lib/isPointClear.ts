import Matter from 'matter-js'
import DebugLine from '../../shared/DebugLine'

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

export function someCastIsClear ({ casts, obstacles, debug }: {
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

export function everyCastIsClear ({ casts, obstacles, debug }: {
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

export function someClearPoint ({ starts, end, obstacles }: {
  starts: Matter.Vector[]
  end: Matter.Vector
  obstacles: Matter.Body[]
}): boolean {
  return casterPointClear({ starts, end, obstacles, caster: someCastIsClear })
}

export function everyClearPoint ({ starts, end, obstacles, debug }: {
  starts: Matter.Vector[]
  end: Matter.Vector
  obstacles: Matter.Body[]
  debug?: boolean
}): boolean {
  return casterPointClear({ starts, end, obstacles, caster: everyCastIsClear, debug })
}
