import Matter from 'matter-js'
import VISION from '../shared/VISION'

export function boxToTriangle ({ box, radius, scale, sign }: {
  box: {
    center: Matter.Vector
    width: number
    height: number
  }
  radius: number
  scale: number
  sign: number
}): Matter.Vector[] {
  console.log('boxToTriangle')
  const scaleHeight = box.height * scale
  const height = scaleHeight > radius * 2 ? scaleHeight : box.height
  const scaledWidth = box.width * scale
  const width = scaledWidth > radius * 2 ? scaledWidth : box.width
  const halfHeight = 0.5 * height
  const halfWidth = 0.5 * width
  const topRight = { x: halfWidth, y: -halfHeight }
  const botRight = { x: halfWidth, y: halfHeight }
  const topLeft = { x: -halfWidth, y: -halfHeight }
  const botLeft = { x: -halfWidth, y: halfHeight }
  const weight = 0.5
  console.log('sign', sign)
  if (sign > 0) {
    console.log('point left')
    const point = { x: halfWidth, y: weight * halfHeight - (1 - weight) * halfHeight }
    return [botLeft, topLeft, point]
  }
  console.log('point right')
  const point = { x: -halfWidth, y: weight * halfHeight - (1 - weight) * halfHeight }
  return [botRight, topRight, point]
}

export function getAngle (from: Matter.Vector, to: Matter.Vector): number {
  const angle = (Matter.Vector.angle(from, to) / Math.PI + 1) / 2

  return angle
}

export function getAngleDifference (a: number, b: number): number {
  // 1) Take |𝐴−𝐵|.
  const difference = a - b
  const absoluteDifference = Math.abs(difference)
  // 2) If |𝐴−𝐵|≤180 you are done. That's your answer.
  if (absoluteDifference <= 0.5) {
    return absoluteDifference
  }
  // 3) If |𝐴−𝐵|>180, take 360−|𝐴−𝐵|. You are done.
  return 1 - absoluteDifference
}

export function getDistance (a: Matter.Vector, b: Matter.Vector): number {
  const vector = Matter.Vector.sub(b, a)
  return Matter.Vector.magnitude(vector)
}

export function getPerpendicular ({ start, end, radius }: {
  start: Matter.Vector
  end: Matter.Vector
  radius: number
}): Matter.Vector {
  const arrow = Matter.Vector.sub(end, start)
  const direction = Matter.Vector.normalise(arrow)
  const perpendicularDirection = Matter.Vector.perp(direction)
  const perpendicularVector = Matter.Vector.mult(perpendicularDirection, radius)
  return perpendicularVector
}

export function getPerpendicularSides ({ point, perpendicular, reverse }: {
  point: Matter.Vector
  perpendicular: Matter.Vector
  reverse?: boolean
}): [Matter.Vector, Matter.Vector] {
  const leftSide = Matter.Vector.add(point, perpendicular)
  const rightSide = Matter.Vector.sub(point, perpendicular)
  if (reverse === true) return [rightSide, leftSide]
  return [leftSide, rightSide]
}

export function getRandom ({ minimum = 0, maximum = 1 }: {
  minimum: number
  maximum: number
}): number {
  const random = Math.random()
  const range = maximum - minimum
  const scalar = random * range
  const value = scalar + minimum
  return value
}

export function getRandomRectangleSize ({ minimumWidth: widthMinimum, maximumWidth: widthMaximum, minimumHeight: heightMinimum, maximumHeight: heightMaximum }: {
  minimumWidth: number
  maximumWidth: number
  minimumHeight: number
  maximumHeight: number
}): { width: number, height: number } {
  const width = getRandom({ minimum: widthMinimum, maximum: widthMaximum })
  const height = getRandom({ minimum: heightMinimum, maximum: heightMaximum })
  return { width, height }
}

export function getRandomSquareSize ({ minimum, maximum }: {
  minimum: number
  maximum: number
}): { width: number, height: number } {
  const size = getRandom({ minimum, maximum })
  return { width: size, height: size }
}

export function getSides ({ start, end, radius }: {
  start: Matter.Vector
  end: Matter.Vector
  radius: number
}): [Matter.Vector, Matter.Vector] {
  const perpendicular = getPerpendicular({ start, end, radius })
  return getPerpendicularSides({ point: start, perpendicular })
}

export function getViewpoints ({ start, end, radius }: {
  start: Matter.Vector
  end: Matter.Vector
  radius: number
}): Matter.Vector[] {
  const sides = getSides({ start, end, radius })
  return [start, ...sides]
}

export default function isInRange ({ start, end, range }: {
  start: number
  end: number
  range: number
}): boolean {
  const difference = end - start
  const absolute = Math.abs(difference)

  return absolute < range
}

export function isPointInRange ({ start, end, xRange, yRange }: {
  start: Matter.Vector
  end: Matter.Vector
  xRange: number
  yRange: number
}): boolean {
  const xInRange = isInRange({ start: start.x, end: end.x, range: xRange })
  const yInRange = isInRange({ start: start.y, end: end.y, range: yRange })

  return xInRange && yInRange
}

export function isPointInVisionRange ({ start, end }: {
  start: Matter.Vector
  end: Matter.Vector
}): boolean {
  return isPointInRange({
    start, end, xRange: VISION.width, yRange: VISION.height
  })
}

export function project (a: Matter.Vector, b: Matter.Vector): Matter.Vector {
  const dotBB = Matter.Vector.dot(b, b)
  if (dotBB === 0) return { x: 0, y: 0 }
  const dotAB = Matter.Vector.dot(a, b)
  const scale = dotAB / dotBB
  return Matter.Vector.mult(b, scale)
}

export function whichMax <Element> (array: Element[], numbers: number[]): Element {
  if (array.length === 0) {
    throw new Error('Empty array')
  }
  if (array.length !== numbers.length) {
    throw new Error('Array and numbers length mismatch')
  }
  const minimum = Math.max(...numbers)
  const index = numbers.indexOf(minimum)
  if (array.length <= index) {
    throw new Error(`Invalid index: ${index}`)
  }
  const element = array[index]

  return element
}

export function whichMin <Element> (array: Element[], numbers: number[]): Element {
  if (array.length === 0) {
    throw new Error('Empty array')
  }
  if (array.length !== numbers.length) {
    throw new Error('Array and numbers length mismatch')
  }
  const minimum = Math.min(...numbers)
  const index = numbers.indexOf(minimum)
  if (array.length <= index) {
    throw new Error(`Invalid index: ${index}`)
  }
  const element = array[index]

  return element
}

export function samePoint ({ a, b }: { a?: Matter.Vector, b?: Matter.Vector }): boolean {
  return a?.x === b?.x && a?.y === b?.y
}
