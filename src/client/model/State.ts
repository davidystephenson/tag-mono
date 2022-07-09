import Shape from '../../shared/Shape'
import DebugLine from '../../shared/DebugLine'

export default class State {
  shapes: Shape[] = []
  debugLines: DebugLine[] = []
  id?: string
}
