import Matter from 'matter-js'

export default function raycast ({ start, end, obstacles }: {
  start: Matter.Vector
  end: Matter.Vector
  obstacles: Matter.Body[]
}): boolean {
  const collisions = Matter.Query.ray(obstacles, start, end)
  return collisions.length === 0
}
