import Matter from 'matter-js'

export function vectorToPoint (vector: Matter.Vector): Matter.Vector {
  return { x: vector.x, y: vector.y }
}

export function getDistance (a: Matter.Vector, b: Matter.Vector): number {
  const vector = Matter.Vector.sub(b, a)
  return Matter.Vector.magnitude(vector)
}
