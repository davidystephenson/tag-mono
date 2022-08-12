import Shape from '../../shared/Shape'
import DebugLine from '../../shared/DebugLine'
import DebugCircle from '../../shared/DebugCircle'

export default class State {
  shapes = new Map<number, Shape>()
  debugLines: DebugLine[] = []
  debugCircles: DebugCircle[] = []
  id?: string
  torsoId?: number
}
