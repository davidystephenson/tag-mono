import Matter from 'matter-js'
import Controls, { getRadiansControls } from '../shared/controls'
import Stage from './Stage'

export default class Direction {
  radians: number
  constructor ({
    color,
    end,
    endVelocity = { x: 0, y: 0 },
    stage,
    start,
    startVelocity = { x: 0, y: 0 }
  }: {
    color?: string
    end: Matter.Vector
    endVelocity?: Matter.Vector
    stage: Stage
    start: Matter.Vector
    startVelocity?: Matter.Vector
  }) {
    const vector = Matter.Vector.sub(end, start)
    const distance = Matter.Vector.magnitude(vector)
    const towardsStart = Matter.Vector.sub(start, end)
    const moveTowards = Matter.Vector.dot(endVelocity, towardsStart)
    const lookAhead = moveTowards > 0 ? 0 : 2
    const futureTime = distance * lookAhead
    const futureEnd = Matter.Vector.add(end, Matter.Vector.mult(endVelocity, futureTime))
    const futureVector = Matter.Vector.sub(futureEnd, start)
    const unitVector = Matter.Vector.normalise(futureVector)
    const targetRelativeVelocity = Matter.Vector.mult(unitVector, 4)
    const targetVelocity = Matter.Vector.add(endVelocity, targetRelativeVelocity)
    const targetAcceleration = Matter.Vector.sub(targetVelocity, startVelocity)
    const zero: Matter.Vector = { x: 0, y: 0 }
    const dotProduct = Matter.Vector.dot(towardsStart, targetAcceleration)
    if (dotProduct <= 0) this.radians = Matter.Vector.angle(zero, targetAcceleration)
    else this.radians = Matter.Vector.angle(zero, towardsStart)

    if (color != null) {
      stage.line({ end, color, start })
    }
  }

  getControls (): Partial<Controls> {
    return getRadiansControls(this.radians)
  }
}
