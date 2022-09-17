import Matter from 'matter-js'

export const engine = Matter.Engine.create()
engine.gravity = { x: 0, y: 0, scale: 1 }
export const runner = Matter.Runner.create()

export const engineTimers = new Map<number, [number, () => void]>()

export function setEngineTimeout (delay: number, action: () => void): void {
  console.log('setEngineTimeout')
  const startTime = engine.timing.timestamp
  const endTime = startTime + delay
  engineTimers.set(engineTimers.size, [endTime, action])
}

export function vectorToPoint (vector: Matter.Vector): Matter.Vector {
  return { x: vector.x, y: vector.y }
}

export function getDistance (a: Matter.Vector, b: Matter.Vector): number {
  const vector = Matter.Vector.sub(b, a)
  return Matter.Vector.magnitude(vector)
}
