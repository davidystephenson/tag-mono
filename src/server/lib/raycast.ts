import Matter, { Vector } from 'matter-js'
import DebugLine from '../../shared/DebugLine'
import VISION from '../../shared/VISION'

export default function isClear ({ start, end, obstacles }: {
  start: Matter.Vector
  end: Matter.Vector
  obstacles: Matter.Body[]
}): boolean {
  const dist = Matter.Vector.magnitude(Matter.Vector.sub(end, start))
  if (dist === 0) return true
  const collisions = Matter.Query.ray(obstacles, start, end)
  const collide = collisions.length > 0
  if (DebugLine.RAYCAST) {
    const color = collide ? 'red' : 'green'
    void new DebugLine({ start, end, color })
  }
  return !collide
}

export function raycast ({ start, end, obstacles }: {
  start: Matter.Vector
  end: Matter.Vector
  obstacles: Matter.Body[]
}): {entryPoint: Vector, exitPoint: Vector, hitBody: Matter.Body} | false {
  const dist = Matter.Vector.magnitude(Matter.Vector.sub(end, start))
  if (dist === 0) return false
  const collisions = Matter.Query.ray(obstacles, start, end)
  const collide = collisions.length > 0
  if (!collide) {
    if (DebugLine.COLLISION) {
      void new DebugLine({ start, end, color: 'purple' })
    }
    return false
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
  if (!visibleX || !visibleY) return false
  const rayExitTime = Math.min(xExitTime, yExitTime)
  const exitArrow = Matter.Vector.mult(arrow, rayExitTime)
  const exitPoint = Matter.Vector.add(start, exitArrow)
  return { entryPoint, exitPoint, hitBody }
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
