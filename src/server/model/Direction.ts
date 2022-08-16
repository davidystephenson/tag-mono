import Matter from 'matter-js'
import Controls from '../../shared/controls'
import DebugLine from '../../shared/DebugLine'
import { getRadiansControls } from '../lib/radians'

export default class Direction {
  start: Matter.Vector
  end: Matter.Vector
  radians: number

  constructor ({ start, end, debugColor }: {
    start: Matter.Vector
    end: Matter.Vector
    debugColor?: string
  }) {
    this.start = start
    this.end = end
    this.radians = Matter.Vector.angle(start, end)

    if (debugColor != null) {
      // void new DebugLine({ start: this.start, end: this.end, color: debugColor })
    }
  }

  getControls (): Partial<Controls> {
    return getRadiansControls(this.radians)
  }
}
