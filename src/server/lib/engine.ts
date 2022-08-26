import Matter from 'matter-js'

export const engine = Matter.Engine.create()
engine.gravity = { x: 0, y: 0, scale: 1 }
export const runner = Matter.Runner.create()

export function vectorToPoint (vector: Matter.Vector): Matter.Vector {
  return { x: vector.x, y: vector.y }
}

export function getDistance (a: Matter.Vector, b: Matter.Vector): number {
  const vector = Matter.Vector.sub(b, a)
  return Matter.Vector.magnitude(vector)
}

export const DEBUG_STEP_TIME = true
export const DEBUG_STEP_TIME_LIMIT = 35
