import Matter from 'matter-js'
import DebugLine from '../../shared/DebugLine'

export default function raycast ({ start, end, obstacles }: {
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

export function someRaycast ({ casts, obstacles }: {
  casts: Matter.Vector[][]
  obstacles: Matter.Body[]
}): boolean {
  const open = casts.some(cast => raycast({
    start: cast[0],
    end: cast[1],
    obstacles
  }))

  return open
}
