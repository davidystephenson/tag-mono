import Shape from '../../shared/Shape'
import DebugLine from '../../shared/DebugLine'
import DebugCircle from '../../shared/DebugCircle'
import DebugLabel from '../../shared/DebugLabel'

export default class State {
  shapes = new Map<number, Shape>()
  debugLines: DebugLine[] = []
  debugCircles: DebugCircle[] = []
  debugLabels: DebugLabel[] = []
  id?: string
  torsoId?: number
}
