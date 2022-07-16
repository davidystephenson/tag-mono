import Shape from '../../shared/Shape'
import DebugLine from '../../shared/DebugLine'

export default class State {
  shapes = new Map<number, Shape>()
  debugLines: DebugLine[] = []
  id?: string
  torsoId?: number
}
