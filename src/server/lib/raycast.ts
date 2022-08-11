import Matter, { Vector } from 'matter-js'
import DebugLine from '../../shared/DebugLine'

export default function isClear ({ start, end, obstacles }: {
  start: Matter.Vector
  end: Matter.Vector
  obstacles: Matter.Body[]
}): boolean {
  const dist = Matter.Vector.magnitude(Matter.Vector.sub(end, start))
  if (dist === 0) return true
  const collisions = Matter.Query.ray(obstacles, start, end)
  const collide = collisions.length > 0
  if (DebugLine.raycast) {
    const color = collide ? 'red' : 'green'
    void new DebugLine({ start, end, color })
  }
  return !collide
}

export function raycast ({ start, end, obstacles }: {
  start: Matter.Vector
  end: Matter.Vector
  obstacles: Matter.Body[]
}): {hitPoint: Vector, hitBody: Matter.Body} | false {
  const dist = Matter.Vector.magnitude(Matter.Vector.sub(end, start))
  if (dist === 0) return false
  const collisions = Matter.Query.ray(obstacles, start, end)
  const collide = collisions.length > 0
  if (!collide) return false
  const hitBody = collisions[0].bodyA
  const arrow = Matter.Vector.sub(end, start)
  const xTime1 = (hitBody.bounds.min.x - start.x) * (1.0 / arrow.x)
  const xTime2 = (hitBody.bounds.max.x - start.x) * (1.0 / arrow.x)
  const xTime = Math.min(xTime1, xTime2)
  const yTime1 = (hitBody.bounds.min.y - start.y) * (1.0 / arrow.y)
  const yTime2 = (hitBody.bounds.max.y - start.y) * (1.0 / arrow.y)
  const yTime = Math.min(yTime1, yTime2)
  const rayTime = Math.max(xTime, yTime)
  const hitArrow = Matter.Vector.mult(arrow, rayTime)
  const hitPoint = Matter.Vector.add(start, hitArrow)
  if (DebugLine.raycast) {
    void new DebugLine({ start, end: hitPoint, color: 'blue' })
  }
  return { hitPoint, hitBody }
}

export function someRaycast ({ casts, obstacles }: {
  casts: Matter.Vector[][]
  obstacles: Matter.Body[]
}): boolean {
  const open = casts.some(cast => isClear({
    start: cast[0],
    end: cast[1],
    obstacles
  }))

  return open
}

export function someToPoint ({ starts, end, obstacles }: {
  starts: Matter.Vector[]
  end: Matter.Vector
  obstacles: Matter.Body[]
}): boolean {
  const casts = starts.map(start => [start, end])

  return someRaycast({ casts, obstacles })
}
