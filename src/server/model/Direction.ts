import Matter from 'matter-js'
import Controls, { getRadiansControls } from '../../shared/controls'
import DebugLine from '../../shared/DebugLine'

export default class Direction {
  start: Matter.Vector
  end: Matter.Vector
  startVelocity: Matter.Vector
  endVelocity: Matter.Vector

  vector: Matter.Vector
  distance: number
  unitVector: Matter.Vector
  radians: number

  constructor ({ start, end, startVelocity = { x: 0, y: 0 }, endVelocity = { x: 0, y: 0 }, debugColor }: {
    start: Matter.Vector
    end: Matter.Vector
    startVelocity?: Matter.Vector
    endVelocity?: Matter.Vector
    debugColor?: string
  }) {
    this.start = start
    this.end = end
    this.startVelocity = startVelocity
    this.endVelocity = endVelocity
    this.vector = Matter.Vector.sub(end, start)
    this.distance = Matter.Vector.magnitude(this.vector)
    const towardsIt = Matter.Vector.sub(start, end)
    const moveTowards = Matter.Vector.dot(endVelocity, towardsIt)
    const lookAhead = moveTowards > 0 ? 0 : 2
    const futureTime = this.distance * lookAhead
    const futureEnd = Matter.Vector.add(end, Matter.Vector.mult(endVelocity, futureTime))
    const futureVector = Matter.Vector.sub(futureEnd, start)
    this.unitVector = Matter.Vector.normalise(futureVector)
    const targetRelativeVelocity = Matter.Vector.mult(this.unitVector, 4)
    const targetVelocity = Matter.Vector.add(endVelocity, targetRelativeVelocity)
    const targetAcceleration = Matter.Vector.sub(targetVelocity, this.startVelocity)
    const zero: Matter.Vector = { x: 0, y: 0 }
    this.radians = Matter.Vector.angle(zero, targetAcceleration)

    if (debugColor != null) {
      void new DebugLine({ start: this.start, end: this.end, color: debugColor })
    }
  }

  getControls (): Partial<Controls> {
    return getRadiansControls(this.radians)
  }
}
